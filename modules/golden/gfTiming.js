// Advanced timing + entry/exit engine (beginner-friendly output)

export function buildGFTiming({ scoring, trend, volatility, patterns, candleSpacing }) {
  const out = [];

  if (scoring.direction === "none") {
    out.push("No clear entry or exit because the chart does not show a strong direction.");
    return out.join("\n");
  }

  out.push("Entry and Exit Timing (Simple):");
  out.push(`• Entry price: ${scoring.entry}`);
  out.push(`• Stop loss: ${scoring.stop}`);
  out.push(`• Target: ${scoring.target}`);
  out.push("");

  // Candle timing
  const candles = patterns.breakout.active ? 2 : patterns.compression.active ? 4 : 3;
  const minutes = candleSpacing ? Math.round(candleSpacing * candles) : null;

  out.push("When to Enter:");
  if (patterns.breakout.active) {
    out.push("• Enter when the next candle breaks above/below the breakout level.");
  } else if (patterns.flag.active) {
    out.push("• Enter when price breaks out of the flag pattern.");
  } else {
    out.push("• Enter when the next candle moves in your direction.");
  }

  if (minutes) out.push(`• This should happen within the next ${candles} candles (~${minutes} minutes).`);
  out.push("");

  out.push("When to Exit:");
  out.push("• Exit at the target price if price reaches it.");
  out.push("• Exit early if price closes below your stop level.");
  out.push("");

  out.push("Extra Notes:");
  if (volatility.regime === "high") out.push("• Price is moving fast. Moves may happen quicker than normal.");
  if (volatility.regime === "low") out.push("• Price is slow. Be patient.");
  if (patterns.compression.active) out.push("• Price is tight. A strong move may happen soon.");

  return out.join("\n");
}
