// patternModel.js
// Golden Formula — Pattern, MA & Narrative Intelligence Engine

export function analyzePatterns(candles = [], trend, volatility, liquidity) {
  if (!candles.length || candles.length < 3) {
    return basicPatterns();
  }

  const last = candles[candles.length - 1];
  const price = safeNumber(last.close);

  const roundNumbers = liquidity?.roundNumbers || detectRoundLevels(price);
  const ma = detectMAStructure(last);
  const maCrosses = detectMACrosses(candles);
  const maCompression = detectMACompression(candles);

  const candlePatterns = detectCandlePatterns(candles, roundNumbers);
  const chartPatterns = detectChartPatterns(candles, trend, volatility, roundNumbers);
  const events = detectEventPatterns(candles, trend, volatility, liquidity);

  const score = patternScore({
    candlePatterns,
    chartPatterns,
    ma,
    maCrosses,
    events,
  });

  return {
    roundNumbers,
    ma: {
      structure: ma,
      crosses: maCrosses,
      compression: maCompression,
    },
    candles: candlePatterns,
    chart: chartPatterns,
    events,
    score,
    narrative: buildPatternNarrative({
      candlePatterns,
      chartPatterns,
      ma,
      maCrosses,
      events,
      score,
    }),
  };
}

// ------------------------------
// ROUND NUMBER LOGIC (fallback)
// ------------------------------
function detectRoundLevels(price) {
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
    isNear1: distance1 <= price * 0.003,
    isNear5: distance5 <= price * 0.006,
    isNear10: distance10 <= price * 0.01,
  };
}

// ------------------------------
// MOVING AVERAGE STRUCTURE
// ------------------------------
function detectMAStructure(last) {
  const close = safeNumber(last.close);
  const ma20 = safeNumber(last.ma20 ?? last.maSmall);
  const ma50 = safeNumber(last.ma50 ?? last.maMedium);
  const ma200 = safeNumber(last.ma200 ?? last.maBig);

  return {
    aboveSmall: close > ma20,
    aboveMedium: close > ma50,
    aboveBig: close > ma200,
    belowSmall: close < ma20,
    belowMedium: close < ma50,
    belowBig: close < ma200,
    stackedBull: ma20 > ma50 && ma50 > ma200,
    stackedBear: ma20 < ma50 && ma50 < ma200,
  };
}

// ------------------------------
// MOVING AVERAGE CROSSES
// ------------------------------
function detectMACrosses(candles) {
  if (candles.length < 3) return { ma20_50: null, ma50_200: null, ma20_200: null };

  const prev = candles[candles.length - 2];
  const last = candles[candles.length - 1];

  const maPrev = normalizeMAs(prev);
  const maLast = normalizeMAs(last);

  function crossType(prevA, prevB, lastA, lastB) {
    const crossUp = prevA < prevB && lastA > lastB;
    const crossDown = prevA > prevB && lastA < lastB;
    return {
      crossUp,
      crossDown,
      type: crossUp ? "bullish" : crossDown ? "bearish" : "none",
    };
  }

  return {
    ma20_50: crossType(maPrev.ma20, maPrev.ma50, maLast.ma20, maLast.ma50),
    ma50_200: crossType(maPrev.ma50, maPrev.ma200, maLast.ma50, maLast.ma200),
    ma20_200: crossType(maPrev.ma20, maPrev.ma200, maLast.ma20, maLast.ma200),
  };
}

function detectMACompression(candles) {
  const last = candles[candles.length - 1];
  const ma = normalizeMAs(last);
  return {
    compressed:
      Math.abs(ma.ma20 - ma.ma50) / (ma.ma20 || 1) < 0.01 &&
      Math.abs(ma.ma50 - ma.ma200) / (ma.ma50 || 1) < 0.02,
  };
}

function normalizeMAs(c) {
  return {
    ma20: safeNumber(c.ma20 ?? c.maSmall),
    ma50: safeNumber(c.ma50 ?? c.maMedium),
    ma200: safeNumber(c.ma200 ?? c.maBig),
  };
}

