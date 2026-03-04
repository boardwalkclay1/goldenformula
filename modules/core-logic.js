// core-logic.js
// Golden Simulator — Full Intelligence Pipeline Orchestrator

// ------------------------------
// INPUT MODULES
// ------------------------------
import { detectPriceAxis } from "./modules/input/axisDetector.js";
import { extractCandles } from "./modules/input/candleExtractor.js";
import { parseTimeAxis } from "./modules/input/timeParser.js";

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

// ------------------------------
// UTILITIES (ROOT LEVEL)
// ------------------------------
import { nearestEven, nextEvenUp, nextEvenDown } from "./helpers.js";
import { parseChainLoose, pickBestContract } from "./options.js";

// ------------------------------
// MAIN PIPELINE FUNCTION
// ------------------------------
export async function runGoldenPipeline(canvas, log = () => {}) {
  log("Detecting price axis...");
  const axis = await detectPriceAxis(canvas);

  log("Extracting candles...");
  const candleData = await extractCandles(canvas, axis);

  log("Parsing time axis...");
  const time = await parseTimeAxis(canvas, candleData);

  log("Analyzing trend...");
  const trend = analyzeTrend(candleData.candles);

  log("Analyzing volatility...");
  const volatility = analyzeVolatility(candleData.candles);

  log("Analyzing liquidity...");
  const liquidity = analyzeLiquidity(candleData.candles);

  log("Analyzing patterns...");
  const patterns = analyzePatterns(candleData.candles, trend, volatility);

  log("Evaluating Golden Formula rules...");
  const rules = evaluateGFRules({
    trend,
    volatility,
    liquidity,
    candles: candleData.candles,
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
  });

  log("Building timing guidance...");
  const timing = buildGFTiming({
    scoring,
    trend,
    volatility,
    patterns,
    candleSpacing: time.spacing,
  });

  log("Rendering cinematic chart...");
  renderGoldChart(canvas, candleData.candles, axis, liquidity, scoring, patterns);

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

    nearestEven,
    nextEvenUp,
    nextEvenDown,
    parseChainLoose,
    pickBestContract,
  };
}
