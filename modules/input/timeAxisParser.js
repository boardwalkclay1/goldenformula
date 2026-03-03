// timeAxisParser.js
// Advanced time-axis parsing for Golden Simulator
// Requires: canvas with screenshot drawn, plus candleExtractor output.

export async function parseTimeAxis(canvas, candleData, options = {}) {
  const {
    minLabelConfidence = 40,
    ocrPaddingX = 10,
    ocrPaddingY = 6,
    maxTimeGapMultiplier = 3,
  } = options;

  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;

  const { candles, chartBounds } = candleData;
  const { xStart, xEnd, yEnd } = chartBounds;

  // 1. Extract bottom axis strip
  const axisHeight = Math.floor((height - yEnd) * 0.9);
  const axisY = yEnd + 1;
  const axisX = xStart;
  const axisWidth = xEnd - xStart;

  const axisData = ctx.getImageData(axisX, axisY, axisWidth, axisHeight);

  // 2. Detect potential time label regions by brightness
  const labelRegions = detectTimeLabelRegions(axisData, axisWidth, axisHeight);

  // 3. OCR each region to extract timestamps
  const labels = await ocrTimeLabels(labelRegions, {
    canvas,
    axisX,
    axisY,
    ocrPaddingX,
    ocrPaddingY,
    minLabelConfidence,
  });

  // 4. Parse timestamps into minutes since midnight
  const parsedLabels = labels
    .map(l => ({
      ...l,
      minutes: parseTimeToMinutes(l.text),
    }))
    .filter(l => !isNaN(l.minutes));

  if (parsedLabels.length < 2) {
    return {
      timeframe: null,
      labels: parsedLabels,
      timeIndex: buildFallbackTimeIndex(candles),
      gaps: [],
      session: null,
    };
  }

  // 5. Infer timeframe from spacing between labels
  const timeframe = inferTimeframe(parsedLabels);

  // 6. Build time index for each candle
  const timeIndex = assignTimesToCandles(candles, parsedLabels, timeframe);

  // 7. Detect gaps (missing candles)
  const gaps = detectTimeGaps(timeIndex, timeframe, maxTimeGapMultiplier);

  // 8. Detect session context
  const session = detectSession(timeIndex);

  return {
    timeframe,
    labels: parsedLabels,
    timeIndex,
    gaps,
    session,
  };
}

// ---------------------------
// Time Label Detection
// ---------------------------

function detectTimeLabelRegions(axisData, w, h) {
  const { data } = axisData;

  const brightness = new Array(w).fill(0);
  const count = new Array(w).fill(0);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a < 40) continue;

      const bright = (r + g + b) / 3;
      brightness[x] += bright;
      count[x]++;
    }
  }

  const avg = brightness.map((s, i) => (count[i] > 0 ? s / count[i] : 0));
  const threshold = computeDynamicThreshold(avg, 0.1);

  const regions = [];
  let inRegion = false;
  let start = 0;

  for (let x = 0; x < w; x++) {
    const isInk = avg[x] > threshold;

    if (isInk && !inRegion) {
      inRegion = true;
      start = x;
    }

    if (!isInk && inRegion) {
      const end = x - 1;
      if (end - start > 10) {
        regions.push({ startX: start, endX: end });
      }
      inRegion = false;
    }
  }

  return regions;
}

function computeDynamicThreshold(arr, frac) {
  const sorted = [...arr].sort((a, b) => a - b);
  const low = sorted[Math.floor(sorted.length * frac)];
  const high = sorted[Math.floor(sorted.length * (1 - frac))];
  return (low + high) / 2;
}

// ---------------------------
// OCR Time Labels
// ---------------------------

