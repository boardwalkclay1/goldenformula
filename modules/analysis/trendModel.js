// trendModel.js
// Golden Formula — Multi-Window Trend & Structure Intelligence Engine

export function analyzeTrend(candles = []) {
  if (!candles.length || candles.length < 10) return basicFlatTrend();

  const closes = candles.map(c => safeNumber(c.close));
  const last = candles[candles.length - 1];

  const shortSeries = closes.slice(-10);
  const mediumSeries = closes.slice(-30);
  const longSeries = closes.slice(-100);

  const shortSlope = linearSlope(shortSeries);
  const mediumSlope = linearSlope(mediumSeries);
  const longSlope = linearSlope(longSeries);

  const slopeVelocity = shortSlope - mediumSlope;
  const slopeCurvature = mediumSlope - longSlope;

  const ma = normalizeMAs(last);
  const structure = detectTrendStructure(candles);
  const direction = classifyDirection(shortSlope, mediumSlope, longSlope, ma, structure);
  const phase = classifyTrendPhase(shortSlope, mediumSlope, longSlope, slopeVelocity, slopeCurvature);
  const strength = trendStrengthScore({ shortSlope, mediumSlope, longSlope, ma, structure });

  const session = detectTrendBySession(candles);

  return {
    direction, // up, down, sideways
    phase, // early_uptrend, late_downtrend, exhaustion, etc.
    strength, // 0–100
    slopes: {
      short: shortSlope,
      medium: mediumSlope,
      long: longSlope,
      velocity: slopeVelocity,
      curvature: slopeCurvature,
    },
    structure,
    ma,
    session,
    narrative: buildTrendNarrative({ direction, phase, strength, structure, ma }),
  };
}

function normalizeMAs(last) {
  const ma20 = safeNumber(last.ma20 ?? last.maSmall);
  const ma50 = safeNumber(last.ma50 ?? last.maMedium);
  const ma200 = safeNumber(last.ma200 ?? last.maBig);
  const close = safeNumber(last.close);

  const stackedBull = ma20 > ma50 && ma50 > ma200;
  const stackedBear = ma20 < ma50 && ma50 < ma200;

  const compression =
    Math.abs(ma20 - ma50) / (close || 1) < 0.005 &&
    Math.abs(ma50 - ma200) / (close || 1) < 0.01;

  const expansion =
    Math.abs(ma20 - ma50) / (close || 1) > 0.02 ||
    Math.abs(ma50 - ma200) / (close || 1) > 0.03;

  const flattening =
    Math.abs(ma20 - close) / (close || 1) < 0.005 &&
    Math.abs(ma50 - close) / (close || 1) < 0.01;

  return {
    ma20,
    ma50,
    ma200,
    stackedBull,
    stackedBear,
    aboveAll: close > ma20 && close > ma50 && close > ma200,
    belowAll: close < ma20 && close < ma50 && close < ma200,
    compression,
    expansion,
    flattening,
  };
}

function detectTrendStructure(candles) {
  const closes = candles.map(c => safeNumber(c.close));
  if (closes.length < 6) {
    return {
      higherHighs: false,
      higherLows: false,
      lowerHighs: false,
      lowerLows: false,
      equalHighs: false,
      equalLows: false,
      swingPoints: [],
    };
  }

  const swingPoints = [];
  for (let i = 2; i < closes.length - 2; i++) {
    const prev2 = closes[i - 2];
    const prev1 = closes[i - 1];
    const curr = closes[i];
    const next1 = closes[i + 1];
    const next2 = closes[i + 2];

    const isHigh = curr > prev1 && curr > prev2 && curr > next1 && curr > next2;
    const isLow = curr < prev1 && curr < prev2 && curr < next1 && curr < next2;

    if (isHigh) swingPoints.push({ index: i, type: "high", value: curr });
    if (isLow) swingPoints.push({ index: i, type: "low", value: curr });
  }

  const highs = swingPoints.filter(s => s.type === "high");
  const lows = swingPoints.filter(s => s.type === "low");

  const higherHighs = sequenceTrend(highs.map(h => h.value)) === "up";
  const lowerHighs = sequenceTrend(highs.map(h => h.value)) === "down";
  const equalHighs = sequenceTrend(highs.map(h => h.value)) === "flat";

  const higherLows = sequenceTrend(lows.map(l => l.value)) === "up";
  const lowerLows = sequenceTrend(lows.map(l => l.value)) === "down";
  const equalLows = sequenceTrend(lows.map(l => l.value)) === "flat";

  return {
    higherHighs,
    higherLows,
    lowerHighs,
    lowerLows,
    equalHighs,
    equalLows,
    swingPoints,
  };
}

function classifyDirection(shortSlope, mediumSlope, longSlope, ma, structure) {
  const s = shortSlope;
  const m = mediumSlope;
  const l = longSlope;

  if (ma.stackedBull && s > 0 && m > 0 && l > 0) return "up";
  if (ma.stackedBear && s < 0 && m < 0 && l < 0) return "down";

  if (s > 0 && (structure.higherHighs || structure.higherLows)) return "up";
  if (s < 0 && (structure.lowerHighs || structure.lowerLows)) return "down";

  if (Math.abs(s) < 0.0005 && Math.abs(m) < 0.0005) return "sideways";

  return s > 0 ? "up" : s < 0 ? "down" : "sideways";
}

