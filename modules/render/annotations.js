// annotations.js
// Golden Simulator — Clean Labels, Time Stamps & Arrows

export function renderAnnotations(ctx, { axis, candles, scoring }) {
  if (!candles?.length || !scoring) return;

  const entry =
    scoring.entry ??
    scoring.rules?.entry ??
    null;

  if (!entry) return;

  const entryIndex = candles.length - 1;
  const entryCandle = candles[entryIndex];

  const x = entryCandle.xCenter ?? entryCandle.x;
  const y = axis.priceToPixel(entry);

  // ENTRY ARROW
  drawArrow(ctx, x, y);

  // TIME LABEL
  if (entryCandle.timestamp) {
    const t = formatTime(entryCandle.timestamp);
    ctx.fillStyle = "#ffffff";
    ctx.font = "12px Inter, sans-serif";
    ctx.fillText(t, x - 20, ctx.canvas.height - 10);
  }
}

function drawArrow(ctx, x, y) {
  ctx.fillStyle = "#ffd700";
  ctx.beginPath();
  ctx.moveTo(x, y - 10);
  ctx.lineTo(x - 6, y + 4);
  ctx.lineTo(x + 6, y + 4);
  ctx.closePath();
  ctx.fill();
}

function formatTime(ts) {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
