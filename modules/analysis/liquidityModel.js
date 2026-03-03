// liquidityModel.js
// Advanced liquidity analysis for Golden Simulator
// Input: candles[] from candleExtractor
// Output: liquidity object with swing points, sweeps, equal highs/lows, FVGs, zones, confidence

export function analyzeLiquidity(candles, options = {}) {
  const {
    swingLookback = 3,
    equalTolerance = 0.0008,
    sweepLookback = 12,
    fvgLookback = 20,
    imbalanceThreshold = 0.35,
  } = options;

  if (candles.length < 5) return emptyLiquidity();

  // 1. Swing highs/lows
  const swings = detectSwings(candles, swingLookback);

  // 2. Equal highs/lows
  const equalLevels = detectEqualLevels(swings, equalTolerance);

  // 3. Liquidity sweeps
  const sweeps = detectSweeps(candles, swings, sweepLookback);

  // 4. Fair Value Gaps (FVGs)
  const fvgs = detectFVGs(candles, fvgLookback);

  // 5. Imbalance zones
  const imbalances = detectImbalances(candles, imbalanceThreshold);

  // 6. Confidence score
  const confidence = computeLiquidityConfidence({
    swings,
    equalLevels,
    sweeps,
    fvgs,
    imbalances,
  });

  return {
    swings,
    equalLevels,
    sweeps,
    fvgs,
    imbalances,
    confidence,
  };
}

// ---------------------------
// Swing Highs / Lows
// ---------------------------

function detectSwings(candles, lookback) {
  const swings = [];

  for (let i = lookback; i < candles.length - lookback; i++) {
    const c = candles[i];
    const left = candles.slice(i - lookback, i);
    const right = candles.slice(i + 1, i + 1 + lookback);

    const isHigh =
      c.high > Math.max(...left.map(x => x.high)) &&
      c.high > Math.max(...right.map(x => x.high));

    const isLow =
      c.low < Math.min(...left.map(x => x.low)) &&
      c.low < Math.min(...right.map(x => x.low));

    if (isHigh) swings.push({ index: i, type: "high", price: c.high });
    if (isLow) swings.push({ index: i, type: "low", price: c.low });
  }

  return swings;
}

// ---------------------------
// Equal Highs / Lows
// ---------------------------

function detectEqualLevels(swings, tolerance) {
  const equal = [];

  for (let i = 0; i < swings.length; i++) {
    for (let j = i + 1; j < swings.length; j++) {
      if (swings[i].type !== swings[j].type) continue;

      const p1 = swings[i].price;
      const p2 = swings[j].price;

      const diff = Math.abs(p1 - p2) / ((p1 + p2) / 2);

      if (diff <= tolerance) {
        equal.push({
          type: swings[i].type,
          price: (p1 + p2) / 2,
          indices: [swings[i].index, swings[j].index],
        });
      }
    }
  }

  return equal;
}

// ---------------------------
// Liquidity Sweeps
// ---------------------------

function detectSweeps(candles, swings, lookback) {
  const sweeps = [];

  for (const s of swings) {
    const start = Math.max(0, s.index - lookback);
    const end = s.index + lookback;

    const slice = candles.slice(start, end);

    if (s.type === "high") {
      const maxHigh = Math.max(...slice.map(c => c.high));
      if (maxHigh > s.price) {
        sweeps.push({
          type: "high-sweep",
          index: s.index,
          sweptPrice: maxHigh,
          originalPrice: s.price,
        });
      }
    }

    if (s.type === "low") {
      const minLow = Math.min(...slice.map(c => c.low));
      if (minLow < s.price) {
        sweeps.push({
          type: "low-sweep",
          index: s.index,
          sweptPrice: minLow,
          originalPrice: s.price,
        });
      }
    }
  }

  return sweeps;
}

// ---------------------------
// Fair Value Gaps (FVG)
// ---------------------------

function detectFVGs(candles, lookback) {
  const fvgs = [];

  for (let i = 2; i < candles.length; i++) {
    const c0 = candles[i - 2];
    const c1 = candles[i - 1];
    const c2 = candles[i];

    // Bullish FVG
    if (c0.high < c2.low) {
      fvgs.push({
        type: "bullish",
        startIndex: i - 2,
        endIndex: i,
        gapTop: c2.low,
        gapBottom: c0.high,
      });
    }

    // Bearish FVG
    if (c0.low > c2.high) {
      fvgs.push({
        type: "bearish",
        startIndex: i - 2,
        endIndex: i,
        gapTop: c0.low,
        gapBottom: c2.high,
      });
    }
  }

  return fvgs.slice(-lookback);
}

// ---------------------------
// Imbalances
// ---------------------------

function detectImbalances(candles, threshold) {
  const zones = [];

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];

    const bodyPrev = Math.abs(prev.open - prev.close);
    const bodyCurr = Math.abs(c.open - c.close);

    if (bodyCurr > bodyPrev * (1 + threshold)) {
      zones.push({
        index: i,
        type: c.isBull ? "bullish" : "bearish",
        price: c.close,
        strength: bodyCurr / bodyPrev,
      });
    }
  }

  return zones;
}

// ---------------------------
// Confidence
// ---------------------------

function computeLiquidityConfidence({ swings, equalLevels, sweeps, fvgs, imbalances }) {
  let score = 0;

  score += Math.min(30, swings.length * 2);
  score += Math.min(20, equalLevels.length * 5);
  score += Math.min(25, sweeps.length * 6);
  score += Math.min(15, fvgs.length * 3);
  score += Math.min(10, imbalances.length * 2);

  return Math.max(0, Math.min(100, score));
}

function emptyLiquidity() {
  return {
    swings: [],
    equalLevels: [],
    sweeps: [],
    fvgs: [],
    imbalances: [],
    confidence: 0,
  };
}
