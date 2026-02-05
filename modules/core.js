// modules/core.js

// ------------------------------
// BASIC HELPERS
// ------------------------------
export function autoCorrectNumber(raw, hintMin, hintMax) {
  if (raw == null || isNaN(raw)) return null;
  let v = raw;
  if (v > 1000 && hintMax && hintMax < 100) v = v / 100;
  if (hintMin != null && v < hintMin * 0.1) v = v * 0.1;
  if (hintMax != null && v > hintMax * 10) v = v * 0.1;
  return v;
}

export function nearestEven(price) { return Math.round(price / 5) * 5; }
export function nextEvenUp(price)  { return Math.ceil(price / 5) * 5; }
export function nextEvenDown(p)   { return Math.floor(p / 5) * 5; }

// ------------------------------
// CHART TEXT PARSER (RIOT / AVGO / WEBULL STYLE)
// ------------------------------
export function parseChartText(raw) {
  let text = raw
    .replace(/\s+/g, ' ')
    .replace(/–|—/g, '-')                      // normalize dashes
    .replace(/[^0-9a-zA-Z\.\:\-\/ ]/g, '')     // strip weird OCR chars
    .replace(/(\d)\s+(\d)/g, '$1$2');          // fix digit spacing

  const out = {};

  // Current price (RIOT / AVGO / generic)
  const priceMatch =
    text.match(/RIOT[^0-9]*([0-9]+\.[0-9]+)/i) ||
    text.match(/AVGO[^0-9]*([0-9]+\.[0-9]+)/i) ||
    text.match(/([0-9]+\.[0-9]+)\s*[▲▼\+\-]/);
  if (priceMatch) out.price = parseFloat(priceMatch[1]);

  // H/L 326.53-309.00
  const hlMatch = text.match(/H\/L[^0-9]*([0-9]+\.[0-9]+)-([0-9]+\.[0-9]+)/i);
  if (hlMatch) {
    out.dayHigh = parseFloat(hlMatch[1]);
    out.dayLow  = parseFloat(hlMatch[2]);
  }

  // MA(20,50,200) MA20:316.55 MA50:316.79 MA200:317.99
  const ma20 = text.match(/MA\(20\)[: ]*([0-9]+\.[0-9]+)/i) ||
               text.match(/MA20[: ]*([0-9]+\.[0-9]+)/i);
  const ma50 = text.match(/MA\(50\)[: ]*([0-9]+\.[0-9]+)/i) ||
               text.match(/MA50[: ]*([0-9]+\.[0-9]+)/i);
  const ma200 = text.match(/MA\(200\)[: ]*([0-9]+\.[0-9]+)/i) ||
                text.match(/MA200[: ]*([0-9]+\.[0-9]+)/i);

  if (ma20)  out.maFast = parseFloat(ma20[1]);
  if (ma50)  out.maSlow = parseFloat(ma50[1]);
  if (ma200) out.ma200  = parseFloat(ma200[1]);

  // 52 Week High / Low (if present)
  const wkHigh = text.match(/52 Week High[^0-9]*([0-9]+\.[0-9]+)/i);
  const wkLow  = text.match(/52 Week Low[^0-9]*([0-9]+\.[0-9]+)/i);
  if (wkHigh) out.wkHigh = parseFloat(wkHigh[1]);
  if (wkLow)  out.wkLow  = parseFloat(wkLow[1]);

  // Volume / Avg Vol
  const vol = text.match(/Volume[^0-9]*([0-9]+\.[0-9]+)M/i);
  if (vol) out.volume = parseFloat(vol[1]) * 1_000_000;

  const avgVol = text.match(/Avg Vol[^0-9]*([0-9]+\.[0-9]+)M/i);
  if (avgVol) out.avgVol = parseFloat(avgVol[1]) * 1_000_000;

  // Market Cap (T or B)
  const mktCap = text.match(/Mkt Cap[^0-9]*([0-9]+\.[0-9]+)T/i) ||
                 text.match(/Mkt Cap[^0-9]*([0-9]+\.[0-9]+)B/i);
  if (mktCap) {
    const mult = mktCap[0].includes('T') ? 1_000_000_000_000 : 1_000_000_000;
    out.mktCap = parseFloat(mktCap[1]) * mult;
  }

  return out;
}

