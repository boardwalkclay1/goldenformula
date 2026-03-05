// gfTiming.js
// Golden Formula — Ultra-Advanced Market Timing Engine
// Fully aligned with integers, MA structure, volatility, liquidity, trend phase,
// session windows, candle spacing, and breakout/retest timing.

export function analyzeTiming({ candles, trend, liquidity, volatility, patterns, time }) {
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2] ?? last;

  // ------------------------------
  // 1. TIME OF DAY WINDOWS
  // ------------------------------
  const t = extractHHMM(last.timestamp);

  const burstWindow = t >= "09:30" && t <= "10:00";     // volatility burst
  const digestionWindow = t > "10:00" && t <= "11:00";  // trend digestion
  const trendWindow = t > "11:00" && t <= "14:30";      // stable trend
  const powerHour = t >= "15:00" && t <= "16:00";       // reversal or acceleration

  // ------------------------------
  // 2. INTEGER & ROUND NUMBER TIMING
  // ------------------------------
  const rn = liquidity.roundNumbers ?? liquidity;

  const nearWhole = rn.nearWhole;
  const nearFive = rn.nearFive;
  const nearTen = rn.nearTen;

  const integerTiming =
    nearWhole || nearFive || nearTen;

  // ------------------------------
  // 3. MA CLUSTER TIMING
  // ------------------------------
  const ma = patterns.ma.structure;

  const maCluster =
    Math.abs(last.ma20 - last.ma50) <= liquidity.tickSize * 3 &&
    Math.abs(last.ma50 - last.ma200) <= liquidity.tickSize * 4;

  const maBounceTiming =
    maCluster &&
    (last.close > last.ma20 && prev.close < prev.ma20 ||
     last.close < last.ma20 && prev.close > prev.ma20);

  // ------------------------------
  // 4. VOLATILITY TIMING
  // ------------------------------
  const volHigh = volatility.regime === "high" || volatility.regime === "explosive";
  const volLow = volatility.regime === "low";
  const volExpanding = volatility.regimeTrend === "expanding";
  const volContracting = volatility.regimeTrend === "contracting";

  const volatilityTiming =
    (burstWindow && volExpanding) ||
    (trendWindow && volContracting) ||
    (powerHour && volHigh);

  // ------------------------------
  // 5. LIQUIDITY TIMING
  // ------------------------------
  const sweep = patterns.events.hasStopHunt;
  const compression = liquidity.zones?.compressionNearRound;
  const trapped = liquidity.zones?.trappedBetweenRounds;

  const liquidityTiming =
    sweep ||
    compression ||
    trapped;

  // ------------------------------
  // 6. TREND PHASE TIMING
  // ------------------------------
  const earlyTrendTiming =
    trend.phase.includes("early") &&
    trend.strength >= 60 &&
    !volHigh;

  const lateTrendExhaustion =
    trend.phase.includes("late") &&
    volExpanding;

  const reversalTiming =
    trend.phase.includes("reversal") &&
    sweep &&
    volExpanding;

  // ------------------------------
  // 7. BREAKOUT / RETEST TIMING
  // ------------------------------
  const breakoutUp = patterns.chart.breakout?.up;
  const breakoutDown = patterns.chart.breakout?.down;
  const retest = patterns.chart.breakout?.retest;
  const failedRetest = patterns.chart.breakout?.failedRetest;

  const breakoutTiming =
    breakoutUp || breakoutDown;

  const retestTiming =
    retest && !failedRetest;

  const trapTiming =
    failedRetest && volExpanding;

  // ------------------------------
  // 8. CANDLE SPACING TIMING
  // ------------------------------
  const spacingMin = time.spacing.minutes;

  const fastMarket = spacingMin <= 2;
  const normalMarket = spacingMin <= 5;
  const slowMarket = spacingMin > 5;

  const spacingTiming =
    (fastMarket && burstWindow) ||
    (normalMarket && trendWindow) ||
    (slowMarket && powerHour);

  // ------------------------------
  // 9. EXPECTED BEHAVIOR
  // ------------------------------
  let expectedBehavior = "neutral";

  if (burstWindow) expectedBehavior = "burst";
  if (trendWindow) expectedBehavior = "trend_follow";
  if (powerHour) expectedBehavior = "power_hour_shift";

  if (breakoutTiming) expectedBehavior = "breakout";
  if (retestTiming) expectedBehavior = "retest";
  if (trapTiming) expectedBehavior = "trap_reversal";

  if (integerTiming) expectedBehavior = "integer_reaction";
  if (maBounceTiming) expectedBehavior = "ma_bounce";

  if (reversalTiming) expectedBehavior = "reversal_forming";
  if (lateTrendExhaustion) expectedBehavior = "trend_exhaustion";

  // ------------------------------
  // 10. TIMING CONFIDENCE
  // ------------------------------
  let confidence = 50;

  if (burstWindow) confidence += 10;
  if (trendWindow) confidence += 5;
  if (powerHour) confidence += 10;

  if (integerTiming) confidence += 10;
  if (maCluster) confidence += 10;
  if (maBounceTiming) confidence += 10;

  if (volatilityTiming) confidence += 10;
  if (volHigh) confidence += 5;
  if (volLow) confidence -= 5;

  if (liquidityTiming) confidence += 10;
  if (sweep) confidence += 10;

  if (earlyTrendTiming) confidence += 10;
  if (lateTrendExhaustion) confidence -= 10;

  if (breakoutTiming) confidence += 15;
  if (retestTiming) confidence += 10;
  if (trapTiming) confidence += 10;

  if (spacingTiming) confidence += 5;

  confidence = Math.max(0, Math.min(100, confidence));

  return {
    burstWindow,
    digestionWindow,
    trendWindow,
    powerHour,

    integerTiming,
    maCluster,
    maBounceTiming,

    volatilityTiming,
    liquidityTiming,
    earlyTrendTiming,
    lateTrendExhaustion,
    reversalTiming,

    breakoutTiming,
    retestTiming,
    trapTiming,

    spacingTiming,

    expectedBehavior,
    confidence,
  };
}

// ------------------------------
// TIME UTILITY
// ------------------------------
function extractHHMM(timestamp) {
  const d = new Date(timestamp);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
