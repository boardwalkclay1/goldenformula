// simulator.js
import { runGoldenPipeline } from "./core-logic.js";

const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const canvas = document.getElementById("sim-canvas");
const statusEl = document.getElementById("sim-status");
const outputEl = document.getElementById("sim-output");
const logEl = document.getElementById("sim-log");

function log(msg) {
  logEl.textContent += msg + "\n";
}

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

async function loadImage(file) {
  statusEl.textContent = "Loading image...";
  logEl.textContent = "";

  const img = new Image();
  img.src = URL.createObjectURL(file);

  img.onload = async () => {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw uploaded screenshot
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    statusEl.textContent = "Running Golden Simulator...";

    const result = await runGoldenPipeline(canvas, log);

    statusEl.textContent = "Done.";

    outputEl.innerHTML = `
      <h3>Golden Formula Score: ${result.scoring.gfScore}</h3>
      <pre>${result.narrative}</pre>
    `;
  };
}
