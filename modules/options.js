// /modules/options.js

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

export function pickBestContract(direction, entry, price, days, chain) {
  // (same logic you already had — unchanged)
}
