// volatilityModel.js
// Golden Formula — Volatility Intelligence Engine

export function analyzeVolatility(candles) {
  if (candles.length < 20) return basicVolatility();

  const ranges = candles.map(c => c.high - c.low);
  const atr14 = atr(ranges, 14);

  const closes = candles.map(c => c.close);
  const recent = closes.slice(-20);
  const stdDev = standardDeviation(recent);

  const last = candles[candles.length - 1];
  const price = last.close;

  const atrPercent = price > 0 ? (atr14 / price) * 100 : 0;
  const stdPercent = price > 0 ? (stdDev / price) * 100 : 0;

  const regime =
    atrPercent > 5 || stdPercent > 4 ? "high" :
    atrPercent < 2 && stdPercent < 1.5 ? "low" :
    "normal";

  return {
    atr14,
    atrPercent,
    stdDev,
    stdPercent,
    regime,
  };
}

function atr(ranges, period) {
  if (ranges.length < period) return 0;
  const slice = ranges.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / period;
}

function standardDeviation(series) {
  if (series.length === 0) return 0;
  const mean = series.reduce((a, b) => a + b, 0) / series.length;
  const variance =
    series.reduce((sum, v) => sum + (v - mean) ** 2, 0) / series.length;
  return Math.sqrt(variance);
}

function basicVolatility() {
  return {
    atr14: 0,
    atrPercent: 0,
    stdDev: 0,
    stdPercent: 0,
    regime: "unknown",
  };
}
