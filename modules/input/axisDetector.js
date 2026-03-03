// axisDetector.js
// Advanced price-axis detection + pixel→price mapping for Golden Simulator
// Assumes: a chart image is already drawn onto a <canvas> element.
// Uses: global Tesseract (loaded via <script> in HTML).

/**
 * AxisDetectionResult
 * @typedef {Object} AxisDetectionResult
 * @property {number} axisXStart - Leftmost x of detected price axis region.
 * @property {number} axisXEnd   - Rightmost x of detected price axis region.
 * @property {number} axisYTop   - Top y of chart area (excluding top margin).
 * @property {number} axisYBottom- Bottom y of chart area (excluding bottom margin).
 * @property {Array<{ y: number, price: number, rawText: string, confidence: number }>} ticks
 * @property {{ a: number, b: number }} pixelToPrice - price = a * y + b (y in canvas coords).
 * @property {{ a: number, b: number }} priceToPixel - y = a * price + b
 * @property {number} r2 - Fit quality (0–1) for the linear mapping.
 */

/**
 * Detects the price axis on the left side of the chart and builds a pixel→price mapping.
 * @param {HTMLCanvasElement} canvas
 * @param {Object} [options]
 * @param {number} [options.leftScanWidth=120] - Max width (px) to scan from the left edge for the axis.
 * @param {number} [options.minAxisWidth=40]   - Minimum width (px) for a valid axis band.
 * @param {number} [options.textBandThreshold=0.12] - Fraction of non-background pixels to consider "text-heavy".
 * @param {number} [options.sampleTickCount=6] - How many horizontal slices to sample for OCR.
 * @param {number} [options.ocrPaddingX=6]     - Horizontal padding around each OCR slice.
 * @param {number} [options.ocrPaddingY=6]     - Vertical padding around each OCR slice.
 * @returns {Promise<AxisDetectionResult|null>}
 */
