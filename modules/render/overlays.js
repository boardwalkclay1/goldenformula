// /render/overlays.js
// Draws liquidity zones, equal highs/lows, FVGs, GF levels

export function drawOverlays(ctx, axis, liquidity, gf) {
  const { priceToPixel } = axis;
  const w = ctx.canvas.width;

  // Equal highs/lows
  for (const eq of liquidity.equalLevels) {
    const y = priceToPixel.a * eq.price + priceToPixel.b;
    ctx.strokeStyle = "rgba(255,215,0,0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // FVGs
  for (const fvg of liquidity.fvgs) {
    const top = priceToPixel.a * fvg.gapTop + priceToPixel.b;
    const bottom = priceToPixel.a * fvg.gapBottom + priceToPixel.b;

    ctx.fillStyle =
      fvg.type === "bullish"
        ? "rgba(0,255,0,0.12)"
        : "rgba(255,0,0,0.12)";

    ctx.fillRect(0, top, w, bottom - top);
  }

  // GF Levels
  if (gf.direction !== "none") {
    drawLevel(ctx, priceToPixel, gf.entry, "#ffd700", 2);
    drawLevel(ctx, priceToPixel, gf.stop, "#ff4d4d", 2);
    drawLevel(ctx, priceToPixel, gf.target, "#00ff99", 2);
  }
}

function drawLevel(ctx, priceToPixel, price, color, width) {
  const y = priceToPixel.a * price + priceToPixel.b;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(ctx.canvas.width, y);
  ctx.stroke();
}