// ------------------------------
// BULLISH FLAG DETECTOR (YOUR GOLDEN PLAY)
// ------------------------------
export function detectBullFlag(data) {
  const { price, dayHigh, dayLow, maFast, maSlow, ma200, open, prevClose } = data;

  if ([price, dayHigh, dayLow, maFast, maSlow].some(v => v == null || isNaN(v))) {
    return { isFlag: false, notes: [] };
  }

  const notes = [];

  // Up day (vs open or previous close if available)
  let upDay = false;
  if (!isNaN(open) && open > 0) {
    upDay = price > open;
  } else if (!isNaN(prevClose) && prevClose > 0) {
    upDay = price > prevClose;
  }
  if (!upDay) return { isFlag: false, notes };
  notes.push("Price is up on the day → continuation idea, not a bottom catch.");

  // Price near high of day
  const range = dayHigh - dayLow;
  if (range <= 0) return { isFlag: false, notes };
  const pos = (price - dayLow) / range;
  if (pos < 0.6) return { isFlag: false, notes };
  notes.push("Price is holding in the upper part of today’s range → flag near the highs.");

  // Price above fast & slow MAs
  if (!(price > maFast && price > maSlow)) return { isFlag: false, notes };
  notes.push("Price is above both fast and slow moving averages.");

  // Fast & slow MAs tight (within ~1%)
  const diffFS = Math.abs(maFast - maSlow);
  if (diffFS > price * 0.01) return { isFlag: false, notes };
  notes.push("Fast and slow MAs are almost on top of each other → tight consolidation.");

  // All MAs clustered (within ~2%)
  if (!isNaN(ma200)) {
    const maxMA = Math.max(maFast, maSlow, ma200);
    const minMA = Math.min(maFast, maSlow, ma200);
    if ((maxMA - minMA) > price * 0.02) return { isFlag: false, notes };
    notes.push("20 / 50 / 200 MAs are clustered → strong, steady trend.");
  }

  notes.push("This matches your golden bullish flag continuation pattern.");
  return { isFlag: true, notes };
}

// ------------------------------
// GOLDEN FORMULA ENGINE
// ------------------------------
export function runGoldenFormula(data, pattern, reversal, evenReaction) {
  const notes = [];
  let direction = "none";

  const { price, maFast, maSlow, ma200, dayHigh, dayLow } = data;

  if ([price, maFast, maSlow].some(v => v == null || isNaN(v))) {
    notes.push("Price and both moving averages must be readable.");
    return { direction: "none", valid: false, entry: "", stop: "", notes };
  }

  // Base MA direction
  if (maFast > maSlow && price > maFast) {
    direction = "call";
    notes.push("Fast MA above slow MA and price above both → up move.");
  } else if (maFast < maSlow && price < maFast) {
    direction = "put";
    notes.push("Fast MA below slow MA and price below both → down move.");
  } else {
    notes.push("Moving averages do not clearly show up or down.");
  }

  if (!isNaN(ma200)) {
    if (maFast > maSlow && maFast > ma200) notes.push("Golden cross style uptrend.");
    if (maFast < maSlow && maFast < ma200) notes.push("Death cross style downtrend.");
  }

  const diff = Math.abs(maFast - maSlow);
  if (diff <= price * 0.005) notes.push("Fast and slow MAs are very close → cross coming.");

  // Pattern logic from dropdown
  let patternOk = false;
  if (direction === "call" && (pattern === "doubleBottom" || pattern === "roundingBottom")) {
    patternOk = true; notes.push("Bottom pattern confirmed.");
  }
  if (direction === "put" && (pattern === "doubleTop" || pattern === "roundingTop")) {
    patternOk = true; notes.push("Top pattern confirmed.");
  }

  // NEW: bullish flag override (golden play)
  const flagCheck = detectBullFlag(data);
  if (flagCheck.isFlag) {
    direction = "call";
    patternOk = true;
    notes.push(...flagCheck.notes);
    notes.push("Flag continuation → this is one of your golden strong‑buy plays.");
  } else {
    notes.push("No clean bullish flag detected.");
  }

  // Reversal + even number logic (your existing toggles)
  if (reversal === "yes") notes.push("Strong reversal candle confirmed.");
  else notes.push("No reversal candle confirmed.");

  if (evenReaction === "yes") {
    const level = nearestEven(price);
    notes.push("Reaction at clean even number: " + level);
  } else {
    notes.push("No even number reaction.");
  }

  if (!isNaN(dayHigh) && !isNaN(dayLow)) {
    const range = dayHigh - dayLow;
    if (range > 0) {
      const pos = (price - dayLow) / range;
      if (pos < 0.2) notes.push("Price near day low → bottom area.");
      else if (pos > 0.8) notes.push("Price near day high → top area.");
    }
  }

  // For flags, we allow valid if direction is CALL and patternOk from flag
  const valid = (direction !== "none" && patternOk && reversal === "yes" && evenReaction === "yes");

  let entry = "", stop = "";
  if (valid) {
    if (direction === "call") {
      entry = nextEvenUp(price);
      stop = (entry * 0.8).toFixed(2);
    } else {
      entry = nextEvenDown(price);
      stop = (entry * 1.2).toFixed(2);
    }
  }

  return { direction, valid, entry, stop, notes };
}

