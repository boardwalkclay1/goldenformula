// modules/ocr.js
export function attachAutoOCR(inputId, targetTextareaId, statusId) {
  const input = document.getElementById(inputId);
  const status = document.getElementById(statusId);
  const target = document.getElementById(targetTextareaId);

  input.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    status.textContent = "Reading image...";
    Tesseract.recognize(file, 'eng').then(({ data }) => {
      const text = data.text || "";
      target.value = text;
      status.textContent = "Image read. Text pasted automatically.";
    }).catch(() => {
      status.textContent = "Could not read image. Try a clearer screenshot.";
    });
  });
}
