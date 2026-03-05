// axisDetector.js
// Golden Simulator — Price Axis, Time Axis & Chart Bounds Engine

// Signature must match core-logic: detectPriceAxis(canvas)
export async function detectPriceAxis(canvas) {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;

  const verticalEdges = scanVerticalEdges(ctx, width, height);
  const horizontalEdges = scanHorizontalEdges(ctx, width, height);

  const priceSide = detectPriceSide(verticalEdges, width);
  const timeSide = detectTimeSide(horizontalEdges, height);

  const chartBounds = computeChartBounds(priceSide, timeSide, width, height);
  const grid = detectGridLines(ctx, chartBounds);
  const axisTicks = detectAxisTicks(ctx, chartBounds, priceSide, timeSide);

  return {
    priceSide,          // "left" | "right"
    timeSide,           // "top" | "bottom"
    chartBounds,        // { left, right, top, bottom }
    grid,               // { verticalLines: [...], horizontalLines: [...] }
    axisTicks,          // { priceTicks: [...], timeTicks: [...] }
  };
}

function scanVerticalEdges(ctx, width, height) {
  const edges = [];
  const step = Math.max(1, Math.floor(width / 200));
  for (let x = 0; x < width; x += step) {
    let contrast = 0;
    let prev = luminance(ctx, x, 0);
    for (let y = 1; y < height; y++) {
      const cur = luminance(ctx, x, y);
      contrast += Math.abs(cur - prev);
      prev = cur;
    }
    edges.push({ x, contrast });
  }
  return edges;
}

function scanHorizontalEdges(ctx, width, height) {
  const edges = [];
  const step = Math.max(1, Math.floor(height / 200));
  for (let y = 0; y < height; y += step) {
    let contrast = 0;
    let prev = luminance(ctx, 0, y);
    for (let x = 1; x < width; x++) {
      const cur = luminance(ctx, x, y);
      contrast += Math.abs(cur - prev);
      prev = cur;
    }
    edges.push({ y, contrast });
  }
  return edges;
}

function detectPriceSide(verticalEdges, width) {
  const left = verticalEdges.filter(e => e.x < width * 0.25);
  const right = verticalEdges.filter(e => e.x > width * 0.75);

  const leftScore = average(left.map(e => e.contrast));
  const rightScore = average(right.map(e => e.contrast));

  return leftScore >= rightScore ? "left" : "right";
}

function detectTimeSide(horizontalEdges, height) {
  const top = horizontalEdges.filter(e => e.y < height * 0.25);
  const bottom = horizontalEdges.filter(e => e.y > height * 0.75);

  const topScore = average(top.map(e => e.contrast));
  const bottomScore = average(bottom.map(e => e.contrast));

  return bottomScore >= topScore ? "bottom" : "top";
}

function computeChartBounds(priceSide, timeSide, width, height) {
  const leftMargin = priceSide === "left" ? 0.12 : 0.06;
  const rightMargin = priceSide === "right" ? 0.12 : 0.06;
  const topMargin = timeSide === "top" ? 0.14 : 0.06;
  const bottomMargin = timeSide === "bottom" ? 0.14 : 0.06;

  const left = Math.floor(width * leftMargin);
  const right = Math.floor(width * (1 - rightMargin));
  const top = Math.floor(height * topMargin);
  const bottom = Math.floor(height * (1 - bottomMargin));

  return { left, right, top, bottom };
}

function detectGridLines(ctx, bounds) {
  const verticalLines = [];
  const horizontalLines = [];

  const { left, right, top, bottom } = bounds;

  // vertical grid
  for (let x = left; x <= right; x += 4) {
    let contrast = 0;
    let prev = luminance(ctx, x, top);
    for (let y = top + 1; y <= bottom; y++) {
      const cur = luminance(ctx, x, y);
      contrast += Math.abs(cur - prev);
      prev = cur;
    }
    if (contrast > 20000) verticalLines.push(x);
  }

  // horizontal grid
  for (let y = top; y <= bottom; y += 4) {
    let contrast = 0;
    let prev = luminance(ctx, left, y);
    for (let x = left + 1; x <= right; x++) {
      const cur = luminance(ctx, x, y);
      contrast += Math.abs(cur - prev);
      prev = cur;
    }
    if (contrast > 20000) horizontalLines.push(y);
  }

  return { verticalLines, horizontalLines };
}

function detectAxisTicks(ctx, bounds, priceSide, timeSide) {
  const { left, right, top, bottom } = bounds;

  const priceTicks = [];
  const timeTicks = [];

  const priceX = priceSide === "left" ? left - 5 : right + 5;
  for (let y = top; y <= bottom; y += 4) {
    const lum = luminance(ctx, clamp(priceX, 0, ctx.canvas.width - 1), y);
    if (lum < 80) priceTicks.push({ x: priceX, y });
  }

  const timeY = timeSide === "bottom" ? bottom + 5 : top - 5;
  for (let x = left; x <= right; x += 4) {
    const lum = luminance(ctx, x, clamp(timeY, 0, ctx.canvas.height - 1));
    if (lum < 80) timeTicks.push({ x, y: timeY });
  }

  return {
    priceTicks: dedupeAxisTicks(priceTicks, "y"),
    timeTicks: dedupeAxisTicks(timeTicks, "x"),
  };
}

function dedupeAxisTicks(points, key) {
  const out = [];
  const threshold = 6;
  for (const p of points) {
    if (!out.some(o => Math.abs(o[key] - p[key]) < threshold)) {
      out.push(p);
    }
  }
  return out;
}

function luminance(ctx, x, y) {
  const data = ctx.getImageData(x, y, 1, 1).data;
  return (data[0] + data[1] + data[2]) / 3;
}

function average(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}
