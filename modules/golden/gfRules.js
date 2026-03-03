// gfRules.js
// Golden Formula Tier 1 Core Rules
// Input: trend, volatility, liquidity, candles
// Output: rule-by-rule evaluation for GF scoring engine

export function evaluateGFRules({ trend, volatility, liquidity, candles }) {
  const last = candles[candles.length - 1];

  const rules = [];

  // ---------------------------
  // Rule 1: Trend Alignment
  // ---------------------------
  const trendRule = trend.direction !== "sideways" && trend.confidence >= 40;
  rules.push({
    name: "Trend Alignment",
    passed: trendRule,
    weight: 0.25,
    detail: `Trend: ${trend.direction}, confidence ${trend.confidence}`,
  });

  // ---------------------------
  // Rule 2: Volatility Regime
  // ---------------------------
  const volRule = volatility.regime !== "low-volatility";
  rules.push({
    name: "Volatility Regime",
    passed: volRule,
    weight: 0.15,
    detail: `Regime: ${volatility.regime}, confidence ${volatility.confidence}`,
  });

  // ---------------------------
  // Rule 3: Liquidity Context
  // ---------------------------
  const liqRule = liquidity.confidence >= 30;
  rules.push({
    name: "Liquidity Context",
    passed: liqRule,
    weight: 0.20,
    detail: `Liquidity confidence: ${liquidity.confidence}`,
  });

  // ---------------------------
  // Rule 4: Candle Structure
  // ---------------------------
  const body = Math.abs(last.open - last.close);
  const range = last.high - last.low;
  const bodyRatio = body / range;

  const candleRule = bodyRatio >= 0.35;
  rules.push({
    name: "Candle Structure",
    passed: candleRule,
    weight: 0.15,
    detail: `Body ratio: ${bodyRatio.toFixed(2)}`,
  });

  // ---------------------------
  // Rule 5: Breakout / Pullback Logic
  // ---------------------------
  const breakoutRule = detectBreakout(candles, trend.direction);
  rules.push({
    name: "Breakout / Pullback Logic",
    passed: breakoutRule,
    weight: 0.15,
    detail: breakoutRule ? "Breakout confirmed" : "No breakout",
  });

  // ---------------------------
  // Rule 6: Invalidation Logic
  // ---------------------------
  const invalidationRule = detectInvalidation(candles, trend.direction);
  rules.push({
    name: "Invalidation Check",
    passed: invalidationRule,
    weight: 0.10,
    detail: invalidationRule ? "No invalidation" : "Invalidation detected",
  });

  return rules;
}

// ---------------------------
// Breakout Detection
// ---------------------------

function detectBreakout(candles, direction) {
  if (candles.length < 4) return false;

  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];

  if (direction === "up") {
    return last.close > prev.high;
  }

  if (direction === "down") {
    return last.close < prev.low;
  }

  return false;
}

// ---------------------------
// Invalidation Detection
// ---------------------------

function detectInvalidation(candles, direction) {
  if (candles.length < 4) return true;

  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];

  if (direction === "up") {
    return last.low > prev.low;
  }

  if (direction === "down") {
    return last.high < prev.high;
  }

  return true;
}
