// /render/goldChart.js
// Core cinematic chart renderer for Golden Simulator
// Responsibilities:
// - Set gold theme background
// - Draw candles
// - Call overlays + annotations (but does NOT implement them)

import { drawOverlays } from "./overlays.js";
import { drawAnnotations } from "./annotations.js";

export function renderGoldChart(canvas, candles, axisInfo, liquidity, gf, patterns) {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "#0b0b0b");
  bg.addColorStop(1, "#1a1a1a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Candles
  for (const c of candles) {
    drawCandle(ctx, c, axisInfo);
  }

  // Overlays (liquidity zones, FVGs, GF levels)
  drawOverlays(ctx, axisInfo, liquidity, gf);

  // Annotations (arrows, labels, sweeps, breakouts)
  drawAnnotations(ctx, axisInfo, candles, gf, patterns);
}

function drawCandle(ctx, c, axis) {
  const { priceToPixel } = axis;

  const x = c.xCenter;
  const highY = priceToPixel.a * c.high + priceToPixel.b;
  const lowY = priceToPixel.a * c.low + priceToPixel.b;
  const openY = priceToPixel.a * c.open + priceToPixel.b;
  const closeY = priceToPixel.a * c.close + priceToPixel.b;

  const color = c.isBull ? "#ffd700" : "#ff4d4d";

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
