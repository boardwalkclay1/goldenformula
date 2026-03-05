// gfNarrative.js
// Golden Formula — Ultra-Advanced Narrative Engine
// Straight to the point. Multiple narrative modes. CALL / PUT / STRADDLE included.

export function buildGFNarrative({ trend, patterns, liquidity, timing, rules, score, strategy }) {
  const out = [];

  // ------------------------------
  // 1. TREND SNAPSHOT
  // ------------------------------
  out.push(nTrend(trend));

  // ------------------------------
  // 2. PATTERN SNAPSHOT
  // ------------------------------
  out.push(nPattern(patterns));

  // ------------------------------
  // 3. LIQUIDITY SNAPSHOT
  // ------------------------------
  out.push(nLiquidity(liquidity));

  // ------------------------------
  // 4. VOLATILITY & TIMING SNAPSHOT
  // ------------------------------
  out.push(nTiming(timing));

  // ------------------------------
  // 5. BREAKOUT / DIRECTION SNAPSHOT
  // ------------------------------
  out.push(nBreakout(rules));

  // ------------------------------
  // 6. TARGETING SNAPSHOT
  // ------------------------------
  out.push(`Entry ${fmt(rules.entry)} | Stop ${fmt(rules.stop)} | Target ${fmt(rules.target)}`);

  // ------------------------------
  // 7. CONFIDENCE SNAPSHOT
  // ------------------------------
  out.push(`Confidence: ${score.confidence.toUpperCase()} (${score.score})`);

  // ------------------------------
  // 8. STRATEGY SNAPSHOT (CALL / PUT / STRADDLE)
  // ------------------------------
  out.push(nStrategy(strategy, rules, timing, patterns, trend));

  return out;
}

// --------------------------------------------------
// TREND NARRATIVE
// --------------------------------------------------
function nTrend(t) {
  if (t.phase.includes("early") && t.direction === "up") return "Early uptrend forming — momentum building.";
  if (t.phase.includes("early") && t.direction === "down") return "Early downtrend forming — pressure increasing.";
  if (t.phase.includes("late") && t.direction === "up") return "Late uptrend — upside slowing, watch for exhaustion.";
  if (t.phase.includes("late") && t.direction === "down") return "Late downtrend — sellers may be tiring.";
  if (t.phase.includes("reversal")) return "Reversal structure forming — volatility confirms pressure shift.";
  return `Trend: ${t.direction.replace("_", " ")}`;
}

// --------------------------------------------------
// PATTERN NARRATIVE
// --------------------------------------------------
function nPattern(p) {
  const c = p.candles;
  const ch = p.chart;

  if (ch.breakout?.up) return "Breakout pushing upward — continuation likely.";
  if (ch.breakout?.down) return "Breakout pushing downward — continuation likely.";
  if (ch.breakout?.retest) return "Retest holding — breakout validation.";
  if (ch.breakout?.failedRetest) return "Failed retest — trap reversal loading.";

  if (ch.doubleTop) return "Double Top — bearish reversal pressure.";
  if (ch.doubleBottom) return "Double Bottom — bullish reversal pressure.";
  if (ch.roundingBottom) return "Rounding Bottom — accumulation phase.";
  if (ch.roundingTop) return "Rounding Top — distribution phase.";
  if (ch.flag) return "Flag — trend continuation setup.";
  if (c.engulfingBull) return "Bullish Engulfing — buyers taking control.";
  if (c.engulfingBear) return "Bearish Engulfing — sellers taking control.";
  if (c.hammer) return "Hammer — rejection wick shows demand.";
  if (c.invertedHammer) return "Inverted Hammer — rejection wick shows supply.";

  return "No major pattern influence.";
}

// --------------------------------------------------
// LIQUIDITY NARRATIVE
// --------------------------------------------------
function nLiquidity(l) {
  const rn = l.roundNumbers ?? l;

  if (l.sweeps?.hasStopHunt) return "Liquidity sweep detected — trapped traders fuel next move.";
  if (l.zones?.compressionNearRound) return "Compression at round number — pressure building.";
  if (l.zones?.trappedBetweenRounds) return "Price trapped between levels — breakout imminent.";

  if (rn.nearTen) return "Sitting on a major integer — strong reaction zone.";
  if (rn.nearFive) return "Near a mid-integer level — moderate reaction zone.";
  if (rn.nearWhole) return "Near whole number — psychological magnet.";

  return "No major liquidity influence.";
}

// --------------------------------------------------
// TIMING NARRATIVE
// --------------------------------------------------
function nTiming(t) {
  if (t.burstWindow) return "Opening burst window — volatility elevated.";
  if (t.digestionWindow) return "Digestion window — trend stabilizing.";
  if (t.trendWindow) return "Trend window — directional moves cleanest.";
  if (t.powerHour) return "Power Hour — volatility spike or reversal likely.";

  if (t.integerTiming) return "Integer timing — expect reaction.";
  if (t.maCluster) return "MA cluster — energy compressing.";
  if (t.maBounceTiming) return "MA bounce timing — pivot forming.";

  if (t.breakoutTiming) return "Breakout timing — expansion phase.";
  if (t.retestTiming) return "Retest timing — validation phase.";
  if (t.trapTiming) return "Trap timing — reversal phase.";

  return `Timing: ${t.expectedBehavior}`;
}

// --------------------------------------------------
// BREAKOUT / DIRECTION NARRATIVE
// --------------------------------------------------
function nBreakout(r) {
  if (r.breakoutUp) return "Breakout direction: LONG";
  if (r.breakoutDown) return "Breakout direction: SHORT";
  return `Directional bias: ${r.direction.toUpperCase()}`;
}

// --------------------------------------------------
// STRATEGY NARRATIVE (CALL / PUT / STRADDLE)
// --------------------------------------------------
function nStrategy(strategy, rules, timing, patterns, trend) {
  const s = strategy.toUpperCase();

  if (s === "CALL") {
    return "Suggested play: CALL — bullish continuation or breakout expected.";
  }

  if (s === "PUT") {
    return "Suggested play: PUT — bearish continuation or breakdown expected.";
  }

  if (s === "STRADDLE") {
    return "Suggested play: STRADDLE — volatility expansion expected, direction uncertain.";
  }

  // Auto-detect if strategy wasn't provided
  if (rules.breakoutUp) return "Suggested play: CALL — breakout strength confirmed.";
  if (rules.breakoutDown) return "Suggested play: PUT — breakdown strength confirmed.";

  if (timing.trapTiming) return "Suggested play: STRADDLE — trap volatility likely.";

  if (trend.phase.includes("reversal")) return "Suggested play: STRADDLE — reversal volatility loading.";

  return "Suggested play: NEUTRAL — no clear directional edge.";
}

// --------------------------------------------------
// UTIL
// --------------------------------------------------
function fmt(v) {
  return Number(v).toFixed(2);
}
