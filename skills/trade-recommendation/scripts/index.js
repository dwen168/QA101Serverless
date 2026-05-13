const { callDeepSeek } = require('../../../backend/lib/llm');
const { loadSkills } = require('../../../backend/lib/skill-loader');
const { parseJsonResponse, requireObject } = require('../../../backend/lib/utils');
const { getWeightsMetadata } = require('../../../backend/lib/weights-loader');

const { normalizeTimeHorizon, getRecommendationProfile, mapActionFromScore, buildObjectiveLensSummary } = require('./modules/profiles');
const { computeConfidence, generateConfidenceExplanation } = require('./modules/confidence');
const { findHistoricalPatterns } = require('./modules/historical');
const { scoreSignals, scoreBacktestSnapshot } = require('./modules/scoring');
const { buildDecisionTree } = require('./modules/decision-tree');
const { runRecommendationBacktest } = require('./backtest');
const { computeRiskMetrics } = require('./modules/risk');

const skills = loadSkills();

function mapAction(score, timeHorizon = 'MEDIUM') {
  return mapActionFromScore(score, timeHorizon);
}

function buildFallbackRecommendation(marketData, action, signals, confidence, buyRatio, profile) {
  const macro = marketData?.macroContext || {};
  const macroSentence = macro.available
    ? `Macro regime is ${String(macro.riskLevel || 'MEDIUM').toLowerCase()} risk (${macro.sentimentLabel || 'BALANCED'}), which is included in signal scoring.`
    : 'Macro regime data is limited, so conviction relies more on ticker-level signals.';

  const keyRisks = ['Market volatility', 'Sector headwinds', 'RSI extended'];
  if (macro.riskLevel === 'HIGH') {
    keyRisks.unshift('Elevated macro and geopolitical risk regime');
  }

  if (profile.timeHorizon === 'SHORT') {
    keyRisks.unshift('Short-term execution risk and false-breakout risk over the next few weeks');
  } else if (profile.timeHorizon === 'LONG') {
    keyRisks.unshift('Fundamental revision and valuation de-rating risk over a multi-month hold');
  }

  return {
    rationale: `${profile.label} view: ${marketData.ticker} currently shows a ${marketData.trend} setup, and this recommendation emphasizes ${profile.focus.toLowerCase()}. Analyst support stands at ${(buyRatio * 100).toFixed(0)}% buy ratings. ${macroSentence}`,
    timeHorizon: profile.timeHorizon,
    keyRisks: keyRisks.slice(0, 3),
    executiveSummary: `${marketData.ticker} - ${action} for a ${profile.label.toLowerCase()} plan with ${confidence}% confidence.`,
  };
}

