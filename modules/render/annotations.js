// /render/annotations.js
// Draws arrows, labels, sweeps, breakouts, compression markers

export function drawAnnotations(ctx, axis, candles, gf, patterns) {
  const { priceToPixel } = axis;

  // Breakout arrow
  if (gf.direction !== "none") {
    const last = candles[candles.length - 1];
    const x = last.xCenter;
    const y = priceToPixel.a * last.close + priceToPixel.b;

    ctx.fillStyle = gf.direction === "long" ? "#ffd700" : "#ff4d4d";
    ctx.beginPath();

    if (gf.direction === "long") {
      ctx.moveTo(x, y - 12);
      ctx.lineTo(x - 6, y);
      ctx.lineTo(x + 6, y);
    } else {
      ctx.moveTo(x, y + 12);
      ctx.lineTo(x - 6, y);
      ctx.lineTo(x + 6, y);
    }

    ctx.fill();
  }

  // Liquidity sweeps
  for (const sweep of patterns?.sweeps || []) {
    const c = candles[sweep.index];
    const x = c.xCenter;
    const y = priceToPixel.a * sweep.sweptPrice + priceToPixel.b;

    ctx.fillStyle = "rgba(255,215,0,0.6)";
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Compression cone
  if (patterns?.compression?.active) {
    drawCompressionCone(ctx, candles, priceToPixel);
  }
}

function drawCompressionCone(ctx, candles, priceToPixel) {
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 6] || candles[0];

  const x1 = prev.xCenter;
  const x2 = last.xCenter;

  const yHigh1 = priceToPixel.a * prev.high + priceToPixel.b;
  const yLow1 = priceToPixel.a * prev.low + priceToPixel.b;

  const yHigh2 = priceToPixel.a * last.high + priceToPixel.b;
  const yLow2 = priceToPixel.a * last.low + priceToPixel.b;

  ctx.strokeStyle = "rgba(255,215,0,0.25)";
  ctx.lineWidth = 1.2;

  ctx.beginPath();
  ctx.moveTo(x1, yHigh1);
  ctx.lineTo(x2, yHigh2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x1, yLow1);
  ctx.lineTo(x2, yLow2);
  ctx.stroke();
}
