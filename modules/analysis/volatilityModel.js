// volatilityModel.js
// Advanced volatility analysis for Golden Simulator
// Input: candles[] from candleExtractor
// Output: volatility object with ATR, expansion, compression, regime, confidence

export function analyzeVolatility(candles, options = {}) {
  const {
    atrLookback = 14,
    expansionLookback = 10,
    compressionLookback = 10,
    regimeThresholdHigh = 1.8,
    regimeThresholdLow = 0.65,
  } = options;

  if (candles.length < 5) {
    return emptyVolatility();
  }

  // 1. Compute true ranges
  const trs = computeTrueRanges(candles);

  // 2. Compute ATR
  const atr = computeATR(trs, atrLookback);

  // 3. Expansion (volatility increasing)
  const expansion = computeExpansion(trs, expansionLookback);

  // 4. Compression (volatility decreasing)
  const compression = computeCompression(trs, compressionLookback);

  // 5. Volatility regime
  const regime = classifyRegime(atr, trs, regimeThresholdHigh, regimeThresholdLow);

  // 6. Confidence score
  const confidence = computeVolatilityConfidence({
    atr,
    expansion,
    compression,
    regime,
  });

  return {
    atr,
    expansion,
    compression,
    regime,
    confidence,
  };
}

// ---------------------------
// True Range
// ---------------------------

function computeTrueRanges(candles) {
  const trs = [];

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];

    const highLow = c.high - c.low;
    const highPrevClose = Math.abs(c.high - prev.close);
    const lowPrevClose = Math.abs(c.low - prev.close);

    trs.push(Math.max(highLow, highPrevClose, lowPrevClose));
  }

  return trs;
}

// ---------------------------
// ATR
// ---------------------------

function computeATR(trs, lookback) {
  const n = Math.min(trs.length, lookback);
  if (n === 0) return 0;

  const slice = trs.slice(trs.length - n);
  return slice.reduce((a, b) => a + b, 0) / n;
}

// ---------------------------
// Expansion
// ---------------------------

function computeExpansion(trs, lookback) {
  const n = Math.min(trs.length, lookback);
  if (n < 3) return 0;

  const slice = trs.slice(trs.length - n);
  const first = slice[0];
  const last = slice[slice.length - 1];

  return (last - first) / first;
}

// ---------------------------
// Compression
// ---------------------------

function computeCompression(trs, lookback) {
  const n = Math.min(trs.length, lookback);
  if (n < 3) return 0;

  const slice = trs.slice(trs.length - n);
  const maxVal = Math.max(...slice);
  const minVal = Math.min(...slice);

  return (maxVal - minVal) / maxVal;
}

// ---------------------------
// Regime Classification
// ---------------------------

function classifyRegime(atr, trs, highThresh, lowThresh) {
  const lastTR = trs[trs.length - 1];
  const ratio = lastTR / atr;

  if (ratio > highThresh) return "high-volatility";
  if (ratio < lowThresh) return "low-volatility";
  return "normal";
}

// ---------------------------
// Confidence
// ---------------------------

function computeVolatilityConfidence({ atr, expansion, compression, regime }) {
  let score = 0;

  // ATR magnitude
  score += Math.min(40, atr * 10);

  // Expansion
  if (expansion > 0) score += Math.min(30, expansion * 100);

  // Compression penalty
  score -= Math.min(20, compression * 80);

  // Regime bonus
  if (regime === "high-volatility") score += 20;
  if (regime === "low-volatility") score -= 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function emptyVolatility() {
  return {
    atr: 0,
    expansion: 0,
    compression: 0,
    regime: "normal",
    confidence: 0,
  };
}
