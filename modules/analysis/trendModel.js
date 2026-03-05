// trendModel.js
// Hyper-advanced trend analysis for Golden Simulator
// Input: candles[] from candleExtractor
// Output: trend object with slope, direction, momentum, exhaustion, confidence, MA structure

export function analyzeTrend(candles, options = {}) {
  const {
    slopeLookback = 20,
    momentumLookback = 10,
    pullbackLookback = 12,
    exhaustionLookback = 8,
    minSlopeStrength = 0.0004,
    minMomentumStrength = 0.55,

    // NEW: MA settings
    shortMALength = 9,
    longMALength = 21,
    maCrossLookback = 30,
  } = options;

  if (candles.length < 5) {
    return emptyTrend();
  }

  // 1. Extract mid-prices for smoother trend detection
  const mids = candles.map(c => (c.high + c.low) / 2);

  // 2. Compute slope using linear regression over last N candles
  const slope = computeSlope(mids, slopeLookback);

  // 3. Determine trend direction
  const direction =
    slope > minSlopeStrength ? "up" :
    slope < -minSlopeStrength ? "down" :
    "sideways";

  // 4. Compute momentum (rate of change)
  const momentum = computeMomentum(mids, momentumLookback);

  // 5. Compute pullback depth (retracement against trend)
  const pullback = computePullback(candles, direction, pullbackLookback);

  // 6. Detect exhaustion (loss of trend strength)
  const exhaustion = computeExhaustion(mids, exhaustionLookback);

  // 7. Moving Averages + Crosses (NEW)
  const closes = candles.map(c => c.close);
  const maShort = computeSMA(closes, shortMALength);
  const maLong = computeSMA(closes, longMALength);

  const ma = {
    shortLength: shortMALength,
    longLength: longMALength,
    short: maShort,
    long: maLong,
    lastCross: detectLastCross(maShort, maLong, maCrossLookback),
    slope: {
      short: computeMASlope(maShort),
      long: computeMASlope(maLong),
    },
  };

  // 8. Compute confidence score
  const confidence = computeTrendConfidence({
    slope,
    momentum,
    pullback,
    exhaustion,
    direction,
    minSlopeStrength,
    minMomentumStrength,
  });

  return {
    direction,
    slope,
    momentum,
    pullback,
    exhaustion,
    confidence,
    lastPrice: mids[mids.length - 1],
    ma, // NEW: full MA structure for rules, narrative, timing
  };
}

// ---------------------------
// Slope (Linear Regression)
// ---------------------------

function computeSlope(values, lookback) {
  const n = Math.min(values.length, lookback);
  if (n < 3) return 0;

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = values[values.length - n + i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;

  return (n * sumXY - sumX * sumY) / denom;
}

// ---------------------------
// Momentum
// ---------------------------

function computeMomentum(values, lookback) {
  const n = Math.min(values.length, lookback);
  if (n < 2) return 0;

  const start = values[values.length - n];
  const end = values[values.length - 1];

  return (end - start) / start;
}

// ---------------------------
// Pullback Depth
// ---------------------------

function computePullback(candles, direction, lookback) {
  const n = Math.min(candles.length, lookback);
  const slice = candles.slice(candles.length - n);

  if (direction === "up") {
    const recentHigh = Math.max(...slice.map(c => c.high));
    const lastClose = slice[slice.length - 1].close;
    return (recentHigh - lastClose) / recentHigh;
  }

  if (direction === "down") {
    const recentLow = Math.min(...slice.map(c => c.low));
    const lastClose = slice[slice.length - 1].close;
    return (lastClose - recentLow) / recentLow;
  }

  return 0;
}

// ---------------------------
// Exhaustion
// ---------------------------

function computeExhaustion(values, lookback) {
  const n = Math.min(values.length, lookback);
  if (n < 4) return 0;

  const slice = values.slice(values.length - n);
  const diffs = [];

  for (let i = 1; i < slice.length; i++) {
    diffs.push(slice[i] - slice[i - 1]);
  }

  const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const last = diffs[diffs.length - 1];

  return Math.abs(last) < Math.abs(avg * 0.4) ? 1 : 0;
}

// ---------------------------
// Moving Averages (NEW)
// ---------------------------

function computeSMA(values, length) {
  if (values.length < length) return [];
  const out = [];
  let sum = 0;

  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= length) {
      sum -= values[i - length];
    }
    if (i >= length - 1) {
      out.push(sum / length);
    }
  }

  return out;
}

function detectLastCross(shortMA, longMA, lookback) {
  const n = Math.min(shortMA.length, longMA.length, lookback);
  if (n < 3) {
    return { type: "none", candlesAgo: null };
  }

  const offsetShort = shortMA.length - n;
  const offsetLong = longMA.length - n;

  let lastType = "none";
  let lastIndex = null;

  for (let i = 1; i < n; i++) {
    const prevShort = shortMA[offsetShort + i - 1];
    const prevLong = longMA[offsetLong + i - 1];
    const currShort = shortMA[offsetShort + i];
    const currLong = longMA[offsetLong + i];

    const prevDiff = prevShort - prevLong;
    const currDiff = currShort - currLong;

    if (prevDiff <= 0 && currDiff > 0) {
      lastType = "bullish";
      lastIndex = i;
    } else if (prevDiff >= 0 && currDiff < 0) {
      lastType = "bearish";
      lastIndex = i;
    }
  }

  if (lastType === "none") {
    return { type: "none", candlesAgo: null };
  }

  const candlesAgo = n - 1 - lastIndex;
  return { type: lastType, candlesAgo };
}

function computeMASlope(maArray) {
  if (maArray.length < 3) return "flat";

  const last = maArray[maArray.length - 1];
  const prev = maArray[maArray.length - 3];
  const diff = last - prev;

  const threshold = Math.abs(last) * 0.0005 || 0.0005;

  if (diff > threshold) return "up";
  if (diff < -threshold) return "down";
  return "flat";
}

// ---------------------------
// Confidence
// ---------------------------

function computeTrendConfidence(params) {
  const {
    slope,
    momentum,
    pullback,
    exhaustion,
    direction,
    minSlopeStrength,
    minMomentumStrength,
  } = params;

  if (direction === "sideways") return 20;

  let score = 0;

  // Slope strength
  score += Math.min(50, Math.abs(slope) / minSlopeStrength * 30);

  // Momentum
  score += Math.min(30, Math.abs(momentum) / minMomentumStrength * 20);

  // Pullback (less pullback = stronger trend)
  score += Math.max(0, 20 - pullback * 100);

  // Exhaustion penalty
  if (exhaustion === 1) score -= 25;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function emptyTrend() {
  return {
    direction: "sideways",
    slope: 0,
    momentum: 0,
    pullback: 0,
    exhaustion: 0,
    confidence: 0,
    lastPrice: null,
    ma: {
      shortLength: null,
      longLength: null,
      short: [],
      long: [],
      lastCross: { type: "none", candlesAgo: null },
      slope: { short: "flat", long: "flat" },
    },
  };
}
