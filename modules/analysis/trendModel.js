// trendModel.js
// Hyper-advanced trend analysis for Golden Simulator
// Input: candles[] from candleExtractor
// Output: trend object with slope, direction, momentum, exhaustion, confidence

export function analyzeTrend(candles, options = {}) {
  const {
    slopeLookback = 20,
    momentumLookback = 10,
    pullbackLookback = 12,
    exhaustionLookback = 8,
    minSlopeStrength = 0.0004,
    minMomentumStrength = 0.55,
  } = options;

  if (candles.length < 5) {
    return emptyTrend();
  }

  // 1. Extract mid-prices for smoother trend detection
  const mids = candles.map(c => (c.high + c.low) / 2);

  // 2. Compute slope using linear regression over last N candles
  const slope = computeSlope(mids, slopeLookback);

  // 3. Determine trend direction
  const direction = slope > minSlopeStrength ? "up"
                  : slope < -minSlopeStrength ? "down"
                  : "sideways";

  // 4. Compute momentum (rate of change)
  const momentum = computeMomentum(mids, momentumLookback);

  // 5. Compute pullback depth (retracement against trend)
  const pullback = computePullback(candles, direction, pullbackLookback);

  // 6. Detect exhaustion (loss of trend strength)
  const exhaustion = computeExhaustion(mids, exhaustionLookback);

  // 7. Compute confidence score
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
  };
}