async function ocrTimeLabels(regions, params) {
  const { canvas, axisX, axisY, ocrPaddingX, ocrPaddingY, minLabelConfidence } = params;
  const ctx = canvas.getContext('2d');

  const labels = [];

  for (const r of regions) {
    const sliceX = axisX + r.startX - ocrPaddingX;
    const sliceY = axisY - ocrPaddingY;
    const sliceW = (r.endX - r.startX + 1) + 2 * ocrPaddingX;
    const sliceH = 20 + 2 * ocrPaddingY;

    const img = ctx.getImageData(sliceX, sliceY, sliceW, sliceH);

    const off = document.createElement('canvas');
    off.width = sliceW;
    off.height = sliceH;
    off.getContext('2d').putImageData(img, 0, 0);

    const dataUrl = off.toDataURL('image/png');

    try {
      const result = await Tesseract.recognize(dataUrl, 'eng', {
        tessedit_char_whitelist: '0123456789:',
      });

      const text = (result.data.text || '').trim();
      const conf = result.data.confidence ?? 0;

      if (conf >= minLabelConfidence && /\d{1,2}:\d{2}/.test(text)) {
        labels.push({
          xCenter: Math.round((r.startX + r.endX) / 2),
          text,
          confidence: conf,
        });
      }
    } catch (err) {
      console.warn('[TimeAxisParser] OCR error:', err);
    }
  }

  return labels;
}

// ---------------------------
// Time Parsing
// ---------------------------

function parseTimeToMinutes(str) {
  const match = str.match(/(\d{1,2}):(\d{2})/);
  if (!match) return NaN;

  let hour = parseInt(match[1]);
  const min = parseInt(match[2]);

  // Webull uses 12h format without AM/PM → infer from typical trading hours
  if (hour < 4) hour += 12; // treat 1–3 as 13–15
  return hour * 60 + min;
}

function inferTimeframe(labels) {
  const diffs = [];
  for (let i = 1; i < labels.length; i++) {
    diffs.push(labels[i].minutes - labels[i - 1].minutes);
  }

  const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;

  if (avg < 2) return 1;
  if (avg < 7) return 5;
  if (avg < 12) return 10;
  if (avg < 20) return 15;
  if (avg < 40) return 30;
  return 60;
}

// ---------------------------
// Assign Times to Candles
// ---------------------------

function assignTimesToCandles(candles, labels, timeframe) {
  const timeIndex = [];

  const labelMap = labels.map(l => ({
    x: l.xCenter,
    minutes: l.minutes,
  }));

  for (const c of candles) {
    const nearest = findNearestLabel(c.xCenter, labelMap);
    const offset = Math.round((c.xCenter - nearest.x) / (candles[1].xCenter - candles[0].xCenter));
    const minutes = nearest.minutes + offset * timeframe;

    timeIndex.push({
      candleIndex: c.index,
      minutes,
      xCenter: c.xCenter,
    });
  }

  return timeIndex;
}

function findNearestLabel(x, labels) {
  let best = labels[0];
  let bestDist = Math.abs(x - labels[0].x);

  for (let i = 1; i < labels.length; i++) {
    const d = Math.abs(x - labels[i].x);
    if (d < bestDist) {
      best = labels[i];
      bestDist = d;
    }
  }

  return best;
}

// ---------------------------
// Gap Detection
// ---------------------------

function detectTimeGaps(timeIndex, timeframe, multiplier) {
  const gaps = [];

  for (let i = 1; i < timeIndex.length; i++) {
    const diff = timeIndex[i].minutes - timeIndex[i - 1].minutes;
    if (diff > timeframe * multiplier) {
      gaps.push({
        from: timeIndex[i - 1].minutes,
        to: timeIndex[i].minutes,
        size: diff,
      });
    }
  }

  return gaps;
}

// ---------------------------
// Session Detection
// ---------------------------

function detectSession(timeIndex) {
  if (timeIndex.length === 0) return null;

  const first = timeIndex[0].minutes;
  const last = timeIndex[timeIndex.length - 1].minutes;

  if (first < 570) return 'pre-market'; // before 9:30
  if (last > 960) return 'after-hours'; // after 16:00

  return 'regular';
}

// ---------------------------
// Fallback Time Index
// ---------------------------

function buildFallbackTimeIndex(candles) {
  return candles.map((c, i) => ({
    candleIndex: i,
    minutes: i,
    xCenter: c.xCenter,
  }));
}
