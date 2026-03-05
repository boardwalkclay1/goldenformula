// volatilityModel.js
// Golden Formula — Volatility, Regime & Structure Intelligence Engine

export function analyzeVolatility(candles = []) {
  if (!candles.length || candles.length < 10) return basicVolatility();

  const ranges = candles.map(c => safeNumber(c.high) - safeNumber(c.low));
  const closes = candles.map(c => safeNumber(c.close));

  const atr14 = atr(ranges, 14);
  const atr30 = atr(ranges, 30);
  const std20 = standardDeviation(closes.slice(-20));
  const std50 = standardDeviation(closes.slice(-50));

  const last = candles[candles.length - 1];
  const price = safeNumber(last.close);

  const atrPercent = price > 0 ? (atr14 / price) * 100 : 0;
  const atrPercentLong = price > 0 ? (atr30 / price) * 100 : 0;
  const stdPercent = price > 0 ? (std20 / price) * 100 : 0;
  const stdPercentLong = price > 0 ? (std50 / price) * 100 : 0;

  const regime = classifyRegime(atrPercent, stdPercent);
  const regimeTrend = classifyRegimeTrend(atrPercent, atrPercentLong, stdPercent, stdPercentLong);

  const structure = detectVolatilityStructure(candles, ranges);
  const integration = {
    withTrend: null, // to be filled by higher-level orchestrator
    withLiquidity: null, // same
  };

  const score = volatilityScore({
    atrPercent,
    stdPercent,
    regime,
    structure,
  });

  return {
    atr: {
      value: atr14,
      longValue: atr30,
      percent: atrPercent,
      longPercent: atrPercentLong,
    },
    std: {
      value: std20,
      longValue: std50,
      percent: stdPercent,
      longPercent: stdPercentLong,
    },
    regime,
    regimeTrend,
    structure,
    integration,
    score,
    narrative: buildVolatilityNarrative({ regime, regimeTrend, structure, score }),
  };
}

function classifyRegime(atrPercent, stdPercent) {
  if (atrPercent > 8 || stdPercent > 6) return "explosive";
  if (atrPercent > 5 || stdPercent > 4) return "high";
  if (atrPercent < 2 && stdPercent < 1.5) return "low";
  return "normal";
}

function classifyRegimeTrend(atrPercent, atrLong, stdPercent, stdLong) {
  const atrTrend = atrPercent > atrLong * 1.2 ? "rising" :
                   atrPercent < atrLong * 0.8 ? "falling" : "flat";

  const stdTrend = stdPercent > stdLong * 1.2 ? "rising" :
                   stdPercent < stdLong * 0.8 ? "falling" : "flat";

  if (atrTrend === "rising" || stdTrend === "rising") return "expanding";
  if (atrTrend === "falling" && stdTrend === "falling") return "contracting";
  return "stable";
}

