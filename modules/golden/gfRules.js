// gfRules.js
// Golden Formula — Ultra-Advanced Decision Rules Engine
// Fully aligned with integers, even numbers, MA structure, patterns,
// liquidity sweeps, volatility regimes, trend phase, and time-of-day behavior.

export function evaluateGFRules({ candles, trend, patterns, liquidity, volatility, time }) {
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2] ?? last;

  // ------------------------------
  // 1. TRENDLINE PROJECTIONS
  // ------------------------------
  const highs = candles.slice(-30).map(c => c.high);
  const lows = candles.slice(-30).map(c => c.low);

  const trendlineHigh = linearTrend(highs);
  const trendlineLow = linearTrend(lows);

  const breakoutUp = last.close > trendlineHigh * 1.003;
  const breakoutDown = last.close < trendlineLow * 0.997;

  // ------------------------------
  // 2. INTEGER & EVEN-NUMBER LOGIC
  // ------------------------------
  const rn = liquidity.roundNumbers ?? liquidity;

  const nearestEven = Math.round(last.close / 2) * 2;
  const nearestWhole = rn.nearest1;
  const nearestFive = rn.nearest5;
  const nearestTen = rn.nearest10;

  const magnetEven = Math.abs(last.close - nearestEven) <= (last.close * 0.004);
  const magnetWhole = rn.nearWhole;
  const magnetFive = rn.nearFive;
  const magnetTen = rn.nearTen;

  const integerMagnet =
    magnetEven || magnetWhole || magnetFive || magnetTen;

  // ------------------------------
  // 3. MOVING AVERAGE STRUCTURE
  // ------------------------------
  const ma = patterns.ma.structure;
  const maCross = patterns.ma.crosses;

  const strongBullMA =
    ma.stackedBull && trend.direction === "up" && trend.phase.includes("early");

  const strongBearMA =
    ma.stackedBear && trend.direction === "down" && trend.phase.includes("early");

  const bullishCross =
    maCross.ma20_50?.type === "bullish" ||
    maCross.ma50_200?.type === "bullish";

  const bearishCross =
    maCross.ma20_50?.type === "bearish" ||
    maCross.ma50_200?.type === "bearish";

  // ------------------------------
  // 4. PATTERN CONFIRMATION
  // ------------------------------
  const cp = patterns.candles;
  const chart = patterns.chart;

  const bullishPattern =
    cp.engulfingBull ||
    cp.morningStar ||
    cp.hammer ||
    chart.doubleBottom ||
    chart.roundingBottom ||
    chart.flag;

  const bearishPattern =
    cp.engulfingBear ||
    cp.eveningStar ||
    cp.invertedHammer ||
    chart.doubleTop ||
    chart.roundingTop ||
    chart.flag;

  // ------------------------------
  // 5. LIQUIDITY EVENTS
  // ------------------------------
  const sweep = patterns.events.hasStopHunt;
  const liquidityCompression = liquidity.zones?.compressionNearRound;
  const trappedBetweenLevels = liquidity.zones?.trappedBetweenRounds;

  const liquidityBoost =
    sweep ||
    liquidityCompression ||
    trappedBetweenLevels;

  // ------------------------------
  // 6. VOLATILITY REGIME
  // ------------------------------
  const volHigh = volatility.regime === "high" || volatility.regime === "explosive";
  const volLow = volatility.regime === "low";
  const volExpanding = volatility.regimeTrend === "expanding";
  const volContracting = volatility.regimeTrend === "contracting";

  // ------------------------------
  // 7. TIME OF DAY LOGIC
  // ------------------------------
  const spacingMin = time.spacing.minutes;

  const msInDay = 24 * 60 * 60 * 1000;
  const msSinceMidnight = last.timestamp % msInDay;

  const isOpen =
    spacingMin <= 5 &&
    msSinceMidnight < 60 * 60 * 1000;

  const isPowerHour =
    spacingMin <= 5 &&
    msSinceMidnight > (6.5 * 60 * 60 * 1000);

  const timeBoost =
    (isOpen && volExpanding) ||
    (isPowerHour && trend.strength >= 60);

  // ------------------------------
  // 8. DIRECTION DECISION
  // ------------------------------
  let direction = "neutral";

  if (breakoutUp) direction = "long";
  if (breakoutDown) direction = "short";

  if (direction === "neutral") {
    if (strongBullMA || bullishCross || bullishPattern) direction = "long";
    if (strongBearMA || bearishCross || bearishPattern) direction = "short";
  }

  // Liquidity sweeps override neutral
  if (direction === "neutral" && sweep) {
    direction = last.close > prev.close ? "long" : "short";
  }

  // ------------------------------
  // 9. ENTRY, STOP, TARGET
  // ------------------------------
  const entry = last.close;

  const stop =
    direction === "long"
      ? Math.min(last.low, trend.trendlineLow ?? last.low) * 0.995
      : Math.max(last.high, trend.trendlineHigh ?? last.high) * 1.005;

  const target =
    direction === "long"
      ? nearestTen > entry ? nearestTen : nearestTen + 10
      : nearestTen < entry ? nearestTen : nearestTen - 10;

  // ------------------------------
  // 10. RULE CONFIDENCE
  // ------------------------------
  let confidence = 50;

  if (breakoutUp || breakoutDown) confidence += 20;
  if (strongBullMA || strongBearMA) confidence += 15;
  if (bullishPattern || bearishPattern) confidence += 10;
  if (liquidityBoost) confidence += 10;
  if (integerMagnet) confidence += 5;
  if (volExpanding) confidence += 5;
  if (volContracting) confidence -= 5;
  if (volHigh) confidence += 5;
  if (volLow) confidence -= 5;
  if (timeBoost) confidence += 10;

  confidence = Math.max(0, Math.min(100, confidence));

  return {
    direction,
    entry,
    stop,
    target,
    breakoutUp,
    breakoutDown,
    trendlineHigh,
    trendlineLow,
    integerMagnet,
    strongBullMA,
    strongBearMA,
    bullishPattern,
    bearishPattern,
    liquidityBoost,
    volHigh,
    volLow,
    volExpanding,
    volContracting,
    timeBoost,
    confidence,
  };
}

// ------------------------------
// LINEAR TREND UTILITY
// ------------------------------
function linearTrend(series) {
  const n = series.length;
  if (n < 2) return series[n - 1];

  const xMean = (n - 1) / 2;
  const yMean = series.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;

  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (series[i] - yMean);
    den += (i - xMean) ** 2;
  }

  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;

  return slope * (n - 1) + intercept;
}
