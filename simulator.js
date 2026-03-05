// simulator.js
// Golden Simulator — Screenshot Intake + Pipeline Runner + Chart Renderer

import { runGoldenPipeline } from "./core-logic.js";

const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const statusEl = document.getElementById("sim-status");
const logEl = document.getElementById("sim-log");
const outputEl = document.getElementById("sim-output");
const canvas = document.getElementById("sim-canvas");

let ctx = canvas.getContext("2d");

// ------------------------------
// LOGGING
// ------------------------------
function log(msg) {
  logEl.textContent += msg + "\n";
  logEl.scrollTop = logEl.scrollHeight;
}

// ------------------------------
// FILE HANDLING
// ------------------------------
dropZone.addEventListener("click", () => fileInput.click());

dropZone.addEventListener("dragover", e => {
  e.preventDefault();
  dropZone.classList.add("hover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("hover");
});

dropZone.addEventListener("drop", e => {
  e.preventDefault();
  dropZone.classList.remove("hover");
  const file = e.dataTransfer.files[0];
  if (file) loadImage(file);
});

fileInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (file) loadImage(file);
});

// ------------------------------
// LOAD IMAGE → DRAW TO CANVAS
// ------------------------------
function loadImage(file) {
  statusEl.textContent = "Loading image...";
  logEl.textContent = "";
  outputEl.textContent = "";

  const img = new Image();
  img.onload = () => {
    canvas.width = 900;
    canvas.height = 400;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    statusEl.textContent = "Running Golden Formula...";
    runPipeline();
  };
  img.src = URL.createObjectURL(file);
}

// ------------------------------
// OCR + PIPELINE
// ------------------------------
async function runPipeline() {
  try {
    log("Extracting text (OCR)...");
    const ocr = await Tesseract.recognize(canvas, "eng", { logger: () => {} });
    const ocrText = extractOCR(ocr.data.words);

    log("Running Golden Formula pipeline...");
    const result = await runGoldenPipeline(canvas, log);

    log("Rendering chart...");
    // goldChart.js handles everything (candles, overlays, annotations)
    // runGoldenPipeline already calls renderGoldChart internally

    statusEl.textContent = "Done.";

    outputEl.innerHTML = `
      <p><strong>Direction:</strong> ${result.rules.direction}</p>
      <p><strong>Entry:</strong> ${result.rules.entry.toFixed(2)}</p>
      <p><strong>Stop:</strong> ${result.rules.stop.toFixed(2)}</p>
      <p><strong>Target:</strong> ${result.rules.target.toFixed(2)}</p>
      <p><strong>Confidence:</strong> ${result.scoring.confidence}</p>
    `;

  } catch (err) {
    console.error(err);
    statusEl.textContent = "Error processing screenshot.";
    log("ERROR: " + err.message);
  }
}

// ------------------------------
// OCR TEXT CLEANER
// ------------------------------
function extractOCR(words) {
  return words.map(w => ({
    text: w.text.trim(),
    x: w.bbox.x0,
    y: w.bbox.y0
  }));
}
