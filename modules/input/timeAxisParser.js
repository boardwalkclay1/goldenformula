// timeAxisParser.js
// Golden Simulator — Time Axis, Spacing & Session Engine

export async function parseTimeAxis(canvas, candleData) {
  const ctx = canvas.getContext("2d");
  const { bounds, spacing, candles } = candleData;
  const { left, right, bottom } = bounds;

  const ticks = detectTicks(ctx, left, right, bottom + 4, canvas.height);
  const candlesPerLabel = estimateCPL(candles, ticks);
  const minutes = estimateMinutes(candlesPerLabel);

  candleData.candles = stampTime(candles, minutes);

  return {
    ticks,
    candlesPerLabel,
    spacing: {
      pixels: spacing,
      minutes,
    },
  };
}

function detectTicks(ctx, left, right, y, h) {
  const yy = clamp(y, 0, h - 1);
  const out = [];
  for (let x = left; x <= right; x += 2) {
    if (lum(ctx, x, yy) < 80) out.push({ x, y: yy });
  }
  return dedupe(out);
}

function dedupe(arr) {
  const out = [];
  for (const p of arr) {
    if (!out.some(o => Math.abs(o.x - p.x) < 10)) out.push(p);
  }
  return out;
}

function estimateCPL(candles, ticks) {
  if (!candles.length || !ticks.length) return 1;
  const first = candles[0].x;
  const last = candles[candles.length - 1].x;
  const cw = last - first || 1;

  const tickSpan =
    ticks.length > 1 ? ticks[ticks.length - 1].x - ticks[0].x : cw;

  const avgCandle = cw / (candles.length - 1);
  return Math.max(1, Math.round(tickSpan / avgCandle));
}

function estimateMinutes(cpl) {
  if (cpl <= 2) return 1;
  if (cpl <= 5) return 5;
  if (cpl <= 12) return 15;
  if (cpl <= 24) return 30;
  if (cpl <= 48) return 60;
  return 1440;
}

function stampTime(candles, minutes) {
  const base = Date.now();
  return candles.map((c, i) => ({
    ...c,
    timestamp: base + i * minutes * 60000,
  }));
}

function lum(ctx, x, y) {
  const d = ctx.getImageData(x, y, 1, 1).data;
  return (d[0] + d[1] + d[2]) / 3;
}

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}
