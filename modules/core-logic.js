// core-logic.js
// Golden Simulator — Full Intelligence Pipeline Orchestrator

// ------------------------------
// IMPORT ANALYSIS MODULES
// ------------------------------
import { detectPriceAxis } from "./modules/axisDetector.js";
import { extractCandles } from "./modules/candleExtractor.js";
import { parseTimeAxis } from "./modules/timeAxisParser.js";
import { analyzeTrend } from "./modules/trendModel.js";
import { analyzeVolatility } from "./modules/volatilityModel.js";
import { analyzeLiquidity } from "./modules/liquidityModel.js";
import { analyzePatterns } from "./modules/patternModel.js";

// ------------------------------
// IMPORT GOLDEN FORMULA MODULES
// ------------------------------
import { evaluateGFRules } from "./golden/gfRules.js";
import { scoreGoldenFormula } from "./golden/gfScoring.js";
import { buildGFNarrative } from "./golden/gfNarrative.js";

// ------------------------------
// IMPORT RENDERING MODULES
// ------------------------------
import { renderGoldChart } from "./render/goldChart.js";

// ------------------------------
// IMPORT UTILITY MODULES
// ------------------------------
import { nearestEven, nextEvenUp, nextEvenDown } from "./modules/helpers.js";
import { parseChainLoose, pickBestContract } from "./modules/options.js";

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

  log("Rendering cinematic chart...");
  renderGoldChart(canvas, candleData.candles, axis, liquidity, scoring, patterns);

  // ------------------------------
  // RETURN FULL INTELLIGENCE PACKAGE
  // ------------------------------
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

    // expose helpers + options engine
    nearestEven,
    nextEvenUp,
    nextEvenDown,
    parseChainLoose,
    pickBestContract,
  };
}