// ------------------------------
// CANDLE PATTERNS (expanded)
// ------------------------------
function detectCandlePatterns(candles, roundNumbers) {
  if (candles.length < 3) {
    return basicCandlePatterns();
  }

  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const prev2 = candles[candles.length - 3];

  const body = Math.abs(last.close - last.open);
  const range = last.high - last.low;
  const upperWick = last.high - Math.max(last.close, last.open);
  const lowerWick = Math.min(last.close, last.open) - last.low;

  const smallBody = body < range * 0.25;
  const longUpper = upperWick > body * 2;
  const longLower = lowerWick > body * 2;

  const hammer = longLower && upperWick < body * 0.5;
  const invertedHammer = longUpper && lowerWick < body * 0.5;

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

  const doji = smallBody && upperWick > body && lowerWick > body;
  const dragonflyDoji = smallBody && longLower && upperWick < body * 0.5;
  const gravestoneDoji = smallBody && longUpper && lowerWick < body * 0.5;

  const insideBar =
    last.high < prev.high && last.low > prev.low;
  const outsideBar =
    last.high > prev.high && last.low < prev.low;

  const pinBar =
    (longLower && last.close > last.open) ||
    (longUpper && last.close < last.open);

  const nearRound =
    Math.abs(last.close - roundNumbers.nearest1) <= (range || 1) * 0.3 ||
    Math.abs(last.close - roundNumbers.nearest5) <= (range || 1) * 0.3;

  const morningStar =
    prev2.close > prev2.open &&
    prev.close < prev.open &&
    last.close > (prev2.close + prev2.open) / 2;

  const eveningStar =
    prev2.close < prev2.open &&
    prev.close > prev.open &&
    last.close < (prev2.close + prev2.open) / 2;

  return {
    hammer,
    invertedHammer,
    engulfingBull,
    engulfingBear,
    doji,
    dragonflyDoji,
    gravestoneDoji,
    insideBar,
    outsideBar,
    pinBar,
    morningStar,
    eveningStar,
    nearRound,
  };
}

function basicCandlePatterns() {
  return {
    hammer: false,
    invertedHammer: false,
    engulfingBull: false,
    engulfingBear: false,
    doji: false,
    dragonflyDoji: false,
    gravestoneDoji: false,
    insideBar: false,
    outsideBar: false,
    pinBar: false,
    morningStar: false,
    eveningStar: false,
    nearRound: false,
  };
}

// ------------------------------
// CHART PATTERNS (expanded)
// ------------------------------
function detectChartPatterns(candles, trend, volatility, roundNumbers) {
  const len = candles.length;
  if (len < 20) return basicChartPatterns();

  const closes = candles.map(c => safeNumber(c.close));

  const doubleTop = detectDoubleTop(closes);
  const doubleBottom = detectDoubleBottom(closes);
  const roundingBottom = detectRoundingBottom(closes);
  const roundingTop = detectRoundingTop(closes);
  const flag = detectFlag(closes, trend);
  const triangle = detectTriangle(closes);
  const channel = detectChannel(closes);
  const wedge = detectWedge(closes);

  const breakout = detectBreakout(closes, roundNumbers);

  return {
    doubleTop,
    doubleBottom,
    roundingBottom,
    roundingTop,
    flag,
    triangle,
    channel,
    wedge,
    breakout,
  };
}

function basicChartPatterns() {
  return {
    doubleTop: false,
    doubleBottom: false,
    roundingBottom: false,
    roundingTop: false,
    flag: false,
    triangle: false,
    channel: false,
    wedge: false,
    breakout: {
      up: false,
      down: false,
      retest: false,
      failedRetest: false,
    },
  };
}

function detectDoubleTop(closes) {
  const len = closes.length;
  const window = closes.slice(len - 40);
  if (window.length < 20) return false;

  const mid = Math.floor(window.length / 2);
  const left = window.slice(0, mid);
  const right = window.slice(mid);

  const high1 = Math.max(...left);
  const high2 = Math.max(...right);

  return Math.abs(high1 - high2) / high1 < 0.01 && right[right.length - 1] < right[right.length - 2];
}

function detectDoubleBottom(closes) {
  const len = closes.length;
  const window = closes.slice(len - 40);
  if (window.length < 20) return false;

  const mid = Math.floor(window.length / 2);
  const left = window.slice(0, mid);
  const right = window.slice(mid);

  const low1 = Math.min(...left);
  const low2 = Math.min(...right);

  return Math.abs(low1 - low2) / low1 < 0.01 && right[right.length - 1] > right[right.length - 2];
}

function detectRoundingBottom(closes) {
  const len = closes.length;
  const window = closes.slice(len - 60);
  if (window.length < 30) return false;

  const mid = Math.floor(window.length / 2);
  const left = window.slice(0, mid);
  const right = window.slice(mid);

  return (
    Math.min(...left) <= Math.min(...right) &&
    Math.max(...right) > Math.max(...left) &&
    sequenceTrend(window) === "up"
  );
}

function detectRoundingTop(closes) {
  const len = closes.length;
  const window = closes.slice(len - 60);
  if (window.length < 30) return false;

  const mid = Math.floor(window.length / 2);
  const left = window.slice(0, mid);
  const right = window.slice(mid);

  return (
    Math.max(...left) >= Math.max(...right) &&
    Math.min(...right) < Math.min(...left) &&
    sequenceTrend(window) === "down"
  );
}