// ------------------------------
// OPTIONS CHAIN PARSER
// ------------------------------
export function parseChainLoose(text) {
  const rows = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  lines.forEach(line => {
    const parts = line.split(/[\s,|]+/).filter(x => x.length);
    const nums = parts.map(x => parseFloat(x)).filter(x => !isNaN(x));
    if (nums.length >= 5) {
      const strike  = nums[0];
      const callBid = nums[1];
      const callAsk = nums[2];
      const putBid  = nums[3];
      const putAsk  = nums[4];
      rows.push({ strike, callBid, callAsk, putBid, putAsk });
    }
  });

  return rows;
}

// ------------------------------
// CONTRACT PICKER
// ------------------------------
export function pickBestContract(direction, entry, price, days, chain) {
  if (direction === "none" || !entry || !price) {
    return {
      html: `
        <h2>No Options Idea</h2>
        <p>The setup is not clear enough to turn into an options trade.</p>
      `
    };
  }

  if (!chain.length) {
    return {
      html: `
        <h2>No Chain Data</h2>
        <p>Please paste your options chain or upload a clearer screenshot.</p>
      `
    };
  }

  let best = null;
  const notes = [];

  if (direction === "call") {
    notes.push("Looking for a CALL that is in the money or very close to your even‑number entry.");
    chain.forEach(row => {
      if (row.strike <= entry) {
        const distance = Math.abs(entry - row.strike);
        if (!best || distance < Math.abs(entry - best.strike)) best = { ...row, type: "CALL" };
      }
    });
    if (!best) {
      chain.forEach(row => {
        if (row.strike > entry) {
          const distance = Math.abs(entry - row.strike);
          if (!best || distance < Math.abs(entry - best.strike)) best = { ...row, type: "CALL" };
        }
      });
    }
  } else {
    notes.push("Looking for a PUT that is in the money or very close to your even‑number entry.");
    chain.forEach(row => {
      if (row.strike >= entry) {
        const distance = Math.abs(entry - row.strike);
        if (!best || distance < Math.abs(entry - best.strike)) best = { ...row, type: "PUT" };
      }
    });
    if (!best) {
      chain.forEach(row => {
        if (row.strike < entry) {
          const distance = Math.abs(entry - row.strike);
          if (!best || distance < Math.abs(entry - best.strike)) best = { ...row, type: "PUT" };
        }
      });
    }
  }

  if (!best) {
    return {
      html: `
        <h2>No Matching Contract</h2>
        <p>Could not find a strike near the entry level.</p>
      `
    };
  }

  let midPrice = 0;
  if (best.type === "CALL") midPrice = (best.callBid + best.callAsk) / 2;
  else midPrice = (best.putBid + best.putAsk) / 2;
  midPrice = isNaN(midPrice) ? 0 : midPrice;

  const stopLossOption = (midPrice * 0.8).toFixed(2);

  notes.push("Picked the strike closest to your even‑number entry.");
  notes.push("Used the middle of bid and ask as a rough option price.");
  notes.push("Simple idea: risk about 20% of the option price.");

  let directionText = direction === "call"
    ? "CALL (you think price will go up from the even number)."
    : "PUT (you think price will go down from the even number).";

  let expiryText = "";
  if (days <= 2) expiryText = "very short‑term move (1–2 days).";
  else if (days <= 5) expiryText = "short‑term move (3–5 days).";
  else if (days <= 10) expiryText = "about a week or so.";
  else if (days <= 20) expiryText = "a couple of weeks.";
  else expiryText = "a swing over about a month.";

  return {
    html: `
      <h2>Suggested Options Contract</h2>
      <p><strong>Direction:</strong> ${directionText}</p>
      <p><strong>Strike:</strong> ${best.strike}</p>
      <p><strong>Type:</strong> ${best.type}</p>
      <p><strong>Approx. Option Price:</strong> ${midPrice ? midPrice.toFixed(2) : "N/A"}</p>
      <p><strong>Simple Stop Idea on Option:</strong> about ${stopLossOption} (20% below that rough price).</p>
      <p><strong>Expiration:</strong> This looks like a ${expiryText}</p>
      <h3>Why this contract:</h3>
      <ul>${notes.map(n => `<li>${n}</li>`).join("")}</ul>
    `
  };
}
