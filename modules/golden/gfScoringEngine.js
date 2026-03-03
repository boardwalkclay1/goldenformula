// gfScoringEngine.js
// Golden Formula Tier 2 Scoring Engine
// Consumes: trend, volatility, liquidity, gfRules, candles
// Produces: GF score, entry, stop, target, narrative

export function scoreGoldenFormula({ trend, volatility, liquidity, rules, candles }) {
  const last = candles[candles.length - 1];

  // ---------------------------
  // 1. Compute weighted score
  // ---------------------------
  let score = 0;
  let totalWeight = 0;

  for (const r of rules) {
    totalWeight += r.weight;
    if (r.passed) score += r.weight;
  }

  const gfScore = Math.round((score / totalWeight) * 100);

  // ---------------------------
  // 2. Determine entry direction
  // ---------------------------
  const direction = trend.direction === "up" ? "long"
                  : trend.direction === "down" ? "short"
                  : "none";

  if (direction === "none") {
    return {
      gfScore,
      direction,
      entry: null,
      stop: null,
      target: null,
      rr: null,
      narrative: buildNarrative({ gfScore, direction, rules, trend, volatility, liquidity }),
      rules,
    };
  }

  // ---------------------------
  // 3. Compute entry, stop, target
  // ---------------------------
  const entry = last.close;

  const stop = direction === "long"
    ? Math.min(...candles.slice(-5).map(c => c.low))
    : Math.max(...candles.slice(-5).map(c => c.high));

  const atr = volatility.atr || (last.high - last.low);

  const target = direction === "long"
    ? entry + atr * 2.2
    : entry - atr * 2.2;

  const rr = Math.abs((target - entry) / (entry - stop));

  // ---------------------------
  // 4. Build narrative
  // ---------------------------
  const narrative = buildNarrative({
    gfScore,
    direction,
    rules,
    trend,
    volatility,
    liquidity,
  });

  return {
    gfScore,
    direction,
    entry,
    stop,
    target,
    rr,
    narrative,
    rules,
  };
}

// ---------------------------
// Narrative Builder
// ---------------------------

function buildNarrative({ gfScore, direction, rules, trend, volatility, liquidity }) {
  const passed = rules.filter(r => r.passed).map(r => r.name);
  const failed = rules.filter(r => !r.passed).map(r => r.name);

  return `
Golden Formula Score: ${gfScore}

Direction: ${direction.toUpperCase()}

Trend: ${trend.direction} (confidence ${trend.confidence})
Volatility: ${volatility.regime} (confidence ${volatility.confidence})
Liquidity Strength: ${liquidity.confidence}

Passed Rules:
- ${passed.join("\n- ")}

Failed Rules:
- ${failed.join("\n- ")}

Interpretation:
${interpretGFScore(gfScore, direction)}
  `.trim();
}

function interpretGFScore(score, direction) {
  if (direction === "none") return "Market is sideways or unclear. No trade recommended.";

  if (score >= 85) return "High‑probability setup with strong alignment across trend, volatility, and liquidity.";
  if (score >= 70) return "Solid setup with good alignment. Watch volatility and structure.";
  if (score >= 55) return "Moderate setup. Some conditions missing. Manage risk tightly.";
  return "Weak setup. Avoid unless additional confirmation appears.";
}
