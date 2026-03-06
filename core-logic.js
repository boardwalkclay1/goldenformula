// core-logic.js
// Golden Simulator — Full Intelligence Pipeline Orchestrator

// ------------------------------
// INPUT MODULES
// ------------------------------
import { detectPriceAxis } from "./modules/input/axisDetector.js";
import { extractCandles } from "./modules/input/candleExtractor.js";
import { parseTimeAxis } from "./modules/input/timeAxisParser.js";

// ------------------------------
// ANALYSIS MODULES
// ------------------------------
import { analyzeTrend } from "./modules/analysis/trendModel.js";
import { analyzeVolatility } from "./modules/analysis/volatilityModel.js";
import { analyzeLiquidity } from "./modules/analysis/liquidityModel.js";
import { analyzePatterns } from "./modules/analysis/patternModel.js";

// ------------------------------
// GOLDEN FORMULA MODULES
// ------------------------------
import { evaluateGFRules } from "./modules/golden/gfRules.js";
import { scoreGoldenFormula } from "./modules/golden/gfScoring.js";
import { buildGFNarrative } from "./modules/golden/gfNarrative.js";
import { buildGFTiming } from "./modules/golden/gfTiming.js";

// ------------------------------
// RENDERING MODULES
// ------------------------------
import { renderGoldChart } from "./modules/render/goldChart.js";
import { renderOverlays } from "./modules/render/overlays.js";
import { renderAnnotations } from "./modules/render/annotations.js";

// ------------------------------
// UTILITIES (ROOT LEVEL)
// ------------------------------
import { nearestEven, nextEvenUp, nextEvenDown } from "./helpers.js";
import { parseChainLoose, pickBestContract } from "./options.js";

// ------------------------------
// MAIN PIPELINE FUNCTION
// ------------------------------
// ocrText is optional and comes from simulator.js (Tesseract output)
export async function runGoldenPipeline(canvas, log = () => {}, ocrText = null) {
  // 1) INPUT STAGE ---------------------------------------
  log("Detecting price axis...");
  const axis = await detectPriceAxis(canvas);

  log("Extracting candles...");
  const candleData = await extractCandles(canvas, axis);

  log("Parsing time axis...");
  const time = await parseTimeAxis(canvas, candleData);

  // 2) ANALYSIS STAGE ------------------------------------
  log("Analyzing trend...");
  const trend = analyzeTrend(candleData.candles);

  log("Analyzing volatility...");
  const volatility = analyzeVolatility(candleData.candles);

  log("Analyzing liquidity...");
  const liquidity = analyzeLiquidity(candleData.candles);

  log("Analyzing patterns...");
  const patterns = analyzePatterns(candleData.candles, trend, volatility);

  // 3) GOLDEN FORMULA EVALUATION -------------------------
  log("Evaluating Golden Formula rules...");
  const rules = evaluateGFRules({
    candles: candleData.candles,
    trend,
    patterns,
    liquidity,
    volatility,
    time,
  });

  log("Scoring Golden Formula...");
  const scoring = scoreGoldenFormula({
    trend,
    volatility,
    liquidity,
    rules,
    candles: candleData.candles,
  });

  log("Building narrative...");
  const narrative = buildGFNarrative({
    scoring,
    rules,
    trend,
    volatility,
    liquidity,
    patterns,
    ocrText,
  });

  log("Building timing guidance...");
  const timing = buildGFTiming({
    candles: candleData.candles,
    trend,
    liquidity,
    volatility,
    patterns,
    time,
  });

  // 4) RENDERING STAGE -----------------------------------
  log("Rendering cinematic chart...");
  renderGoldChart(canvas, candleData.candles, axis, liquidity, scoring, patterns);

  log("Rendering overlays...");
  renderOverlays(canvas, {
    axis,
    candles: candleData.candles,
    rules,
    scoring,
    timing,
    patterns,
  });

  log("Rendering annotations...");
  renderAnnotations(canvas, {
    axis,
    candles: candleData.candles,
    rules,
    scoring,
    narrative,
    timing,
    ocrText,
  });

  // 5) PIPELINE OUTPUT -----------------------------------
  return {
    axis,
    candles: candleData.candles,
    time,
    trend,
    volatility,
    liquidity,
    patterns,
    rules,
    scoring,
    narrative,
    timing,
    ocrText,

    nearestEven,
    nextEvenUp,
    nextEvenDown,
    parseChainLoose,
    pickBestContract,
  };
}
