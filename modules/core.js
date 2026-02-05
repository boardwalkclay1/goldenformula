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
// OPTIONS CHAIN PARSER
// ------------------------------
export function parseChainLoose(text) {
  const rows = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  lines.forEach(line => {
    const parts = line.split(/[\s,|]+/).filter(x => x.length);
    const nums = parts.map(x => parseFloat(x)).filter(x => !isNaN(x));
    if (nums.length >= 5) {
      const strike = nums[0];
      const callBid = nums[1];
      const callAsk = nums[2];
      const putBid = nums[3];
      const putAsk = nums[4];
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
