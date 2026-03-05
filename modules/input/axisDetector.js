// axisDetector.js
// Golden Simulator — Price Axis, Time Axis & Chart Bounds Engine

export async function detectPriceAxis(canvas) {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;

  const vertical = scanVertical(ctx, width, height);
  const horizontal = scanHorizontal(ctx, width, height);

  const priceSide = pickSide(vertical, width, "vertical");
  const timeSide = pickSide(horizontal, height, "horizontal");

  const chartBounds = computeBounds(priceSide, timeSide, width, height);

  return {
    priceSide,
    timeSide,
    chartBounds,
  };
}

function scanVertical(ctx, width, height) {
  const arr = [];
  for (let x = 0; x < width; x += 2) {
    let c = 0;
    let prev = lum(ctx, x, 0);
    for (let y = 1; y < height; y++) {
      const cur = lum(ctx, x, y);
      c += Math.abs(cur - prev);
      prev = cur;
    }
    arr.push({ x, c });
  }
  return arr;
}

function scanHorizontal(ctx, width, height) {
  const arr = [];
  for (let y = 0; y < height; y += 2) {
    let c = 0;
    let prev = lum(ctx, 0, y);
    for (let x = 1; x < width; x++) {
      const cur = lum(ctx, x, y);
      c += Math.abs(cur - prev);
      prev = cur;
    }
    arr.push({ y, c });
  }
  return arr;
}

function pickSide(arr, size, type) {
  const first = arr.filter(a => (type === "vertical" ? a.x : a.y) < size * 0.25);
  const last = arr.filter(a => (type === "vertical" ? a.x : a.y) > size * 0.75);

  const firstScore = avg(first.map(a => a.c));
  const lastScore = avg(last.map(a => a.c));

  if (type === "vertical") return firstScore > lastScore ? "left" : "right";
  return lastScore > firstScore ? "bottom" : "top";
}

function computeBounds(priceSide, timeSide, width, height) {
  const left = priceSide === "left" ? width * 0.12 : width * 0.06;
  const right = priceSide === "right" ? width * 0.88 : width * 0.94;
  const top = timeSide === "top" ? height * 0.14 : height * 0.06;
  const bottom = timeSide === "bottom" ? height * 0.86 : height * 0.94;

  return {
    left: Math.floor(left),
    right: Math.floor(right),
    top: Math.floor(top),
    bottom: Math.floor(bottom),
  };
}

function lum(ctx, x, y) {
  const d = ctx.getImageData(x, y, 1, 1).data;
  return (d[0] + d[1] + d[2]) / 3;
}

function avg(a) {
  return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
}
