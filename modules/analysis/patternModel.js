// /modules/analysis/patternModel.js
// Pattern detection engine for Golden Simulator

export function analyzePatterns(candles, trend, volatility, options = {}) {
  const {
    compressionLookback = 12,
    breakoutLookback = 6,
    reversalLookback = 8,
    flagLookback = 20,
    wedgeLookback = 20,
    compressionThreshold = 0.35,
    breakoutStrengthThreshold = 0.55,
  } = options;

  if (candles.length < 10) return emptyPatterns();

  const compression = detectCompression(candles, compressionLookback, compressionThreshold);
  const breakout = detectBreakoutStructure(candles, trend, breakoutLookback, breakoutStrengthThreshold);
  const reversal = detectReversalStructure(candles, reversalLookback);
  const flag = detectFlagPattern(candles, trend, flagLookback);
  const wedge = detectWedgePattern(candles, wedgeLookback);

  const confidence = computePatternConfidence({ compression, breakout, reversal, flag, wedge });

  return {
    compression,
    breakout,
    reversal,
    flag,
    wedge,
    confidence,
  };
}

// ------------------------------
// Compression
// ------------------------------
function detectCompression(candles, lookback, threshold) {
  const n = Math.min(candles.length, lookback);
  const slice = candles.slice(-n);

  const ranges = slice.map(c => c.high - c.low);
  const maxR = Math.max(...ranges);
  const minR = Math.min(...ranges);

  const ratio = minR / maxR;

  return { active: ratio <= threshold, ratio };
}

// ------------------------------
// Breakout Structure
// ------------------------------
function detectBreakoutStructure(candles, trend, lookback, strengthThreshold) {
  const n = Math.min(candles.length, lookback);
  const slice = candles.slice(-n);

  const last = slice[slice.length - 1];
  const prev = slice[slice.length - 2];

  if (trend.direction === "up") {
    const broke = last.close > prev.high;
    const strength = (last.close - prev.high) / (prev.high - prev.low);
    return { active: broke && strength >= strengthThreshold, strength };
  }

  if (trend.direction === "down") {
    const broke = last.close < prev.low;
    const strength = (prev.low - last.close) / (prev.high - prev.low);
    return { active: broke && strength >= strengthThreshold, strength };
  }

  return { active: false, strength: 0 };
}

// ------------------------------
// Reversal Structure
// ------------------------------
function detectReversalStructure(candles, lookback) {
  const n = Math.min(candles.length, lookback);
  const slice = candles.slice(-n);

  const last = slice[slice.length - 1];
  const prev = slice[slice.length - 2];

  const bullish = last.close > last.open && prev.close < prev.open;
  const bearish = last.close < last.open && prev.close > prev.open;

  return {
    active: bullish || bearish,
    type: bullish ? "bullish" : bearish ? "bearish" : "none",
  };
}

// ------------------------------
// Flag Pattern
// ------------------------------
function detectFlagPattern(candles, trend, lookback) {
  const n = Math.min(candles.length, lookback);
  const slice = candles.slice(-n);

  const highs = slice.map(c => c.high);
  const lows = slice.map(c => c.low);

  const highSlope = computeSlope(highs);
  const lowSlope = computeSlope(lows);

  if (trend.direction === "up") {
    const valid = highSlope < 0 && lowSlope < 0;
    return { active: valid, type: "bull-flag" };
  }

  if (trend.direction === "down") {
    const valid = highSlope > 0 && lowSlope > 0;
    return { active: valid, type: "bear-flag" };
  }

  return { active: false, type: "none" };
}

// ------------------------------
// Wedge Pattern
// ------------------------------
function detectWedgePattern(candles, lookback) {
  const n = Math.min(candles.length, lookback);
  const slice = candles.slice(-n);

  const highs = slice.map(c => c.high);
  const lows = slice.map(c => c.low);

  const highSlope = computeSlope(highs);
  const lowSlope = computeSlope(lows);

  const converging = Math.sign(highSlope) !== Math.sign(lowSlope);

  return {
    active: converging,
    type: converging ? "wedge" : "none",
  };
}

// ------------------------------
// Slope Helper
// ------------------------------
function computeSlope(arr) {
  const n = arr.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = arr[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;

  return (n * sumXY - sumX * sumY) / denom;
}

// ------------------------------
// Pattern Confidence
// ------------------------------
function computePatternConfidence({ compression, breakout, reversal, flag, wedge }) {
  let score = 0;

  if (compression.active) score += 20;
  if (breakout.active) score += 30;
  if (reversal.active) score += 15;
  if (flag.active) score += 20;
  if (wedge.active) score += 15;

  return Math.min(100, score);
}

function emptyPatterns() {
  return {
    compression: { active: false, ratio: 1 },
    breakout: { active: false, strength: 0 },
    reversal: { active: false, type: "none" },
    flag: { active: false, type: "none" },
    wedge: { active: false, type: "none" },
    confidence: 0,
  };
}
