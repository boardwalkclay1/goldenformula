// gfRules.js
// Golden Formula — Decision Rules Engine

export function evaluateRules(candles, trend, pattern, liquidity, timing) {
  const last = candles[candles.length - 1];

  // Trendline highs and lows (last 20 candles)
  const highs = candles.slice(-20).map(c => c.high);
  const lows = candles.slice(-20).map(c => c.low);

  const trendlineHigh = linearTrend(highs);
  const trendlineLow = linearTrend(lows);

  const breakoutUp = last.close > trendlineHigh;
  const breakoutDown = last.close < trendlineLow;

  // Target = next integer level
  const target =
    liquidity.nearest10 > last.close
      ? liquidity.nearest10
      : liquidity.nearest10 + 10;

  // Stop = 20% below entry
  const stop = last.close * 0.80;

  const direction =
    breakoutUp ? "long" :
    breakoutDown ? "short" :
    trend.trendBias.includes("up") ? "long" :
    trend.trendBias.includes("down") ? "short" :
    "neutral";

  return {
    breakoutUp,
    breakoutDown,
    trendlineHigh,
    trendlineLow,
    entry: last.close,
    stop,
    target,
    direction
  };
}

function linearTrend(series) {
  const n = series.length;
  const xMean = (n - 1) / 2;
  const yMean = series.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;

  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (series[i] - yMean);
    den += (i - xMean) ** 2;
  }

  const slope = num / den;
  const intercept = yMean - slope * xMean;

  return slope * (n - 1) + intercept;
}
