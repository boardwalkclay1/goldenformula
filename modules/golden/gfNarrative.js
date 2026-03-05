// gfNarrative.js
// Golden Formula — Narrative Engine

export function buildGFNarrative(trend, pattern, liquidity, timing, rules, score, strategy) {
  const out = [];

  out.push(`Trend: ${trend.trendBias.replace("_", " ")}`);
  out.push(`MA Structure: ${trend.stackedBull ? "Bullish" : trend.stackedBear ? "Bearish" : "Mixed"}`);
  out.push(`Pattern: ${describePattern(pattern)}`);
  out.push(`Near key level: ${liquidity.nearWhole || liquidity.nearFive || liquidity.nearTen}`);
  out.push(`Timing: ${timing.expectedBehavior}`);
  out.push(`Breakout direction: ${rules.direction}`);
  out.push(`Entry: ${rules.entry.toFixed(2)}`);
  out.push(`Stop: ${rules.stop.toFixed(2)}`);
  out.push(`Target: ${rules.target.toFixed(2)}`);
  out.push(`Confidence: ${score.confidence}`);
  out.push(`Suggested play: ${strategy.toUpperCase()}`);

  return out;
}

function describePattern(p) {
  if (p.doubleTop) return "Double Top";
  if (p.roundingBottom) return "Rounding Bottom";
  if (p.flag) return "Flag";
  if (p.engulfingBull) return "Bullish Engulfing";
  if (p.engulfingBear) return "Bearish Engulfing";
  if (p.hammer) return "Hammer";
  return "None";
}
