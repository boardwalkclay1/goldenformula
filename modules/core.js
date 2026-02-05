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
// CHART TEXT PARSER
// ------------------------------
export function parseChartText(raw) {
  const text = raw.replace(/\s+/g, ' ');
  const out = {};

  const riotLineMatch = text.match(/RIOT[^0-9]*([0-9]+[.,][0-9]+)/i);
  if (riotLineMatch) out.price = parseFloat(riotLineMatch[1].replace(',', '.'));

  const hlMatch = text.match(/H\/L[^0-9]*([0-9.]+)\s*[-–]\s*([0-9.]+)/i);
  if (hlMatch) {
    out.dayHigh = parseFloat(hlMatch[1]);
    out.dayLow  = parseFloat(hlMatch[2]);
  }

  const ma20 = text.match(/MA20[:\s]*([0-9.]+)/i);
  const ma50 = text.match(/MA50[:\s]*([0-9.]+)/i);
  const ma200 = text.match(/MA200[:\s]*([0-9.]+)/i);
  if (ma20) out.maFast = parseFloat(ma20[1]);
  if (ma50) out.maSlow = parseFloat(ma50[1]);
  if (ma200) out.ma200 = parseFloat(ma200[1]);

  const nums = (text.match(/[0-9]+[.,]?[0-9]*/g) || [])
    .map(x => parseFloat(x.replace(',', '.')))
    .filter(x => !isNaN(x));

  if (!out.price && nums.length) out.price = nums[0];
  if ((!out.dayHigh || !out.dayLow) && nums.length >= 3) {
    out.dayHigh = out.dayHigh ?? Math.max(...nums);
    out.dayLow  = out.dayLow  ?? Math.min(...nums);
  }

  return out;
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

  if (maFast > maSlow && price > maFast) {
    direction = "call";
    notes.push("Fast moving average is above slow and price is above both → up move.");
  } else if (maFast < maSlow && price < maFast) {
    direction = "put";
    notes.push("Fast moving average is below slow and price is below both → down move.");
  } else {
    notes.push("Moving averages do not clearly show up or down.");
  }

  if (!isNaN(ma200)) {
    if (maFast > maSlow && maFast > ma200) notes.push("Fast above slow and long → golden cross style uptrend.");
    if (maFast < maSlow && maFast < ma200) notes.push("Fast below slow and long → death cross style downtrend.");
  }

  const diff = Math.abs(maFast - maSlow);
  if (diff <= price * 0.005) notes.push("Fast and slow moving averages are very close → a cross may be coming.");

  let patternOk = false;
  if (direction === "call" && (pattern === "doubleBottom" || pattern === "roundingBottom")) {
    patternOk = true; notes.push("Obvious bottom pattern marked.");
  }
  if (direction === "put" && (pattern === "doubleTop" || pattern === "roundingTop")) {
    patternOk = true; notes.push("Obvious top pattern marked.");
  }
  if (!patternOk) notes.push("Pattern does not clearly match the direction.");

  if (reversal === "yes") notes.push("Strong reversal candle at the turning point.");
  else notes.push("No strong reversal candle confirmed.");

  if (evenReaction === "yes") {
    const level = nearestEven(price);
    notes.push("Price reacted at a clean even number around " + level + ".");
  } else {
    notes.push("No clear reaction at an even number.");
  }

  if (!isNaN(dayHigh) && !isNaN(dayLow)) {
    const range = dayHigh - dayLow;
    if (range > 0) {
      const pos = (price - dayLow) / range;
      if (pos < 0.2) notes.push("Price is near the low of the day → could be a bottom area.");
      else if (pos > 0.8) notes.push("Price is near the high of the day → could be a top area.");
    }
  }

  const valid = (direction !== "none" && patternOk && reversal === "yes" && evenReaction === "yes");
  let entry = "", stop = "";

  if (valid) {
    if (direction === "call") {
      entry = nextEvenUp(price);
      stop = (entry * 0.8).toFixed(2);
      notes.push("CALL idea. Enter at the next even number above: " + entry + ".");
      notes.push("Stop loss is 20% below entry: " + stop + ".");
    } else {
      entry = nextEvenDown(price);
      stop = (entry * 1.2).toFixed(2);
      notes.push("PUT idea. Enter at the next even number below: " + entry + ".");
      notes.push("Stop loss is 20% above entry: " + stop + ".");
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
