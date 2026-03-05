// gfTiming.js
// Golden Formula — Market Timing Engine

export function analyzeTiming(candles, liquidity) {
  const last = candles[candles.length - 1];
  const time = last.time; // HH:MM format

  const burstWindow = time >= "09:30" && time <= "10:00";
  const trendWindow = time > "10:00";

  const nearWhole = liquidity.nearWhole || liquidity.nearFive || liquidity.nearTen;
  const near200 = Math.abs(last.close - last.maBig) <= liquidity.tickSize * 4;

  const maCluster =
    Math.abs(last.maSmall - last.maMedium) < liquidity.tickSize * 2 &&
    Math.abs(last.maMedium - last.maBig) < liquidity.tickSize * 2;

  return {
    burstWindow,
    trendWindow,
    nearWhole,
    near200,
    maCluster,
    expectedBehavior:
      burstWindow ? "short_burst" :
      trendWindow ? "trend_follow" :
      "neutral"
  };
}