function classifyTrendPhase(shortSlope, mediumSlope, longSlope, velocity, curvature) {
  const s = shortSlope;
  const m = mediumSlope;
  const l = longSlope;

  if (s > 0 && m > 0 && l > 0 && velocity > 0 && curvature > 0) return "early_uptrend";
  if (s < 0 && m < 0 && l < 0 && velocity < 0 && curvature < 0) return "early_downtrend";

  if (s > 0 && m > 0 && l > 0 && velocity < 0) return "late_uptrend";
  if (s < 0 && m < 0 && l < 0 && velocity > 0) return "late_downtrend";

  if (s > 0 && m < 0 && l < 0) return "reversal_up_forming";
  if (s < 0 && m > 0 && l > 0) return "reversal_down_forming";

  if (Math.abs(s) < 0.0005 && Math.abs(m) < 0.0005) return "compression";

  return "normal";
}

function trendStrengthScore({ shortSlope, mediumSlope, longSlope, ma, structure }) {
  let score = 50;

  const absShort = Math.abs(shortSlope);
  const absMed = Math.abs(mediumSlope);
  const absLong = Math.abs(longSlope);

  if (absShort > 0.002) score += 10;
  if (absMed > 0.0015) score += 10;
  if (absLong > 0.001) score += 10;

  if (ma.stackedBull || ma.stackedBear) score += 15;
  if (ma.aboveAll || ma.belowAll) score += 10;
  if (ma.compression) score -= 10;
  if (ma.expansion) score += 5;

  if (structure.higherHighs && structure.higherLows) score += 10;
  if (structure.lowerHighs && structure.lowerLows) score += 10;
  if (structure.equalHighs && structure.equalLows) score -= 5;

  return Math.max(0, Math.min(100, score));
}

function detectTrendBySession(candles) {
  const bySession = { pre: [], regular: [], after: [] };
  for (const c of candles) {
    const s = c.session || inferSessionFromTimestamp(c.timestamp);
    bySession[s].push(safeNumber(c.close));
  }

  const slopes = {
    pre: linearSlope(bySession.pre),
    regular: linearSlope(bySession.regular),
    after: linearSlope(bySession.after),
  };

  return {
    slopes,
    dominantSession: dominantSession(slopes),
  };
}

function dominantSession(slopes) {
  const entries = Object.entries(slopes).filter(([, v]) => Number.isFinite(v));
  if (!entries.length) return "regular";
  entries.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  return entries[0][0];
}

function buildTrendNarrative({ direction, phase, strength, structure, ma }) {
  const tags = [];

  tags.push(`dir_${direction}`);
  tags.push(`phase_${phase}`);
  tags.push(strength >= 70 ? "trend_strong" : strength <= 30 ? "trend_weak" : "trend_moderate");

  if (ma.stackedBull) tags.push("ma_bull_stack");
  if (ma.stackedBear) tags.push("ma_bear_stack");
  if (ma.compression) tags.push("ma_compression");
  if (ma.expansion) tags.push("ma_expansion");

  if (structure.higherHighs && structure.higherLows) tags.push("structure_higher_highs_lows");
  if (structure.lowerHighs && structure.lowerLows) tags.push("structure_lower_highs_lows");
  if (structure.equalHighs && structure.equalLows) tags.push("structure_range");

  return { tags };
}

// --------------- helpers ---------------

function linearSlope(series) {
  if (!series || series.length < 2) return 0;
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

function sequenceTrend(values) {
  if (!values || values.length < 2) return "flat";
  const first = values[0];
  const last = values[values.length - 1];
  if (last > first * 1.01) return "up";
  if (last < first * 0.99) return "down";
  return "flat";
}

function inferSessionFromTimestamp(ts) {
  if (!ts) return "regular";
  const date = new Date(ts);
  const h = date.getUTCHours();
  if (h < 14) return "pre";
  if (h >= 20) return "after";
  return "regular";
}

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function basicFlatTrend() {
  return {
    direction: "sideways",
    phase: "unknown",
    strength: 0,
    slopes: {
      short: 0,
      medium: 0,
      long: 0,
      velocity: 0,
      curvature: 0,
    },
    structure: {
      higherHighs: false,
      higherLows: false,
      lowerHighs: false,
      lowerLows: false,
      equalHighs: false,
      equalLows: false,
      swingPoints: [],
    },
    ma: {
      ma20: 0,
      ma50: 0,
      ma200: 0,
      stackedBull: false,
      stackedBear: false,
      aboveAll: false,
      belowAll: false,
      compression: false,
      expansion: false,
      flattening: false,
    },
    session: {
      slopes: { pre: 0, regular: 0, after: 0 },
      dominantSession: "regular",
    },
    narrative: { tags: [] },
  };
}