function detectVolatilityStructure(candles, ranges) {
  const recent = candles.slice(-30);
  const recentRanges = ranges.slice(-30);
  if (recent.length < 5) {
    return {
      expansion: false,
      compression: false,
      wickDominant: false,
      bodyDominant: false,
      clusters: [],
      voids: [],
      traps: [],
    };
  }

  const avgRange = average(recentRanges);
  const clusters = [];
  const voids = [];
  const traps = [];

  for (let i = 1; i < recent.length; i++) {
    const c = recent[i];
    const prev = recent[i - 1];
    const range = recentRanges[i];
    const prevRange = recentRanges[i - 1];

    const gapUp = c.low > prev.high * 1.01;
    const gapDown = c.high < prev.low * 0.99;

    if (range > avgRange * 1.5 && prevRange > avgRange * 1.5) {
      clusters.push({
        index: candles.length - recent.length + i,
        type: "high_vol_cluster",
      });
    }

    if (gapUp || gapDown) {
      voids.push({
        index: candles.length - recent.length + i,
        type: gapUp ? "gap_up" : "gap_down",
      });
    }

    const body = Math.abs(c.close - c.open);
    const upperWick = c.high - Math.max(c.close, c.open);
    const lowerWick = Math.min(c.close, c.open) - c.low;

    const longWick = upperWick > body * 1.5 || lowerWick > body * 1.5;
    const next = recent[i + 1];
    if (longWick && next) {
      const direction = c.close > c.open ? "up" : "down";
      const nextDir = next.close > next.open ? "up" : "down";
      if (direction !== nextDir) {
        traps.push({
          index: candles.length - recent.length + i,
          type: "wick_trap",
        });
      }
    }
  }

  const last = recent[recent.length - 1];
  const lastRange = recentRanges[recentRanges.length - 1];
  const prevRange = recentRanges[recentRanges.length - 2] || lastRange;
  const expansion = lastRange > prevRange * 1.5;
  const compression = lastRange < prevRange * 0.7;

  const wickBodyStats = recent.map(c => {
    const body = Math.abs(c.close - c.open);
    const upperWick = c.high - Math.max(c.close, c.open);
    const lowerWick = Math.min(c.close, c.open) - c.low;
    return { body, wick: upperWick + lowerWick };
  });

  const avgBody = average(wickBodyStats.map(x => x.body));
  const avgWick = average(wickBodyStats.map(x => x.wick));

  const wickDominant = avgWick > avgBody * 1.3;
  const bodyDominant = avgBody > avgWick * 1.3;

  return {
    expansion,
    compression,
    wickDominant,
    bodyDominant,
    clusters,
    voids,
    traps,
  };
}

function volatilityScore({ atrPercent, stdPercent, regime, structure }) {
  let score = 50;

  if (regime === "explosive") score += 20;
  if (regime === "high") score += 10;
  if (regime === "low") score -= 10;

  if (structure.expansion) score += 10;
  if (structure.compression) score -= 5;

  if (structure.wickDominant) score += 5;
  if (structure.bodyDominant) score += 5;

  if (structure.clusters.length) score += 5;
  if (structure.voids.length) score -= 5;
  if (structure.traps.length) score += 5;

  if (atrPercent > 10 || stdPercent > 8) score += 10;

  return Math.max(0, Math.min(100, score));
}

function buildVolatilityNarrative({ regime, regimeTrend, structure, score }) {
  const tags = [];

  tags.push(`vol_regime_${regime}`);
  tags.push(`vol_trend_${regimeTrend}`);
  tags.push(score >= 70 ? "vol_high_impact" : score <= 30 ? "vol_low_impact" : "vol_moderate_impact");

  if (structure.expansion) tags.push("vol_expansion");
  if (structure.compression) tags.push("vol_compression");
  if (structure.wickDominant) tags.push("vol_wick_dominant");
  if (structure.bodyDominant) tags.push("vol_body_dominant");
  if (structure.traps.length) tags.push("vol_traps_present");

  return { tags };
}

// --------------- helpers ---------------

function atr(ranges, period) {
  if (!ranges.length || ranges.length < period) return 0;
  const slice = ranges.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / period;
}

function standardDeviation(series) {
  if (!series.length) return 0;
  const mean = series.reduce((a, b) => a + b, 0) / series.length;
  const variance =
    series.reduce((sum, v) => sum + (v - mean) ** 2, 0) / series.length;
  return Math.sqrt(variance);
}

function average(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function basicVolatility() {
  return {
    atr: {
      value: 0,
      longValue: 0,
      percent: 0,
      longPercent: 0,
    },
    std: {
      value: 0,
      longValue: 0,
      percent: 0,
      longPercent: 0,
    },
    regime: "unknown",
    regimeTrend: "stable",
    structure: {
      expansion: false,
      compression: false,
      wickDominant: false,
      bodyDominant: false,
      clusters: [],
      voids: [],
      traps: [],
    },
    integration: {
      withTrend: null,
      withLiquidity: null,
    },
    score: 0,
    narrative: { tags: [] },
  };
}
