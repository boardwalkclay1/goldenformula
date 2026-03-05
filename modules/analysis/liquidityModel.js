// liquidityModel.js
// Golden Formula — Liquidity, Levels & Session Intelligence Engine

/**
 * candles: [
 *  {
 *    open, high, low, close, volume,
 *    timestamp,
 *    session?: "pre" | "regular" | "after",
 *    fromScreenshot?: boolean
 *  }
 * ]
 */
export function analyzeLiquidity(candles = []) {
  if (!candles.length || candles.length < 5) return basicLiquidity();

  const last = candles[candles.length - 1];
  const price = safeNumber(last.close);
  const volumes = candles.map(c => safeNumber(c.volume));
  const ranges = candles.map(c => safeNumber(c.high) - safeNumber(c.low));

  const avgVol20 = averageLast(volumes, 20);
  const avgVol5 = averageLast(volumes, 5);
  const relVolume = avgVol20 > 0 ? avgVol5 / avgVol20 : 0;

  const tickSize = inferTickSize(price, candles);
  const round = computeRoundLevels(price, tickSize);
  const session = detectSessionBehavior(candles, price, volumes);
  const zones = detectLiquidityZones(candles, price, ranges, volumes, round);
  const sweeps = detectLiquiditySweeps(candles, round);

  const score = liquidityScore({
    relVolume,
    zones,
    sweeps,
    round,
    session,
  });

  return {
    price,
    tickSize,
    volume: {
      avgVol20,
      avgVol5,
      relVolume,
      spike5x: relVolume >= 5,
      spike10x: relVolume >= 10,
      dryingUp: relVolume <= 0.5,
      trend: volumeTrend(volumes),
    },
    roundNumbers: round,
    zones,
    sweeps,
    session,
    score,
  };
}

function computeRoundLevels(price, tickSize) {
  const nearest1 = Math.round(price);
  const nearest5 = Math.round(price / 5) * 5;
  const nearest10 = Math.round(price / 10) * 10;

  const distanceTo1 = price - nearest1;
  const distanceTo5 = price - nearest5;
  const distanceTo10 = price - nearest10;

  return {
    price,
    nearest1,
    nearest5,
    nearest10,
    distanceTo1,
    distanceTo5,
    distanceTo10,
    nearWhole: Math.abs(distanceTo1) <= tickSize * 2,
    nearFive: Math.abs(distanceTo5) <= tickSize * 3,
    nearTen: Math.abs(distanceTo10) <= tickSize * 4,
  };
}

function detectSessionBehavior(candles, price, volumes) {
  const last = candles[candles.length - 1];
  const session = last.session || inferSessionFromTimestamp(last.timestamp);

  const pre = candles.filter(c => (c.session || inferSessionFromTimestamp(c.timestamp)) === "pre");
  const reg = candles.filter(c => (c.session || inferSessionFromTimestamp(c.timestamp)) === "regular");
  const aft = candles.filter(c => (c.session || inferSessionFromTimestamp(c.timestamp)) === "after");

  const preVol = average(pre.map(c => safeNumber(c.volume)));
  const regVol = average(reg.map(c => safeNumber(c.volume)));
  const aftVol = average(aft.map(c => safeNumber(c.volume)));

  return {
    current: session,
    volumeProfile: {
      pre: preVol,
      regular: regVol,
      after: aftVol,
    },
    sessionShift: sessionShiftSignal(preVol, regVol, aftVol),
    sessionVolatility: sessionVolatility(candles),
    priceAnchor: price,
  };
}

function detectLiquidityZones(candles, price, ranges, volumes, round) {
  const recent = candles.slice(-40);
  if (recent.length < 5) {
    return {
      highLiquidityZones: [],
      lowLiquidityZones: [],
      voids: [],
      compressionNearRound: false,
      trappedBetweenRounds:
        price > Math.min(round.nearest1, round.nearest5) &&
        price < Math.max(round.nearest1, round.nearest5),
    };
  }

  const avgRange = average(ranges);
  const avgVol = average(volumes);

  const highLiquidityZones = [];
  const lowLiquidityZones = [];
  const voids = [];

  for (let i = 1; i < recent.length; i++) {
    const c = recent[i];
    const prev = recent[i - 1];
    const range = safeNumber(c.high) - safeNumber(c.low);
    const vol = safeNumber(c.volume);

    const highLiq = range <= avgRange * 0.7 && vol >= avgVol * 1.3;
    const lowLiq = range <= avgRange * 0.5 && vol <= avgVol * 0.7;
    const gapUp = c.low > prev.high * 1.01;
    const gapDown = c.high < prev.low * 0.99;

    if (highLiq) {
      highLiquidityZones.push({
        index: candles.length - recent.length + i,
        priceMid: (c.high + c.low) / 2,
      });
    }
    if (lowLiq) {
      lowLiquidityZones.push({
        index: candles.length - recent.length + i,
        priceMid: (c.high + c.low) / 2,
      });
    }
    if (gapUp || gapDown) {
      voids.push({
        index: candles.length - recent.length + i,
        type: gapUp ? "gap_up" : "gap_down",
        from: gapUp ? prev.high : c.high,
        to: gapUp ? c.low : prev.low,
      });
    }
  }

  const compressionNearRound =
    highLiquidityZones.some(z => Math.abs(z.priceMid - round.nearest1) <= (round.price * 0.01)) ||
    highLiquidityZones.some(z => Math.abs(z.priceMid - round.nearest5) <= (round.price * 0.01));

  return {
    highLiquidityZones,
    lowLiquidityZones,
    voids,
    compressionNearRound,
    trappedBetweenRounds:
      round.price > Math.min(round.nearest1, round.nearest5) &&
      round.price < Math.max(round.nearest1, round.nearest5),
  };
}

