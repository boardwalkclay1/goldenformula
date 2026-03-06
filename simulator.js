// simulator.js
// Golden Simulator — Screenshot Intake + Pipeline Runner + Chart Renderer

import { runGoldenPipeline } from "./core-logic.js";

document.addEventListener("DOMContentLoaded", () => {
  // DOM ELEMENTS
  const dropZone = document.getElementById("drop-zone");
  const uploadBtn = document.getElementById("upload-btn");
  const fileInput = document.getElementById("file-input");

  const statusEl = document.getElementById("sim-status");
  const logEl = document.getElementById("sim-log");
  const outputEl = document.getElementById("sim-output");
  const narrativeList = document.getElementById("narrative-list");
  const confidenceFill = document.getElementById("confidence-fill");
  const strategyTag = document.getElementById("strategy-tag");

  const canvas = document.getElementById("sim-canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if (!dropZone || !uploadBtn || !fileInput || !canvas || !ctx) {
    console.error("Simulator wiring error: missing DOM elements or context.");
    return;
  }

  // --------------------------------------------------
  // LOGGING
  // --------------------------------------------------
  function log(msg) {
    logEl.textContent += msg + "\n";
    logEl.scrollTop = logEl.scrollHeight;
  }

  // --------------------------------------------------
  // GOLD COIN BUTTON → FILE INPUT
  // --------------------------------------------------
  uploadBtn.addEventListener("click", () => fileInput.click());

  // --------------------------------------------------
  // DRAG & DROP
  // --------------------------------------------------
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

  // --------------------------------------------------
  // FILE INPUT
  // --------------------------------------------------
  fileInput.addEventListener("change", e => {
    const file = e.target.files[0];
    if (file) loadImage(file);
  });

  // --------------------------------------------------
  // IMAGE ENHANCEMENT FOR OCR (PHONE-FRIENDLY)
  // --------------------------------------------------
  function enhanceForOCR(ctx, w, h) {
    try {
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        // Slight contrast boost
        data[i] = Math.min(255, data[i] * 1.2);
        data[i + 1] = Math.min(255, data[i + 1] * 1.2);
        data[i + 2] = Math.min(255, data[i + 2] * 1.2);

        // Light thresholding to sharpen text
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const v = avg > 140 ? 255 : 0;
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
      }

      ctx.putImageData(imgData, 0, 0);
    } catch (err) {
      console.warn("OCR enhancement skipped:", err.message);
    }
  }

  // --------------------------------------------------
  // LOAD IMAGE → DRAW TO CANVAS (REAL ASPECT RATIO)
  // --------------------------------------------------
  function loadImage(file) {
    statusEl.textContent = "Loading screenshot...";
    logEl.textContent = "";
    outputEl.textContent = "";
    narrativeList.innerHTML = "";
    confidenceFill.style.width = "0%";
    strategyTag.textContent = "";

    const img = new Image();
    img.onload = () => {
      // Preserve real screenshot dimensions (phone or desktop)
      canvas.width = img.width;
      canvas.height = img.height;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Enhance for OCR (especially for phone screenshots)
      enhanceForOCR(ctx, canvas.width, canvas.height);

      statusEl.textContent = "Running Golden Formula...";
      runPipeline();
    };
    img.onerror = () => {
      statusEl.textContent = "Error loading image.";
      log("ERROR: Could not load image.");
    };
    img.src = URL.createObjectURL(file);
  }

  // --------------------------------------------------
  // OCR + FULL PIPELINE
  // --------------------------------------------------
  async function runPipeline() {
    try {
      if (typeof Tesseract === "undefined") {
        throw new Error("Tesseract.js not loaded");
      }

      log("Extracting text (OCR)...");
      const ocr = await Tesseract.recognize(canvas, "eng", { logger: () => {} });
      const ocrText = extractOCR(ocr.data.words ?? []);

      log("Running Golden Formula pipeline...");
      const result = await runGoldenPipeline(canvas, log, ocrText);

      log("Rendering chart...");
      // goldChart.js handles rendering internally

      statusEl.textContent = "Done.";

      // --------------------------------------------------
      // SUMMARY OUTPUT
      // --------------------------------------------------
      outputEl.innerHTML = `
        <p><strong>Direction:</strong> ${result.rules.direction.toUpperCase()}</p>
        <p><strong>Entry:</strong> ${result.rules.entry.toFixed(2)}</p>
        <p><strong>Stop:</strong> ${result.rules.stop.toFixed(2)}</p>
        <p><strong>Target:</strong> ${result.rules.target.toFixed(2)}</p>
        <p><strong>Confidence:</strong> ${result.scoring.confidence.toUpperCase()} (${result.scoring.score})</p>
      `;

      // --------------------------------------------------
      // CONFIDENCE METER
      // --------------------------------------------------
      confidenceFill.style.width = `${result.scoring.score}%`;

      // --------------------------------------------------
      // STRATEGY TAG
      // --------------------------------------------------
      strategyTag.textContent =
        result.strategy?.toUpperCase() ??
        result.rules.direction.toUpperCase();

      // --------------------------------------------------
      // NARRATIVE
      // --------------------------------------------------
      narrativeList.innerHTML = "";
      if (Array.isArray(result.narrative)) {
        result.narrative.forEach(line => {
          const li = document.createElement("li");
          li.textContent = line;
          narrativeList.appendChild(li);
        });
      }

    } catch (err) {
      console.error(err);
      statusEl.textContent = "Error processing screenshot.";
      log("ERROR: " + err.message);
    }
  }

  // --------------------------------------------------
  // OCR TEXT CLEANER
  // --------------------------------------------------
  function extractOCR(words) {
    return words.map(w => ({
      text: w.text?.trim() ?? "",
      x: w.bbox?.x0 ?? 0,
      y: w.bbox?.y0 ?? 0
    }));
  }
});
