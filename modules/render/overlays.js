// overlays.js
// Golden Simulator — Entry/Stop/Target + Shadow Projection Overlays

export function renderOverlays(ctx, { axis, scoring }) {
  const { priceToPixel } = axis;

  const entry  = scoring.entry  ?? scoring.rules?.entry;
  const stop   = scoring.stop   ?? scoring.rules?.stop;
  const target = scoring.target ?? scoring.rules?.target;

  if (!entry || !stop || !target) return;

  const gold  = "#ffd700";
  const green = "#00ff99";
  const red   = "#ff4d4d";

  // ENTRY
  drawHLine(ctx, priceToPixel(entry), gold, 2);
  drawLabel(ctx, "ENTRY", priceToPixel(entry), gold);

  // STOP LOSS
  drawHLine(ctx, priceToPixel(stop), red, 2);
  drawLabel(ctx, "STOP LOSS", priceToPixel(stop), red);

  // TARGET
  drawHLine(ctx, priceToPixel(target), green, 2);
  drawLabel(ctx, "TARGET", priceToPixel(target), green);

  // SHADOW
  drawShadow(ctx, axis, entry, target, stop);
}

function drawHLine(ctx, y, color, width = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(ctx.canvas.width, y);
  ctx.stroke();
}

function drawLabel(ctx, text, y, color) {
  ctx.fillStyle = color;
  ctx.font = "14px Inter, sans-serif";
  ctx.fillText(text, 10, y - 6);
}

function drawShadow(ctx, axis, entry, target, stop) {
  const { priceToPixel } = axis;

  const entryY  = priceToPixel(entry);
  const targetY = priceToPixel(target);
  const stopY   = priceToPixel(stop);

  const isLong = target > entry;

  const shadowColor = isLong
    ? "rgba(0,255,150,0.15)"
    : "rgba(255,80,80,0.15)";

  const y1 = isLong ? targetY : entryY;
  const y2 = isLong ? entryY : stopY;

  ctx.fillStyle = shadowColor;
  ctx.fillRect(0, y1, ctx.canvas.width, y2 - y1);
}
