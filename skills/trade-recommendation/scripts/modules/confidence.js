const { getRecommendedScoreScale } = require('../../../../backend/lib/weights-loader');

const CONFIDENCE_CONFIG = {
  BASE_SCORE: 42,
  TANH_MULTIPLIER: 34,
  TANH_SCALAR: 1.8,
  CONSISTENCY_SCALAR: 14,
  CONFLICT_PENALTY_THRESHOLD: 0.3,
  CONFLICT_PENALTY_MIN_MAGNITUDE: 5,
  CONFLICT_PENALTY_VALUE: -6,
  LOW_SIGNAL_COUNT_THRESHOLD: 3,
  LOW_SIGNAL_PENALTY: -4,
  HIGH_SIGNAL_COUNT_THRESHOLD: 10,
  HIGH_SIGNAL_BOOST: 2,
  MACRO_HIGH_RISK_PENALTY: -8,
  MACRO_LOW_RISK_BOOST: 3,
  MIN_CONFIDENCE: 30,
  MAX_CONFIDENCE: 92
};

function computeConfidence(score, signals = [], macroRisk = 'MEDIUM') {
  const absScore = Math.abs(Number(score) || 0);
  const divisor = getRecommendedScoreScale();
  const normalizedScore = Math.min(1, absScore / divisor);

  // Saturate slowly so mid scores do not jump to very high confidence.
  const baseConfidence = CONFIDENCE_CONFIG.BASE_SCORE + Math.round(CONFIDENCE_CONFIG.TANH_MULTIPLIER * Math.tanh(normalizedScore * CONFIDENCE_CONFIG.TANH_SCALAR));

  const magnitudes = signals.map((signal) => Number(signal?.points) || 0);
  const positive = magnitudes.filter((value) => value > 0).reduce((sum, value) => sum + value, 0);
  const negative = magnitudes.filter((value) => value < 0).reduce((sum, value) => sum + Math.abs(value), 0);
  const totalMagnitude = positive + negative;
  const alignment = totalMagnitude > 0 ? Math.abs(positive - negative) / totalMagnitude : 0;

  // Strong one-sided evidence gets a boost; mixed evidence gets penalized.
  const consistencyAdjustment = Math.round((alignment - 0.5) * CONFIDENCE_CONFIG.CONSISTENCY_SCALAR);
  const conflictPenalty = alignment < CONFIDENCE_CONFIG.CONFLICT_PENALTY_THRESHOLD && totalMagnitude >= CONFIDENCE_CONFIG.CONFLICT_PENALTY_MIN_MAGNITUDE ? CONFIDENCE_CONFIG.CONFLICT_PENALTY_VALUE : 0;

  let confidence = baseConfidence + consistencyAdjustment + conflictPenalty;
  let signalCountAdjustment = 0;

  if (signals.length <= CONFIDENCE_CONFIG.LOW_SIGNAL_COUNT_THRESHOLD) {
    confidence += CONFIDENCE_CONFIG.LOW_SIGNAL_PENALTY;
    signalCountAdjustment = CONFIDENCE_CONFIG.LOW_SIGNAL_PENALTY;
  }
  if (signals.length >= CONFIDENCE_CONFIG.HIGH_SIGNAL_COUNT_THRESHOLD) {
    confidence += CONFIDENCE_CONFIG.HIGH_SIGNAL_BOOST;
    signalCountAdjustment = CONFIDENCE_CONFIG.HIGH_SIGNAL_BOOST;
  }

  let macroAdjustment = 0;

  if (macroRisk === 'HIGH') {
    confidence += CONFIDENCE_CONFIG.MACRO_HIGH_RISK_PENALTY;
    macroAdjustment = CONFIDENCE_CONFIG.MACRO_HIGH_RISK_PENALTY;
  } else if (macroRisk === 'LOW') {
    confidence += CONFIDENCE_CONFIG.MACRO_LOW_RISK_BOOST;
    macroAdjustment = CONFIDENCE_CONFIG.MACRO_LOW_RISK_BOOST;
  }

  const bounded = Math.max(CONFIDENCE_CONFIG.MIN_CONFIDENCE, Math.min(CONFIDENCE_CONFIG.MAX_CONFIDENCE, Math.round(confidence)));
  return {
    confidence: bounded,
    breakdown: {
      base: baseConfidence,
      consistencyAdjustment,
      conflictPenalty,
      signalCountAdjustment,
      macroAdjustment,
      rawScore: parseFloat(Number(score || 0).toFixed(1)),
      alignment: parseFloat((alignment * 100).toFixed(1)),
      positiveMagnitude: parseFloat(positive.toFixed(1)),
      negativeMagnitude: parseFloat(negative.toFixed(1)),
      totalSignalCount: signals.length,
      final: bounded,
    },
  };
}

function buildFallbackConfidenceExplanation({ action, confidence, confidenceBreakdown }) {
  const alignment = Number(confidenceBreakdown?.alignment || 0);
  const macroAdj = Number(confidenceBreakdown?.macroAdjustment || 0);
  const conflict = Number(confidenceBreakdown?.conflictPenalty || 0);
  const tone = confidence >= 70 ? 'high' : confidence >= 50 ? 'moderate' : 'cautious';
  const alignmentText = alignment >= 65 ? 'signal alignment is strong' : alignment <= 40 ? 'signals are mixed' : 'signals are moderately aligned';
  const macroText = macroAdj < 0 ? 'macro risk reduced conviction' : macroAdj > 0 ? 'macro regime supports conviction' : 'macro impact is neutral';
  const conflictText = conflict < 0 ? 'and conflict penalties applied' : '';
  return `${action} carries ${tone} conviction (${confidence}%) because ${alignmentText}; ${macroText} ${conflictText}`.trim();
}

async function generateConfidenceExplanation({ llm, ticker, action, confidence, confidenceBreakdown, signals }) {
  const fallback = buildFallbackConfidenceExplanation({ action, confidence, confidenceBreakdown });
  try {
    const systemPrompt = 'You are a quantitative analyst. Write a single concise sentence (under 100 characters) explaining confidence. No markdown.';
    const userMessage = `Ticker=${ticker}; Action=${action}; Confidence=${confidence}; Alignment=${confidenceBreakdown?.alignment}; Positive=${confidenceBreakdown?.positiveMagnitude}; Negative=${confidenceBreakdown?.negativeMagnitude}; MacroAdj=${confidenceBreakdown?.macroAdjustment}; Conflict=${confidenceBreakdown?.conflictPenalty}; SignalCount=${signals.length}.`;
    const text = await llm(systemPrompt, userMessage);
    const cleaned = String(text || '').replace(/\s+/g, ' ').replace(/\`\`\`/g, '').trim();
    return cleaned || fallback;
  } catch (error) {
    console.warn(`[Trade Recommendation] Failed to generate confidence explanation for ${ticker}:`, error.message);
    return fallback;
  }
}

module.exports = {
  computeConfidence,
  buildFallbackConfidenceExplanation,
  generateConfidenceExplanation,
  CONFIDENCE_CONFIG
};