export async function detectPriceAxis(canvas, options = {}) {
  const {
    leftScanWidth = 120,
    minAxisWidth = 40,
    textBandThreshold = 0.12,
    sampleTickCount = 6,
    ocrPaddingX = 6,
    ocrPaddingY = 6,
  } = options;

  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;

  // 1. Extract left strip where the price axis should live.
  const scanWidth = Math.min(leftScanWidth, Math.floor(width * 0.4));
  const imageData = ctx.getImageData(0, 0, scanWidth, height);
  const data = imageData.data;

  // 2. Compute per-column "ink density" to find where text/axis lives.
  const columnInk = new Array(scanWidth).fill(0);
  const columnTotal = new Array(scanWidth).fill(0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < scanWidth; x++) {
      const idx = (y * scanWidth + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      // Treat non-transparent, non-background-ish pixels as "ink".
      // Webull often has dark background; we treat brighter pixels as ink.
      const brightness = (r + g + b) / 3;
      const isInk = a > 40 && brightness > 80; // tweakable

      if (isInk) columnInk[x]++;
      columnTotal[x]++;
    }
  }

  const columnDensity = columnInk.map((ink, x) =>
    columnTotal[x] > 0 ? ink / columnTotal[x] : 0
  );

  // 3. Find contiguous band of columns with enough "ink density" to be the axis.
  const threshold = textBandThreshold;
  let bestStart = null;
  let bestEnd = null;
  let currentStart = null;

  for (let x = 0; x < scanWidth; x++) {
    if (columnDensity[x] >= threshold) {
      if (currentStart === null) currentStart = x;
    } else {
      if (currentStart !== null) {
        const currentEnd = x - 1;
        if (
          bestStart === null ||
          currentEnd - currentStart > bestEnd - bestStart
        ) {
          bestStart = currentStart;
          bestEnd = currentEnd;
        }
        currentStart = null;
      }
    }
  }
  // Close trailing band
  if (currentStart !== null) {
    const currentEnd = scanWidth - 1;
    if (
      bestStart === null ||
      currentEnd - currentStart > bestEnd - bestStart
    ) {
      bestStart = currentStart;
      bestEnd = currentEnd;
    }
  }

  if (bestStart === null || bestEnd - bestStart < minAxisWidth) {
    console.warn('[AxisDetector] No valid axis band found.');
    return null;
  }

  const axisXStart = bestStart;
  const axisXEnd = bestEnd;

  // 4. Estimate chart vertical bounds by ignoring top/bottom UI bands.
  //    We look for the densest vertical region of "ink" inside the axis band.
  const axisWidth = axisXEnd - axisXStart + 1;
  const axisImageData = ctx.getImageData(axisXStart, 0, axisWidth, height);
  const axisData = axisImageData.data;

  const rowInk = new Array(height).fill(0);
  const rowTotal = new Array(height).fill(0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < axisWidth; x++) {
      const idx = (y * axisWidth + x) * 4;
      const r = axisData[idx];
      const g = axisData[idx + 1];
      const b = axisData[idx + 2];
      const a = axisData[idx + 3];

      const brightness = (r + g + b) / 3;
      const isInk = a > 40 && brightness > 80;

      if (isInk) rowInk[y]++;
      rowTotal[y]++;
    }
  }

  const rowDensity = rowInk.map((ink, y) =>
    rowTotal[y] > 0 ? ink / rowTotal[y] : 0
  );

  // We expect chart area to be the central band with consistent density.
  // We'll find the largest contiguous band above a small density threshold.
  const rowThreshold = 0.02; // very low; just to exclude pure UI bars
  let bestRowStart = null;
  let bestRowEnd = null;
  let currentRowStart = null;

  for (let y = 0; y < height; y++) {
    if (rowDensity[y] >= rowThreshold) {
      if (currentRowStart === null) currentRowStart = y;
    } else {
      if (currentRowStart !== null) {
        const currentRowEnd = y - 1;
        if (
          bestRowStart === null ||
          currentRowEnd - currentRowStart > bestRowEnd - bestRowStart
        ) {
          bestRowStart = currentRowStart;
          bestRowEnd = currentRowEnd;
        }
        currentRowStart = null;
      }
    }
  }
  if (currentRowStart !== null) {
    const currentRowEnd = height - 1;
    if (
      bestRowStart === null ||
      currentRowEnd - currentRowStart > bestRowEnd - bestRowStart
    ) {
      bestRowStart = currentRowStart;
      bestRowEnd = currentRowEnd;
    }
  }

  const axisYTop = bestRowStart ?? Math.floor(height * 0.08);
  const axisYBottom = bestRowEnd ?? Math.floor(height * 0.92);

  // 5. Sample horizontal slices along the axis to OCR tick labels.
  const ticks = await sampleAndOcrTicks({
    canvas,
    axisXStart,
    axisXEnd,
    axisYTop,
    axisYBottom,
    sampleTickCount,
    ocrPaddingX,
    ocrPaddingY,
  });

  if (ticks.length < 2) {
    console.warn('[AxisDetector] Not enough ticks OCR’d to build mapping.', ticks);
    return {
      axisXStart,
      axisXEnd,
      axisYTop,
      axisYBottom,
      ticks,
      pixelToPrice: { a: 0, b: 0 },
      priceToPixel: { a: 0, b: 0 },
      r2: 0,
    };
  }

  // 6. Fit linear mapping: price = a * y + b (y in canvas coordinates).
  const { a, b, r2 } = fitLinearPixelToPrice(ticks);

  const pixelToPrice = { a, b };
  const priceToPixel = {
    a: a !== 0 ? 1 / a : 0,
    b: a !== 0 ? -b / a : 0,
  };

  return {
    axisXStart,
    axisXEnd,
    axisYTop,
    axisYBottom,
    ticks,
    pixelToPrice,
    priceToPixel,
    r2,
  };
}

/**
 * Sample horizontal slices along the axis and OCR them to find numeric tick labels.
 * @param {Object} params
 * @param {HTMLCanvasElement} params.canvas
 * @param {number} params.axisXStart
 * @param {number} params.axisXEnd
 * @param {number} params.axisYTop
 * @param {number} params.axisYBottom
 * @param {number} params.sampleTickCount
 * @param {number} params.ocrPaddingX
 * @param {number} params.ocrPaddingY
 * @returns {Promise<Array<{ y: number, price: number, rawText: string, confidence: number }>>}
 */
