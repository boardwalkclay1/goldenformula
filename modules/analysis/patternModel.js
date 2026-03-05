// patternModel.js
// Golden Formula — Pattern Intelligence Engine

export function analyzePatterns(candles, trend, volatility) {
  const patterns = {
    roundLevels: detectRoundLevels(candles),
    maStructure: detectMAStructure(candles),
    maCross: detectMACross(candles),
    candlePatterns: detectCandlePatterns(candles),
    chartPatterns: detectChartPatterns(candles),
  };

  return patterns;
}

// ------------------------------
// ROUND NUMBER + INTEGER LOGIC
// ------------------------------
function detectRoundLevels(candles) {
  const last = candles[candles.length - 1];
  const price = last.close;

  const nearest1 = Math.round(price);
  const nearest5 = Math.round(price / 5) * 5;
  const nearest10 = Math.round(price / 10) * 10;

  const distance1 = Math.abs(price - nearest1);
  const distance5 = Math.abs(price - nearest5);
  const distance10 = Math.abs(price - nearest10);

  return {
    price,
    nearest1,
    nearest5,
    nearest10,
    distance1,
    distance5,
    distance10,
    isNear1: distance1 <= 0.05,
    isNear5: distance5 <= 0.10,
    isNear10: distance10 <= 0.15,
  };
}

// ------------------------------
// MOVING AVERAGE STRUCTURE
// ------------------------------
function detectMAStructure(candles) {
  const last = candles[candles.length - 1];

  const small = last.maSmall;
  const medium = last.maMedium;
  const big = last.maBig;

  return {
    aboveSmall: last.close > small,
    aboveMedium: last.close > medium,
    aboveBig: last.close > big,
    belowSmall: last.close < small,
    belowMedium: last.close < medium,
    belowBig: last.close < big,
    stackedBull: small > medium && medium > big,
    stackedBear: small < medium && medium < big,
  };
}

// ------------------------------
// MOVING AVERAGE CROSS DETECTION
// ------------------------------
function detectMACross(candles) {
  if (candles.length < 3) return null;

  const prev = candles[candles.length - 2];
  const last = candles[candles.length - 1];

  const crossUp =
    prev.maSmall < prev.maBig && last.maSmall > last.maBig;

  const crossDown =
    prev.maSmall > prev.maBig && last.maSmall < last.maBig;

  return {
    crossUp,
    crossDown,
    type: crossUp ? "bullish" : crossDown ? "bearish" : "none",
  };
}

// ------------------------------
// CANDLE PATTERNS
// ------------------------------
function detectCandlePatterns(candles) {
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];

  const body = Math.abs(last.close - last.open);
  const range = last.high - last.low;
  const upperWick = last.high - Math.max(last.close, last.open);
  const lowerWick = Math.min(last.close, last.open) - last.low;

  const hammer =
    lowerWick > body * 2 && upperWick < body * 0.5;

  const invertedHammer =
    upperWick > body * 2 && lowerWick < body * 0.5;

  const engulfingBull =
    last.close > last.open &&
    prev.close < prev.open &&
    last.close > prev.open &&
    last.open < prev.close;

  const engulfingBear =
    last.close < last.open &&
    prev.close > prev.open &&
    last.open > prev.close &&
    last.close < prev.open;

  return {
    hammer,
    invertedHammer,
    engulfingBull,
    engulfingBear,
  };
}

// ------------------------------
// CHART PATTERNS (DOUBLE TOP, FLAG, ROUNDING BOTTOM)
// ------------------------------
function detectChartPatterns(candles) {
  const len = candles.length;
  if (len < 20) return {};

  const closes = candles.map(c => c.close);

  const last = closes[len - 1];
  const prev = closes[len - 2];

  // Double Top
  const high1 = Math.max(...closes.slice(len - 20, len - 10));
  const high2 = Math.max(...closes.slice(len - 10, len));

  const doubleTop =
    Math.abs(high1 - high2) / high1 < 0.01 &&
    last < prev;

  // Rounding Bottom
  const mid = Math.floor(len / 2);
  const left = closes.slice(0, mid);
  const right = closes.slice(mid);

  const roundingBottom =
    Math.min(...left) < Math.min(...right) &&
    Math.max(...right) > Math.max(...left);

  // Flag (simple version)
  const recent = closes.slice(len - 10);
  const trendUp = recent[0] < recent[recent.length - 1];
  const pullback = recent[recent.length - 1] < recent[recent.length - 3];

  const flag = trendUp && pullback;

  return {
    doubleTop,
    roundingBottom,
    flag,
  };
}
