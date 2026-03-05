// trendModel.js
// Golden Formula — Trend Intelligence Engine

export function analyzeTrend(candles) {
  if (candles.length < 20) return basicFlatTrend();

  const closes = candles.map(c => c.close);
  const last = candles[candles.length - 1];

  const shortWindow = closes.slice(-10);
  const longWindow = closes.slice(-30);

  const shortSlope = linearSlope(shortWindow);
  const longSlope = linearSlope(longWindow);

  const maSmall = last.maSmall;
  const maMedium = last.maMedium;
  const maBig = last.maBig;

  const stackedBull = maSmall > maMedium && maMedium > maBig;
  const stackedBear = maSmall < maMedium && maMedium < maBig;

  const trendBias =
    stackedBull && shortSlope > 0 ? "strong_up" :
    stackedBear && shortSlope < 0 ? "strong_down" :
    shortSlope > 0 ? "up" :
    shortSlope < 0 ? "down" :
    "sideways";

  return {
    trendBias,
    shortSlope,
    longSlope,
    stackedBull,
    stackedBear,
    aboveAllMA: last.close > maSmall && last.close > maMedium && last.close > maBig,
    belowAllMA: last.close < maSmall && last.close < maMedium && last.close < maBig,
  };
}

function linearSlope(series) {
  if (series.length < 2) return 0;
  const n = series.length;
  const xMean = (n - 1) / 2;
  const yMean = series.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const x = i;
    const y = series[i];
    num += (x - xMean) * (y - yMean);
    den += (x - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

function basicFlatTrend() {
  return {
    trendBias: "unknown",
    shortSlope: 0,
    longSlope: 0,
    stackedBull: false,
    stackedBear: false,
    aboveAllMA: false,
    belowAllMA: false,
  };
}
