// candleExtractor.js
// Hyper-advanced candle extraction for Golden Simulator
// Requires: axisDetector.js output (pixel→price mapping + chart bounds)

export async function extractCandles(canvas, axisInfo, options = {}) {
  const {
    axisXEnd,
    axisYTop,
    axisYBottom,
    pixelToPrice,
  } = axisInfo;

  const {
    candleAreaLeftPadding = 8,
    minCandleWidth = 2,
    maxCandleWidth = 14,
    wickBrightnessThreshold = 180,
    bodyBrightnessThreshold = 120,
    noiseTolerance = 0.015,
    smoothingWindow = 3,
  } = options;

  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;

  // 1. Define chart area (right of price axis)
  const chartXStart = axisXEnd + candleAreaLeftPadding;
  const chartXEnd = width - 1;
  const chartWidth = chartXEnd - chartXStart;

  const chartYStart = axisYTop;
  const chartYEnd = axisYBottom;
  const chartHeight = chartYEnd - chartYStart;

  const img = ctx.getImageData(chartXStart, chartYStart, chartWidth, chartHeight);
  const data = img.data;

  // 2. Vertical brightness profile to detect candle columns
  const colBrightness = new Array(chartWidth).fill(0);
  const colCount = new Array(chartWidth).fill(0);

  for (let y = 0; y < chartHeight; y++) {
    for (let x = 0; x < chartWidth; x++) {
      const idx = (y * chartWidth + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a < 40) continue;

      const bright = (r + g + b) / 3;
      colBrightness[x] += bright;
      colCount[x]++;
    }
  }

  const avgBrightness = colBrightness.map((sum, i) =>
    colCount[i] > 0 ? sum / colCount[i] : 0
  );

  // 3. Smooth brightness to reduce noise
  const smoothed = smoothArray(avgBrightness, smoothingWindow);

  // 4. Detect candle columns by brightness changes
  const candleColumns = detectCandleColumns(smoothed, {
    minCandleWidth,
    maxCandleWidth,
    noiseTolerance,
  });

  // 5. For each candle column, extract wick/body geometry
  const candles = [];

  for (const col of candleColumns) {
    const { startX, endX } = col;
    const candle = extractSingleCandle({
      data,
      chartWidth,
      chartHeight,
      startX,
      endX,
      wickBrightnessThreshold,
      bodyBrightnessThreshold,
      pixelToPrice,
      chartYStart,
    });

    if (candle) candles.push(candle);
  }

  // 6. Add candle index + time ordering
  candles.sort((a, b) => a.xCenter - b.xCenter);
  candles.forEach((c, i) => (c.index = i));

  return {
    candles,
    chartBounds: {
      xStart: chartXStart,
      xEnd: chartXEnd,
      yStart: chartYStart,
      yEnd: chartYEnd,
    },
  };
}

// ---------------------------
// Candle Extraction Helpers
// ---------------------------

function smoothArray(arr, window) {
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    let sum = 0;
    let count = 0;
    for (let w = -window; w <= window; w++) {
      const idx = i + w;
      if (idx >= 0 && idx < arr.length) {
        sum += arr[idx];
        count++;
      }
    }
    out.push(sum / count);
  }
  return out;
}

function detectCandleColumns(brightness, opts) {
  const { minCandleWidth, maxCandleWidth, noiseTolerance } = opts;

  const columns = [];
  let inCandle = false;
  let start = 0;

  const threshold = computeDynamicThreshold(brightness, noiseTolerance);

  for (let x = 0; x < brightness.length; x++) {
    const isInk = brightness[x] > threshold;

    if (isInk && !inCandle) {
      inCandle = true;
      start = x;
    }

    if (!isInk && inCandle) {
      const end = x - 1;
      const width = end - start + 1;

      if (width >= minCandleWidth && width <= maxCandleWidth) {
        columns.push({ startX: start, endX: end });
      }

      inCandle = false;
    }
  }

  return columns;
}

function computeDynamicThreshold(arr, noiseTolerance) {
  const sorted = [...arr].sort((a, b) => a - b);
  const low = sorted[Math.floor(sorted.length * noiseTolerance)];
  const high = sorted[Math.floor(sorted.length * (1 - noiseTolerance))];
  return (low + high) / 2;
}

function extractSingleCandle(params) {
  const {
    data,
    chartWidth,
    chartHeight,
    startX,
    endX,
    wickBrightnessThreshold,
    bodyBrightnessThreshold,
    pixelToPrice,
    chartYStart,
  } = params;

  const width = endX - startX + 1;
  const xCenter = Math.round((startX + endX) / 2);

  let topWick = null;
  let bottomWick = null;
  let bodyTop = null;
  let bodyBottom = null;

  for (let y = 0; y < chartHeight; y++) {
    let brightSum = 0;
    let count = 0;

    for (let x = startX; x <= endX; x++) {
      const idx = (y * chartWidth + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      if (a < 40) continue;

      const bright = (r + g + b) / 3;
      brightSum += bright;
      count++;
    }

    if (count === 0) continue;

    const avg = brightSum / count;

    // Wick detection
    if (avg > wickBrightnessThreshold) {
      if (topWick === null) topWick = y;
      bottomWick = y;
    }

    // Body detection
    if (avg > bodyBrightnessThreshold) {
      if (bodyTop === null) bodyTop = y;
      bodyBottom = y;
    }
  }

  if (topWick === null || bodyTop === null) return null;

  // Convert pixel Y → price
  const high = pixelToPrice.a * (chartYStart + topWick) + pixelToPrice.b;
  const low = pixelToPrice.a * (chartYStart + bottomWick) + pixelToPrice.b;
  const open = pixelToPrice.a * (chartYStart + bodyTop) + pixelToPrice.b;
  const close = pixelToPrice.a * (chartYStart + bodyBottom) + pixelToPrice.b;

  const isBull = close > open;

  return {
    startX,
    endX,
    xCenter,
    width,
    high,
    low,
    open,
    close,
    isBull,
    wickPixels: { top: topWick, bottom: bottomWick },
    bodyPixels: { top: bodyTop, bottom: bodyBottom },
    confidence: computeCandleConfidence({ width, high, low, open, close }),
  };
}

function computeCandleConfidence(c) {
  const range = Math.abs(c.high - c.low);
  const body = Math.abs(c.open - c.close);

  if (range === 0) return 0;

  const bodyRatio = body / range;
  const widthScore = Math.min(1, c.width / 8);

  return Math.round(100 * (0.6 * bodyRatio + 0.4 * widthScore));
}