function detectLiquiditySweeps(candles, round) {
  const recent = candles.slice(-15);
  if (recent.length < 3) return { sweeps: [], hasStopHunt: false };

  const sweeps = [];

  for (let i = 1; i < recent.length - 1; i++) {
    const prev = recent[i - 1];
    const c = recent[i];
    const next = recent[i + 1];

    const longLowerWick =
      Math.min(c.open, c.close) - c.low >
      (c.high - c.low) * 0.6;
    const longUpperWick =
      c.high - Math.max(c.open, c.close) >
      (c.high - c.low) * 0.6;

    const sweptBelowRound =
      longLowerWick &&
      c.low < round.nearest1 &&
      Math.min(next.open, next.close) > c.low;

    const sweptAboveRound =
      longUpperWick &&
      c.high > round.nearest1 &&
      Math.max(next.open, next.close) < c.high;

    if (sweptBelowRound) {
      sweeps.push({
        type: "down_sweep",
        index: candles.length - recent.length + i,
        level: round.nearest1,
      });
    }
    if (sweptAboveRound) {
      sweeps.push({
        type: "up_sweep",
        index: candles.length - recent.length + i,
        level: round.nearest1,
      });
    }
  }

  return {
    sweeps,
    hasStopHunt: sweeps.length > 0,
  };
}

function liquidityScore({ relVolume, zones, sweeps, round, session }) {
  let score = 50;

  if (relVolume >= 3) score += 15;
  if (relVolume >= 5) score += 10;
  if (relVolume <= 0.7) score -= 10;

  if (zones.highLiquidityZones.length) score += 10;
  if (zones.lowLiquidityZones.length) score -= 5;
  if (zones.voids.length) score -= 5;

  if (zones.compressionNearRound) score += 10;
  if (zones.trappedBetweenRounds) score += 5;

  if (sweeps.hasStopHunt) score += 10;

  if (session.sessionShift === "pre_to_regular_surge") score += 5;
  if (session.sessionShift === "regular_to_after_drain") score -= 5;

  if (round.nearWhole || round.nearFive || round.nearTen) score += 5;

  return Math.max(0, Math.min(100, score));
}

// --------------- helpers ---------------

function average(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function averageLast(arr, n) {
  if (!arr.length) return 0;
  const slice = arr.slice(-n);
  return average(slice);
}

function volumeTrend(volumes) {
  if (volumes.length < 5) return "flat";
  const last = volumes.slice(-5);
  const first = last[0];
  const lastVal = last[last.length - 1];
  if (lastVal > first * 1.5) return "rising";
  if (lastVal < first * 0.7) return "falling";
  return "flat";
}

function inferTickSize(price, candles) {
  if (price < 1) return 0.001;
  if (price < 5) return 0.01;
  if (price < 20) return 0.05;
  if (price < 100) return 0.10;
  if (price < 300) return 0.25;

  // bonus: infer from screenshot-derived candles if present
  const diffs = [];
  for (let i = 1; i < candles.length; i++) {
    const d = Math.abs(safeNumber(candles[i].close) - safeNumber(candles[i - 1].close));
    if (d > 0) diffs.push(d);
  }
  const minDiff = diffs.length ? Math.min(...diffs) : 0.5;
  return Math.max(0.5, roundTo(minDiff, 0.05));
}

function inferSessionFromTimestamp(ts) {
  if (!ts) return "regular";
  const date = new Date(ts);
  const h = date.getUTCHours(); // you can adapt to ET upstream
  if (h < 14) return "pre";
  if (h >= 20) return "after";
  return "regular";
}

function sessionShiftSignal(preVol, regVol, aftVol) {
  if (preVol && regVol && regVol > preVol * 2) return "pre_to_regular_surge";
  if (regVol && aftVol && aftVol < regVol * 0.5) return "regular_to_after_drain";
  return "none";
}

function sessionVolatility(candles) {
  const bySession = { pre: [], regular: [], after: [] };
  for (const c of candles) {
    const s = c.session || inferSessionFromTimestamp(c.timestamp);
    bySession[s].push(c.high - c.low);
  }
  return {
    pre: average(bySession.pre),
    regular: average(bySession.regular),
    after: average(bySession.after),
  };
}

function roundTo(v, step) {
  return Math.round(v / step) * step;
}

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function basicLiquidity() {
  return {
    price: 0,
    tickSize: 0.01,
    volume: {
      avgVol20: 0,
      avgVol5: 0,
      relVolume: 0,
      spike5x: false,
      spike10x: false,
      dryingUp: false,
      trend: "flat",
    },
    roundNumbers: {
      price: 0,
      nearest1: 0,
      nearest5: 0,
      nearest10: 0,
      distanceTo1: 0,
      distanceTo5: 0,
      distanceTo10: 0,
      nearWhole: false,
      nearFive: false,
      nearTen: false,
    },
    zones: {
      highLiquidityZones: [],
      lowLiquidityZones: [],
      voids: [],
      compressionNearRound: false,
      trappedBetweenRounds: false,
    },
    sweeps: {
      sweeps: [],
      hasStopHunt: false,
    },
    session: {
      current: "regular",
      volumeProfile: { pre: 0, regular: 0, after: 0 },
      sessionShift: "none",
      sessionVolatility: { pre: 0, regular: 0, after: 0 },
      priceAnchor: 0,
    },
    score: 0,
  };
}
