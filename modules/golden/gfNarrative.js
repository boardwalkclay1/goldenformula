// Beginner-friendly Golden Formula narrative

export function buildGFNarrative({ scoring, rules, trend, volatility, liquidity, patterns }) {
  const out = [];

  out.push(`Golden Formula Score: ${scoring.gfScore}`);
  out.push(`Direction: ${scoring.direction === "long" ? "Buy (Call)" : scoring.direction === "short" ? "Sell (Put)" : "No clear direction"}`);
  out.push("");

  out.push("Simple Explanation:");
  if (trend.direction === "up") out.push("• Price has mostly been moving upward.");
  else if (trend.direction === "down") out.push("• Price has mostly been moving downward.");
  else out.push("• Price is moving sideways, not trending strongly.");
  out.push("");

  out.push("Volatility:");
  if (volatility.regime === "low") out.push("• Price is calm and moving slowly.");
  else if (volatility.regime === "medium") out.push("• Price is moving at a normal speed.");
  else out.push("• Price is jumping around quickly.");
  out.push("");

  out.push("Patterns:");
  if (patterns.flag.active) out.push("• A flag pattern is forming. This usually means price may continue in the same direction.");
  if (patterns.breakout.active) out.push("• Price broke above/below a recent level. This can start a new move.");
  if (patterns.reversal.active) out.push(`• A reversal candle appeared (${patterns.reversal.type}).`);
  if (patterns.compression.active) out.push("• Price is getting tight. A bigger move may come soon.");
  if (!patterns.flag.active && !patterns.breakout.active && !patterns.reversal.active && !patterns.compression.active)
    out.push("• No strong patterns detected.");
  out.push("");

  out.push("Liquidity Zones:");
  if (liquidity.equalHighs.length > 0) out.push("• There are equal highs above. Price may move up to grab them.");
  if (liquidity.equalLows.length > 0) out.push("• There are equal lows below. Price may move down to grab them.");
  if (liquidity.fvgs.length > 0) out.push("• There are gaps in price (FVGs). Price often fills these.");
  if (liquidity.equalHighs.length === 0 && liquidity.equalLows.length === 0 && liquidity.fvgs.length === 0)
    out.push("• No major liquidity areas detected.");
  out.push("");

  out.push("Summary:");
  if (scoring.gfScore >= 80) out.push("• Strong setup. The chart supports the move clearly.");
  else if (scoring.gfScore >= 60) out.push("• Decent setup. Could work, but watch price closely.");
  else if (scoring.gfScore >= 40) out.push("• Weak setup. Be careful.");
  else out.push("• Not a good setup. Avoid trading it.");

  return out.join("\n");
}