async function runTradeRecommendation({ marketData, edaInsights, timeHorizon = 'MEDIUM' }, dependencies = {}) {
  requireObject(marketData, 'marketData');

  const normalizedTimeHorizon = normalizeTimeHorizon(timeHorizon);
  const profile = getRecommendationProfile(normalizedTimeHorizon);

  const { signals, score, buyRatio, eventRegimeOverlay, policyOverlay } = scoreSignals(marketData, edaInsights || {}, normalizedTimeHorizon);
  const { action, actionColor } = mapAction(score, normalizedTimeHorizon);
  const macroRisk = String(marketData?.macroContext?.riskLevel || '').toUpperCase();
  const confidenceResult = computeConfidence(score, signals, macroRisk);
  const confidence = confidenceResult.confidence;
  const confidenceBreakdown = confidenceResult.breakdown;

  // Risk metrics from dedicated module
  const riskMetricsData = computeRiskMetrics(marketData, profile);
  const { entry, stopLoss, takeProfit, riskReward, atr, varMetrics } = riskMetricsData;

  const llm = dependencies.callDeepSeek || callDeepSeek;
  const systemPrompt = `You are a senior quantitative analyst. Synthesize signals and write a trade recommendation.

Your task:
1. Write a 'rationale' (2-3 sentences) explaining the recommendation based on investment objective and signals.
2. Ensure 'timeHorizon' matches the requested horizon.
3. List 2-3 specific 'keyRisks'.
4. Write a 1-sentence plain English 'executiveSummary'.

Return JSON ONLY. Format:
{
  "rationale": "...",
  "timeHorizon": "...",
  "keyRisks": ["...", "..."],
  "executiveSummary": "..."
}`;
  const userMessage = `Write a trade recommendation for ${marketData.ticker}.
Investment objective: ${profile.label} (${profile.holdingPeriod}).
Focus: ${profile.focus}.
Action: ${action}.
Score: ${score}.
Key signals: ${signals.map((signal) => `${signal.name}(${signal.points > 0 ? '+' : ''}${signal.points})`).join(', ')}.

Context:
- EDA Factors: ${JSON.stringify(edaInsights?.edaFactors || marketData?.technicalIndicators?.edaFactors || {}, null, 2)}
- EDA Insights (LLM): ${JSON.stringify(edaInsights?.insights || [], null, 2)}
- Macro Context: ${JSON.stringify(marketData.macroContext || {}, null, 2)}
- Policy Overlay: ${JSON.stringify(policyOverlay || {}, null, 2)}
- Event Regime Overlay: ${JSON.stringify(eventRegimeOverlay || {}, null, 2)}
- Fundamental Context: ${JSON.stringify({ pe: marketData.pe, eps: marketData.eps, marketCap: marketData.marketCap, analystConsensus: marketData.analystConsensus }, null, 2)}`;

  // Run LLM calls in parallel
  const [llmRecommendationResult, confidenceExplanation] = await Promise.all([
    (async () => {
      try {
        const analysis = await llm(systemPrompt, userMessage);
        return parseJsonResponse(analysis, buildFallbackRecommendation(marketData, action, signals, confidence, buyRatio, profile));
      } catch (error) {
        console.warn(`[Trade Recommendation] Failed to generate rationale for ${marketData.ticker}:`, error.message);
        return buildFallbackRecommendation(marketData, action, signals, confidence, buyRatio, profile);
      }
    })(),

    generateConfidenceExplanation({
      llm,
      ticker: marketData.ticker,
      action,
      confidence,
      confidenceBreakdown,
      signals,
    }),
  ]);

  const llmRecommendation = llmRecommendationResult;
  llmRecommendation.timeHorizon = normalizedTimeHorizon;

  // Historical pattern matching
  const historicalPatterns = findHistoricalPatterns(marketData.priceHistory, marketData);
  const objectiveLens = buildObjectiveLensSummary(signals, profile);
  const macroOverlay = {
    available: !!marketData?.macroContext?.available,
    riskLevel: marketData?.macroContext?.riskLevel || 'UNKNOWN',
    sentimentLabel: marketData?.macroContext?.sentimentLabel || 'UNKNOWN',
    dominantThemes: (marketData?.macroContext?.dominantThemes || []).slice(0, 3),
  };
  const decisionTree = buildDecisionTree({
    score,
    signals,
    confidence,
    action,
    macroOverlay,
    eventRegimeOverlay,
  });

  // Get weights metadata for transparency
  const weightsMetadata = getWeightsMetadata();

  return {
    recommendation: {
      ticker: marketData.ticker,
      action,
      actionColor,
      confidence,
      confidenceExplanation,
      confidenceBreakdown,
      score,
      signals,
      entry,
      stopLoss,
      takeProfit,
      riskReward,
      objectiveProfile: {
        timeHorizon: profile.timeHorizon,
        label: profile.label,
        holdingPeriod: profile.holdingPeriod,
        focus: profile.focus,
        amplifiedSignals: objectiveLens.amplifiedSignals,
        deemphasizedSignals: objectiveLens.deemphasizedSignals,
      },
      macroOverlay,
      policyOverlay,
      eventRegimeOverlay,
      decisionTree,
      edaOverlay: {
        available: !!edaInsights?.edaFactors?.available,
        factors: edaInsights?.edaFactors || null,
      },
      ...llmRecommendation,
      historicalPatterns,
      disclaimer: 'WARNING: For educational/demo purposes only. Not financial advice.',
    },
    riskMetrics: {
      atr14: atr,
      atrMultiplierSL: profile.atrStopMultiplier,
      atrMultiplierTP: profile.atrTargetMultiplier,
      var95: varMetrics,
      riskWarnifVarExceeds: varMetrics ? {
        message: varMetrics.interpretation,
        maxDailyLoss: varMetrics.varPrice,
        maxDailyLossPercent: Math.abs(varMetrics.varPercent),
      } : null,
    },
    weightingMetadata: {
      version: weightsMetadata.version,
      timestamp: weightsMetadata.timestamp,
      calibrated: weightsMetadata.calibrated,
      metrics: weightsMetadata.metrics,
    },
    skillUsed: 'trade-recommendation',
  };
}

// Compute a backtest-only decision (price + technicals only) for the latest bar
function computeBacktestDecision({ priceHistory, timeHorizon = 'MEDIUM' } = {}) {
  if (!Array.isArray(priceHistory) || priceHistory.length === 0) {
    throw new Error('priceHistory is required and must be a non-empty array');
  }
  const idx = priceHistory.length - 1;
  const score = scoreBacktestSnapshot(priceHistory, idx, timeHorizon);
  const { action } = mapAction(score, timeHorizon);
  return { score, action };
}

module.exports = {
  normalizeTimeHorizon,
  getRecommendationProfile,
  mapAction,
  runTradeRecommendation,
  computeBacktestDecision,
  runRecommendationBacktest,
  scoreSignals,
};