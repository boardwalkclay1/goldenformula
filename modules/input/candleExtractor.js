// candleExtractor.js
// Golden Simulator — Candle, Wick & Price Shape Extraction Engine

export async function extractCandles(canvas, axis) {
  const ctx = canvas.getContext("2d");
  const { left, right, top, bottom } = axis.chartBounds;

  const width = right - left;
  const step = Math.max(2, Math.floor(width / 120));

  const raw = [];
  for (let x = left; x <= right; x += step) {
    raw.push({
      x,
      col: sampleColumn(ctx, x, top, bottom),
    });
  }

  const candles = raw.map((r, i) => detectCandle(r, top, bottom, i)).filter(Boolean);
  const spacing = estimateSpacing(candles);

  return {
    candles,
    bounds: axis.chartBounds,
    spacing,
  };
}

function sampleColumn(ctx, x, top, bottom) {
  const arr = [];
  for (let y = top; y <= bottom; y++) arr.push(lum(ctx, x, y));
  return arr;
}

function detectCandle({ x, col }, top, bottom, index) {
  const min = Math.min(...col);
  const max = Math.max(...col);
  const threshold = min + (max - min) * 0.35;

  let bodyTop = null;
  let bodyBottom = null;
  let high = null;
  let low = null;

  for (let i = 0; i < col.length; i++) {
    const v = col[i];
    if (high === null || v < col[high]) high = i;
    if (low === null || v > col[low]) low = i;

    if (v < threshold) {
      if (bodyTop === null) bodyTop = i;
      bodyBottom = i;
    }
  }

  if (high === null || low === null) return null;

  return {
    index,
    x,
    highY: top + high,
    lowY: top + low,
    bodyTopY: top + (bodyTop ?? high),
    bodyBottomY: top + (bodyBottom ?? low),
    fromScreenshot: true,
  };
}

function estimateSpacing(candles) {
  if (candles.length < 2) return 0;
  const diffs = [];
  for (let i = 1; i < candles.length; i++) diffs.push(candles[i].x - candles[i - 1].x);
  diffs.sort((a, b) => a - b);
  return diffs[Math.floor(diffs.length / 2)];
}

function lum(ctx, x, y) {
  const d = ctx.getImageData(x, y, 1, 1).data;
  return (d[0] + d[1] + d[2]) / 3;
}
