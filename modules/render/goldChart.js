// goldChart.js
// Golden Simulator — Cinematic Gold Chart Renderer

import { renderOverlays } from "./overlays.js";
import { renderAnnotations } from "./annotations.js";

export function renderGoldChart(canvas, candles, axis, liquidity, scoring, patterns) {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;

  // ------------------------------
  // BACKGROUND
  // ------------------------------
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "#0b0b0b");
  bg.addColorStop(1, "#1a1a1a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // ------------------------------
  // CANDLES
  // ------------------------------
  for (const c of candles) drawCandle(ctx, c, axis);

  // ------------------------------
  // OVERLAYS (entry/stop/target)
  // ------------------------------
  renderOverlays(ctx, {
    axis,
    scoring,
  });

  // ------------------------------
  // ANNOTATIONS (labels, time)
  // ------------------------------
  renderAnnotations(ctx, {
    axis,
    candles,
    scoring,
    patterns,
  });
}

function drawCandle(ctx, c, axis) {
  const { priceToPixel } = axis;

  const x = c.xCenter ?? c.x;
  const highY = priceToPixel(c.high);
  const lowY = priceToPixel(c.low);
  const openY = priceToPixel(c.open);
  const closeY = priceToPixel(c.close);

  const isBull = c.close > c.open;
  const color = isBull ? "#ffd700" : "#ff4d4d";

  // Wick
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, highY);
  ctx.lineTo(x, lowY);
  ctx.stroke();

  // Body
  ctx.fillStyle = color;
  ctx.fillRect(
    x - c.width / 2,
    Math.min(openY, closeY),
    c.width,
    Math.abs(openY - closeY)
  );
}
