// gfScoring.js
// Golden Formula — Ultra-Advanced Confidence Scoring Engine

export function scoreGoldenFormula({ trend, patterns, liquidity, timing, rules, volatility }) {
  let score = 50; // neutral baseline

  // ------------------------------
  // 1. TREND STRENGTH & PHASE
  // ------------------------------
  if (trend.strength >= 70) score += 20;
  if (trend.strength >= 50) score += 10;

  if (trend.phase.includes("early")) score += 15;
  if (trend.phase.includes("late")) score -= 10;
  if (trend.phase.includes("reversal")) score += 10;

  if (trend.ma?.stackedBull || trend.ma?.stackedBear) score += 15;
  if (trend.ma?.compression) score -= 10;
  if (trend.ma?.expansion) score += 5;

  // ------------------------------
  // 2. PATTERN CONFIRMATION
  // ------------------------------
  const cp = patterns.candles;
  const chart = patterns.chart;

  if (cp.engulfingBull || cp.engulfingBear) score += 10;
  if (cp.morningStar || cp.eveningStar) score += 10;
  if (cp.hammer || cp.invertedHammer) score += 5;
  if (cp.pinBar && cp.nearRound) score += 10;

  if (chart.doubleTop || chart.doubleBottom) score += 15;
  if (chart.roundingBottom || chart.roundingTop) score += 15;
  if (chart.flag || chart.triangle || chart.channel || chart.wedge) score += 10;

  if (chart.breakout?.up || chart.breakout?.down) score += 20;
  if (chart.breakout?.retest) score += 10;
  if (chart.breakout?.failedRetest) score -= 10;

  // ------------------------------
  // 3. LIQUIDITY INTELLIGENCE
  // ------------------------------
  const rn = liquidity.roundNumbers ?? liquidity;

  if (rn.nearWhole) score += 10;
  if (rn.nearFive) score += 5;
  if (rn.nearTen) score += 15;

  if (liquidity.sweeps?.hasStopHunt) score += 15;
  if (liquidity.zones?.compressionNearRound) score += 10;
  if (liquidity.zones?.trappedBetweenRounds) score += 5;

  // ------------------------------
  // 4. VOLATILITY REGIME
  // ------------------------------
  if (volatility.regime === "explosive") score += 20;
  if (volatility.regime === "high") score += 10;
  if (volatility.regime === "low") score -= 10;

  if (volatility.regimeTrend === "expanding") score += 10;
  if (volatility.regimeTrend === "contracting") score -= 5;

  if (volatility.structure?.expansion) score += 10;
  if (volatility.structure?.compression) score -= 5;
  if (volatility.structure?.traps?.length) score += 10;

  // ------------------------------
  // 5. TIMING WINDOWS
  // ------------------------------
  if (timing.burstWindow) score += 20;
  if (timing.digestionWindow) score += 5;
  if (timing.trendWindow) score += 10;
  if (timing.powerHour) score += 15;

  if (timing.integerTiming) score += 10;
  if (timing.maCluster) score += 15;
  if (timing.maBounceTiming) score += 10;

  if (timing.breakoutTiming) score += 15;
  if (timing.retestTiming) score += 10;
  if (timing.trapTiming) score += 10;

  if (timing.volatilityTiming) score += 10;
  if (timing.liquidityTiming) score += 10;

  if (timing.earlyTrendTiming) score += 10;
  if (timing.lateTrendExhaustion) score -= 10;
  if (timing.reversalTiming) score += 10;

  if (timing.spacingTiming) score += 5;

  // ------------------------------
  // 6. RULE CONFIDENCE
  // ------------------------------
  if (rules.confidence >= 70) score += 20;
  if (rules.confidence >= 50) score += 10;
  if (rules.confidence <= 30) score -= 10;

  // ------------------------------
  // FINALIZE
  // ------------------------------
  score = Math.max(0, Math.min(100, score));

  const confidence =
    score >= 80 ? "high" :
    score >= 55 ? "medium" :
    "low";

  return {
    score,
    confidence,
  };
}
