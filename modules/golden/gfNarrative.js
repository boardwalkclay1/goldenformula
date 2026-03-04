// /modules/golden/gfNarrative.js
// Beginner‑friendly Golden Formula narrative

export function buildGFNarrative({ scoring, rules, trend, volatility, liquidity, patterns, candleSpacing }) {
  const lines = [];

  // ------------------------------
  // SIMPLE HEADER
  // ------------------------------
  lines.push(`Golden Formula Score: ${scoring.gfScore}`);
  lines.push(`Direction: ${scoring.direction === "long" ? "Buy (Call)" : scoring.direction === "short" ? "Sell (Put)" : "No clear direction"}`);
  lines.push("");

  // ------------------------------
  // ENTRY + EXIT (BEGINNER FRIENDLY)
  // ------------------------------
  if (scoring.direction !== "none") {
    lines.push("Trade Plan (Simple):");

    lines.push(`• Entry price: ${scoring.entry}`);
    lines.push(`• Stop loss: ${scoring.stop}`);
    lines.push(`• Target: ${scoring.target}`);

    const candles = scoring.expectedCandles || 3;
    const minutes = candleSpacing ? Math.round(candleSpacing * candles) : null;

    if (minutes) {
      lines.push(`• Expected move: next ${candles} candles (~${minutes} minutes)`);
    } else {
      lines.push(`• Expected move: next few candles`);
    }

    lines.push("");
  }

  // ------------------------------
  // TREND (BEGINNER FRIENDLY)
  // ------------------------------
  lines.push("Trend:");
  if (trend.direction === "up") lines.push("• Price has mostly been moving up.");
  else if (trend.direction === "down") lines.push("• Price has mostly been moving down.");
  else lines.push("• Price is moving sideways, not a strong trend.");
  lines.push("");

  // ------------------------------
  // VOLATILITY (BEGINNER FRIENDLY)
  // ------------------------------
  lines.push("Volatility:");
  if (volatility.regime === "low") lines.push("• Price is moving calmly. Moves may be slower.");
  else if (volatility.regime === "medium") lines.push("• Price is moving at a normal speed.");
  else lines.push("• Price is jumping around a lot. Moves may be fast.");
  lines.push("");

  // ------------------------------
  // LIQUIDITY (BEGINNER FRIENDLY)
  // ------------------------------
  lines.push("Liquidity Zones:");
  if (liquidity.equalHighs.length > 0) lines.push("• There are equal highs above. Price may move up to grab them.");
  if (liquidity.equalLows.length > 0) lines.push("• There are equal lows below. Price may move down to grab them.");
  if (liquidity.fvgs.length > 0) lines.push("• There are gaps in price (FVGs). Price often fills these.");
  if (liquidity.equalHighs.length === 0 && liquidity.equalLows.length === 0 && liquidity.fvgs.length === 0)
    lines.push("• No major liquidity areas detected.");
  lines.push("");

  // ------------------------------
  // PATTERNS (BEGINNER FRIENDLY)
  // ------------------------------
  lines.push("Patterns:");
  if (patterns.flag.active) lines.push("• A flag pattern is forming. This usually means price may continue in the same direction.");
  if (patterns.breakout.active) lines.push("• Price broke above/below a recent level. This can start a new move.");
  if (patterns.reversal.active) lines.push(`• A reversal candle appeared (${patterns.reversal.type}).`);
  if (patterns.compression.active) lines.push("• Price is getting tight. A bigger move may come soon.");
  if (!patterns.flag.active && !patterns.breakout.active && !patterns.reversal.active && !patterns.compression.active)
    lines.push("• No strong patterns detected.");
  lines.push("");

  // ------------------------------
  // RULES PASSED / FAILED (BEGINNER FRIENDLY)
  // ------------------------------
  const passed = rules.filter(r => r.passed);
  const failed = rules.filter(r => !r.passed);

  lines.push("What the chart is doing well:");
  if (passed.length === 0) lines.push("• Nothing strong here.");
  passed.forEach(r => lines.push(`• ${r.detail}`));
  lines.push("");

  lines.push("What the chart is NOT doing well:");
  if (failed.length === 0) lines.push("• Nothing major is wrong.");
  failed.forEach(r => lines.push(`• ${r.detail}`));
  lines.push("");

  // ------------------------------
  // SIMPLE INTERPRETATION
  // ------------------------------
  lines.push("Simple Summary:");
  if (scoring.gfScore >= 80) lines.push("• This is a strong setup. The chart supports the move clearly.");
  else if (scoring.gfScore >= 60) lines.push("• This setup is decent. It could work, but watch price closely.");
  else if (scoring.gfScore >= 40) lines.push("• This setup is weak. Be careful.");
  else lines.push("• This setup is not good. Avoid trading it.");
  lines.push("");

  return lines.join("\n");
}
