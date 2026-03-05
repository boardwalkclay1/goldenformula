// gfScoringEngine.js
// Golden Formula — Confidence Scoring Engine

export function scoreSetup(trend, pattern, liquidity, timing, rules) {
  let score = 0;

  // Trend strength
  if (trend.stackedBull || trend.stackedBear) score += 20;
  if (trend.shortSlope > 0) score += 10;
  if (trend.longSlope > 0) score += 10;

  // Pattern confirmation
  if (pattern.doubleTop || pattern.roundingBottom || pattern.flag) score += 15;
  if (pattern.engulfingBull || pattern.engulfingBear) score += 10;

  // Integer levels
  if (liquidity.nearWhole) score += 10;
  if (liquidity.nearFive) score += 5;
  if (liquidity.nearTen) score += 15;

  // Timing window
  if (timing.burstWindow) score += 20;
  if (timing.trendWindow) score += 10;

  // MA cluster = big move loading
  if (timing.maCluster) score += 25;

  // Breakout structure
  if (rules.breakoutUp || rules.breakoutDown) score += 20;

  return {
    score,
    confidence:
      score >= 80 ? "high" :
      score >= 50 ? "medium" :
      "low"
  };
}
