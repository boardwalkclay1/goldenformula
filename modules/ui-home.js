// modules/ui-home.js
import { parseChartText, autoCorrectNumber, runGoldenFormula } from './core.js';
import { attachAutoOCR } from './ocr.js';

export function initHome() {
  attachAutoOCR("imageInput", "pasteBox", "ocrStatus");

  const btn = document.getElementById("findSetupBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const raw = document.getElementById("pasteBox").value || "";
    const parsed = raw ? parseChartText(raw) : {};

    const price   = autoCorrectNumber(parsed.price   ?? parseFloat(document.getElementById("price").value),   1, 1000);
    const dayHigh = autoCorrectNumber(parsed.dayHigh ?? parseFloat(document.getElementById("dayHigh").value), 1, 1000);
    const dayLow  = autoCorrectNumber(parsed.dayLow  ?? parseFloat(document.getElementById("dayLow").value),  1, 1000);
    const maFast  = autoCorrectNumber(parsed.maFast  ?? parseFloat(document.getElementById("maFast").value),  1, 1000);
    const maSlow  = autoCorrectNumber(parsed.maSlow  ?? parseFloat(document.getElementById("maSlow").value),  1, 1000);
    const ma200   = autoCorrectNumber(parsed.ma200   ?? parseFloat(document.getElementById("ma200").value),   1, 1000);

    const timeframe    = document.getElementById("timeframe").value;
    const pattern      = document.getElementById("pattern").value;
    const reversal     = document.getElementById("reversal").value;
    const evenReaction = document.getElementById("evenReaction").value;

    const data = { price, dayHigh, dayLow, maFast, maSlow, ma200 };
    const result = runGoldenFormula(data, pattern, reversal, evenReaction);

    const out = document.getElementById("output");
    if (!result.valid) {
      out.innerHTML = `
        <h2>No Trade – Not Simple Enough</h2>
        <ul>${result.notes.map(r => `<li>${r}</li>`).join("")}</ul>
      `;
    } else {
      out.innerHTML = `
        <h2>Trade Idea Found</h2>
        <p><strong>Type:</strong> ${result.direction === "call" ? "CALL (bet on up)" : "PUT (bet on down)"}</p>
        <p><strong>Entry:</strong> ${result.entry}</p>
        <p><strong>Stop (20%):</strong> ${result.stop}</p>
        <ul>${result.notes.map(r => `<li>${r}</li>`).join("")}</ul>
      `;
    }

    localStorage.setItem("gf_direction", result.direction);
    localStorage.setItem("gf_entry", result.entry || "");
    localStorage.setItem("gf_stop", result.stop || "");
    localStorage.setItem("gf_price", price || "");
    localStorage.setItem("gf_maFast", maFast || "");
    localStorage.setItem("gf_maSlow", maSlow || "");
    localStorage.setItem("gf_ma200", ma200 || "");
    localStorage.setItem("gf_dayHigh", dayHigh || "");
    localStorage.setItem("gf_dayLow", dayLow || "");
    localStorage.setItem("gf_timeframe", timeframe);
  });
}

// auto‑init when loaded on index.html
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("findSetupBtn")) {
    initHome();
  }
});