function detectFlag(closes, trend) {
  const len = closes.length;
  const recent = closes.slice(len - 20);
  if (recent.length < 10) return false;

  const mainTrendUp = trend?.direction === "up";
  const mainTrendDown = trend?.direction === "down";

  const first = recent[0];
  const last = recent[recent.length - 1];

  const pullback = mainTrendUp
    ? last < recent[recent.length - 3]
    : mainTrendDown
    ? last > recent[recent.length - 3]
    : false;

  const trendMove = mainTrendUp ? last > first * 1.05 : mainTrendDown ? last < first * 0.95 : false;

  return trendMove && pullback;
}

function detectTriangle(closes) {
  const len = closes.length;
  const recent = closes.slice(len - 40);
  if (recent.length < 20) return false;

  const highs = [];
  const lows = [];
  for (let i = 1; i < recent.length - 1; i++) {
    if (recent[i] > recent[i - 1] && recent[i] > recent[i + 1]) highs.push(recent[i]);
    if (recent[i] < recent[i - 1] && recent[i] < recent[i + 1]) lows.push(recent[i]);
  }

  if (highs.length < 2 || lows.length < 2) return false;

  const highsTrend = sequenceTrend(highs);
  const lowsTrend = sequenceTrend(lows);

  return (
    (highsTrend === "down" && lowsTrend === "up") ||
    (highsTrend === "flat" && lowsTrend === "up") ||
    (highsTrend === "down" && lowsTrend === "flat")
  );
}

function detectChannel(closes) {
  const len = closes.length;
  const recent = closes.slice(len - 40);
  if (recent.length < 20) return false;

  const highs = [];
  const lows = [];
  for (let i = 1; i < recent.length - 1; i++) {
    if (recent[i] > recent[i - 1] && recent[i] > recent[i + 1]) highs.push(recent[i]);
    if (recent[i] < recent[i - 1] && recent[i] < recent[i + 1]) lows.push(recent[i]);
  }

  if (highs.length < 2 || lows.length < 2) return false;

  const highsTrend = sequenceTrend(highs);
  const lowsTrend = sequenceTrend(lows);

  return highsTrend === lowsTrend && highsTrend !== "flat";
}

function detectWedge(closes) {
  const len = closes.length;
  const recent = closes.slice(len - 40);
  if (recent.length < 20) return false;

  const highs = [];
  const lows = [];
  for (let i = 1; i < recent.length - 1; i++) {
    if (recent[i] > recent[i - 1] && recent[i] > recent[i + 1]) highs.push(recent[i]);
    if (recent[i] < recent[i - 1] && recent[i] < recent[i + 1]) lows.push(recent[i]);
  }

  if (highs.length < 2 || lows.length < 2) return false;

  const highsTrend = sequenceTrend(highs);
  const lowsTrend = sequenceTrend(lows);

  return (
    (highsTrend === "down" && lowsTrend === "down") ||
    (highsTrend === "up" && lowsTrend === "up")
  );
}

function detectBreakout(closes, roundNumbers) {
  const len = closes.length;
  const recent = closes.slice(len - 15);
  if (recent.length < 5) {
    return { up: false, down: false, retest: false, failedRetest: false };
  }

  const last = recent[recent.length - 1];
  const prev = recent[recent.length - 2];

  const resistance = roundNumbers.nearest1;
  const support = roundNumbers.nearest1;

  const brokeUp = prev < resistance && last > resistance * 1.01;
  const brokeDown = prev > support && last < support * 0.99;

  const retest = brokeUp
    ? last > resistance && recent.some(v => v < resistance * 1.005)
    : brokeDown
    ? last < support && recent.some(v => v > support * 0.995)
    : false;

  const failedRetest = brokeUp
    ? recent.some(v => v < resistance)
    : brokeDown
    ? recent.some(v => v > support)
    : false;

  return {
    up: brokeUp,
    down: brokeDown,
    retest,
    failedRetest,
  };
}

// ------------------------------
// EVENT PATTERNS (sweeps, traps, etc.)
// ------------------------------
function detectEventPatterns(candles, trend, volatility, liquidity) {
  const sweeps = liquidity?.sweeps?.sweeps || [];
  const hasStopHunt = liquidity?.sweeps?.hasStopHunt || false;

  const explosiveVol = volatility?.regime === "explosive";
  const expandingVol = volatility?.regimeTrend === "expanding";

  const trendReversalForming =
    trend?.phase === "reversal_up_forming" || trend?.phase === "reversal_down_forming";

  return {
    hasStopHunt,
    sweeps,
    explosiveVol,
    expandingVol,
    trendReversalForming,
  };
}