async function sampleAndOcrTicks(params) {
  const {
    canvas,
    axisXStart,
    axisXEnd,
    axisYTop,
    axisYBottom,
    sampleTickCount,
    ocrPaddingX,
    ocrPaddingY,
  } = params;

  const ctx = canvas.getContext('2d');
  const ticks = [];

  const axisWidth = axisXEnd - axisXStart + 1;
  const chartHeight = axisYBottom - axisYTop;

  for (let i = 0; i < sampleTickCount; i++) {
    const t = i / (sampleTickCount - 1 || 1);
    const y = Math.round(axisYTop + t * chartHeight);

    const sliceX = Math.max(axisXStart - ocrPaddingX, 0);
    const sliceY = Math.max(y - ocrPaddingY, 0);
    const sliceW = axisWidth + 2 * ocrPaddingX;
    const sliceH = 2 * ocrPaddingY + 1;

    const sliceData = ctx.getImageData(sliceX, sliceY, sliceW, sliceH);

    // Create an offscreen canvas for OCR.
    const off = document.createElement('canvas');
    off.width = sliceW;
    off.height = sliceH;
    const offCtx = off.getContext('2d');
    offCtx.putImageData(sliceData, 0, 0);

    const dataUrl = off.toDataURL('image/png');

    try {
      const result = await Tesseract.recognize(dataUrl, 'eng', {
        tessedit_char_whitelist: '0123456789.,',
      });

      const rawText = (result.data.text || '').trim();
      const confidence = result.data.confidence ?? 0;

      const price = parsePriceFromText(rawText);

      if (!isNaN(price) && confidence > 40) {
        ticks.push({
          y,
          price,
          rawText,
          confidence,
        });
      }
    } catch (err) {
      console.warn('[AxisDetector] OCR error at y=', y, err);
    }
  }

  // Deduplicate by y and price proximity.
  const deduped = dedupeTicks(ticks);
  return deduped;
}

/**
 * Parse numeric price from OCR text.
 * Handles commas, stray characters, etc.
 * @param {string} text
 * @returns {number}
 */
function parsePriceFromText(text) {
  if (!text) return NaN;
  // Remove everything except digits, dot, comma.
  let cleaned = text.replace(/[^0-9.,]/g, '');
  // If both comma and dot exist, assume comma is thousands separator.
  if (cleaned.includes('.') && cleaned.includes(',')) {
    cleaned = cleaned.replace(/,/g, '');
  } else {
    // If only comma, treat as decimal.
    cleaned = cleaned.replace(',', '.');
  }
  const val = parseFloat(cleaned);
  return val;
}

/**
 * Deduplicate ticks by merging close y/price values.
 * @param {Array<{ y: number, price: number, rawText: string, confidence: number }>} ticks
 */
function dedupeTicks(ticks) {
  if (ticks.length === 0) return [];

  // Sort by y (top to bottom).
  const sorted = [...ticks].sort((a, b) => a.y - b.y);

  const merged = [];
  const yTolerance = 6; // px
  const priceToleranceFraction = 0.002; // 0.2% of price

  let current = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const t = sorted[i];
    const yDiff = Math.abs(t.y - current.y);
    const priceDiff = Math.abs(t.price - current.price);
    const priceTol = Math.max(
      priceToleranceFraction * Math.max(t.price, current.price),
      0.01
    );

    if (yDiff <= yTolerance && priceDiff <= priceTol) {
      // Merge: keep the higher-confidence one.
      if (t.confidence > current.confidence) {
        current = t;
      }
    } else {
      merged.push(current);
      current = t;
    }
  }
  merged.push(current);

  return merged;
}

/**
 * Fit linear mapping price = a * y + b using least squares.
 * @param {Array<{ y: number, price: number }>} ticks
 * @returns {{ a: number, b: number, r2: number }}
 */
function fitLinearPixelToPrice(ticks) {
  const n = ticks.length;
  if (n < 2) return { a: 0, b: 0, r2: 0 };

  let sumY = 0;
  let sumP = 0;
  let sumYY = 0;
  let sumYP = 0;

  for (const t of ticks) {
    const y = t.y;
    const p = t.price;
    sumY += y;
    sumP += p;
    sumYY += y * y;
    sumYP += y * p;
  }

  const denom = n * sumYY - sumY * sumY;
  if (denom === 0) return { a: 0, b: 0, r2: 0 };

  const a = (n * sumYP - sumY * sumP) / denom;
  const b = (sumP - a * sumY) / n;

  // Compute R^2 for quality.
  let ssTot = 0;
  let ssRes = 0;
  const meanP = sumP / n;

  for (const t of ticks) {
    const y = t.y;
    const p = t.price;
    const pred = a * y + b;
    ssTot += (p - meanP) ** 2;
    ssRes += (p - pred) ** 2;
  }

  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { a, b, r2 };
}
