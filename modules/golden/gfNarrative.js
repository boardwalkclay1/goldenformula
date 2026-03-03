// /golden/gfNarrative.js
// Golden Formula Narrative Engine
// Consumes: scoring, rules, trend, volatility, liquidity, patterns
// Produces: a cinematic, structured narrative string

export function buildGFNarrative({ scoring, rules, trend, volatility, liquidity, patterns }) {
  const { gfScore, direction, entry, stop, target, rr } = scoring;

  const passed = rules.filter(r => r.passed);
  const failed = rules.filter(r => !r.passed);

  const header = [
    `Golden Formula Score: ${gfScore}`,
    `Direction: ${direction.toUpperCase()}`,
  ].join("\n");

  const context = [
    `Trend: ${trend.direction} (confidence ${trend.confidence})`,
    `Volatility: ${volatility.regime} (confidence ${volatility.confidence})`,
    `Liquidity Strength: ${liquidity.confidence}`,
    `Pattern Confidence: ${patterns.confidence}`,
  ].join("\n");

  const levels = direction === "none"
    ? "No trade levels — market conditions unclear."
    : [
        `Entry: ${entry.toFixed(4)}`,
        `Stop: ${stop.toFixed(4)}`,
        `Target: ${target.toFixed(4)}`,
        `Risk‑to‑Reward: ${rr.toFixed(2)}R`,
      ].join("\n");

  const passedList = passed.length
    ? passed.map(r => `✓ ${r.name} — ${r.detail}`).join("\n")
    : "None";

  const failedList = failed.length
    ? failed.map(r => `✗ ${r.name} — ${r.detail}`).join("\n")
    : "None";

  const interpretation = interpretGFScore(gfScore, direction, patterns);

  return [
    header,
    "",
    "Market Context:",
    context,
    "",
    "Trade Levels:",
    levels,
    "",
    "Passed Rules:",
    passedList,
    "",
    "Failed Rules:",
    failedList,
    "",
    "Interpretation:",
    interpretation,
  ].join("\n");
}

function interpretGFScore(score, direction, patterns) {
  if (direction === "none") {
    return "Market structure is unclear or sideways. No directional edge present.";
  }

  if (patterns.breakout?.active) {
    return "Breakout structure detected — momentum favors continuation if volatility supports it.";
  }

  if (patterns.compression?.active) {
    return "Compression detected — expect expansion soon. Watch for breakout confirmation.";
  }

  if (patterns.reversal?.active) {
    return `Reversal structure forming (${patterns.reversal.type}). Trend may be shifting.`;
  }

  if (score >= 85) {
    return "High‑probability alignment across trend, volatility, liquidity, and structure.";
  }

  if (score >= 70) {
    return "Strong setup with solid alignment. Manage risk but conditions are favorable.";
  }

  if (score >= 55) {
    return "Moderate setup. Some conditions missing. Consider waiting for confirmation.";
  }

  return "Weak alignment. Avoid unless additional structure appears.";
}