// ------------------------------
// SCORING & NARRATIVE
// ------------------------------
function patternScore({ candlePatterns, chartPatterns, ma, maCrosses, events }) {
  let score = 50;

  if (candlePatterns.engulfingBull || candlePatterns.engulfingBear) score += 10;
  if (candlePatterns.morningStar || candlePatterns.eveningStar) score += 10;
  if (candlePatterns.pinBar && candlePatterns.nearRound) score += 10;

  if (chartPatterns.doubleTop || chartPatterns.doubleBottom) score += 10;
  if (chartPatterns.roundingBottom || chartPatterns.roundingTop) score += 10;
  if (chartPatterns.flag || chartPatterns.triangle || chartPatterns.channel || chartPatterns.wedge) {
    score += 10;
  }

  if (chartPatterns.breakout.up || chartPatterns.breakout.down) score += 10;
  if (chartPatterns.breakout.failedRetest) score += 5;

  if (ma.stackedBull || ma.stackedBear) score += 10;

  const crosses = [maCrosses.ma20_50, maCrosses.ma50_200, maCrosses.ma20_200];
  if (crosses.some(c => c?.type === "bullish" || c?.type === "bearish")) score += 10;

  if (events.hasStopHunt) score += 10;
  if (events.explosiveVol && events.trendReversalForming) score += 10;

  return Math.max(0, Math.min(100, score));
}

function buildPatternNarrative({ candlePatterns, chartPatterns, ma, maCrosses, events, score }) {
  const tags = [];

  if (candlePatterns.engulfingBull) tags.push("candle_engulfing_bull");
  if (candlePatterns.engulfingBear) tags.push("candle_engulfing_bear");
  if (candlePatterns.morningStar) tags.push("candle_morning_star");
  if (candlePatterns.eveningStar) tags.push("candle_evening_star");
  if (candlePatterns.pinBar && candlePatterns.nearRound) tags.push("pinbar_near_round");

  if (chartPatterns.doubleTop) tags.push("pattern_double_top");
  if (chartPatterns.doubleBottom) tags.push("pattern_double_bottom");
  if (chartPatterns.roundingBottom) tags.push("pattern_rounding_bottom");
  if (chartPatterns.roundingTop) tags.push("pattern_rounding_top");
  if (chartPatterns.flag) tags.push("pattern_flag");
  if (chartPatterns.triangle) tags.push("pattern_triangle");
  if (chartPatterns.channel) tags.push("pattern_channel");
  if (chartPatterns.wedge) tags.push("pattern_wedge");

  if (chartPatterns.breakout.up) tags.push("breakout_up");
  if (chartPatterns.breakout.down) tags.push("breakout_down");
  if (chartPatterns.breakout.failedRetest) tags.push("breakout_failed_retest");

  if (ma.stackedBull) tags.push("ma_bull_stack");
  if (ma.stackedBear) tags.push("ma_bear_stack");

  const crosses = [maCrosses.ma20_50, maCrosses.ma50_200, maCrosses.ma20_200];
  if (crosses.some(c => c?.type === "bullish")) tags.push("ma_bull_cross");
  if (crosses.some(c => c?.type === "bearish")) tags.push("ma_bear_cross");

  if (events.hasStopHunt) tags.push("liquidity_sweep");
  if (events.explosiveVol) tags.push("explosive_volatility");
  if (events.trendReversalForming) tags.push("reversal_forming");

  tags.push(score >= 70 ? "pattern_strong" : score <= 30 ? "pattern_weak" : "pattern_moderate");

  return { tags };
}

// ------------------------------
// helpers
// ------------------------------
function sequenceTrend(values) {
  if (!values || values.length < 2) return "flat";
  const first = values[0];
  const last = values[values.length - 1];
  if (last > first * 1.01) return "up";
  if (last < first * 0.99) return "down";
  return "flat";
}

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function basicPatterns() {
  return {
    roundNumbers: detectRoundLevels(0),
    ma: {
      structure: {
        aboveSmall: false,
        aboveMedium: false,
        aboveBig: false,
        belowSmall: false,
        belowMedium: false,
        belowBig: false,
        stackedBull: false,
        stackedBear: false,
      },
      crosses: {
        ma20_50: null,
        ma50_200: null,
        ma20_200: null,
      },
      compression: { compressed: false },
    },
    candles: basicCandlePatterns(),
    chart: basicChartPatterns(),
    events: {
      hasStopHunt: false,
      sweeps: [],
      explosiveVol: false,
      expandingVol: false,
      trendReversalForming: false,
    },
    score: 0,
    narrative: { tags: [] },
  };
}
