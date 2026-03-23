function toSignalId(signal, index) {
  const bucket = String(signal?.bucket || 'misc').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const name = String(signal?.name || `signal-${index + 1}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `sig-${bucket}-${name || index + 1}`;
}

function normalizeSignals(signals = []) {
  return signals.map((signal, index) => ({
    id: toSignalId(signal, index),
    name: signal?.name || `Signal ${index + 1}`,
    bucket: String(signal?.bucket || 'misc').toLowerCase(),
    points: Number(signal?.points || 0),
    reason: signal?.reason || 'No reason provided',
  }));
}

function selectTopByAbsPoints(signals, limit = 5) {
  return [...signals]
    .sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
    .slice(0, limit);
}

// Each pillar is assigned an exclusive set of scoring buckets.
const PILLAR_DEFS = [
  {
    id: 'technical-trend',
    label: 'Technical Trend',
    description: 'Price action, moving averages, momentum, and technical indicators (MACD, RSI, BB, KDJ, OBV)',
    buckets: ['trend', 'longtrend', 'oscillator', 'momentum', 'technical', 'intraday'],
  },
  {
    id: 'fundamental-value',
    label: 'Fundamental Value',
    description: 'Company earnings (EPS/P·E), analyst ratings, and price targets',
    buckets: ['valuation', 'analyst'],
  },
  {
    id: 'news-sentiment',
    label: 'News & Sentiment',
    description: 'News flow, market sentiment score, short interest, and EDA volume/breakout patterns',
    buckets: ['sentiment', 'eda'],
  },
  {
    id: 'macro-context',
    label: 'Macro Context',
    description: 'Macroeconomic regime, sector overlays, central bank policy, and event-regime profiles',
    buckets: ['macro'],
  },
];

function buildDecisionTree({
  score = 0,
  signals = [],
  confidence = 0,
  action = 'HOLD',
  macroOverlay = {},
  eventRegimeOverlay = {},
}) {
  const normalizedScore = Number(score || 0);
  const normalizedConfidence = Number(confidence || 0);
  const signalPool = normalizeSignals(signals);

  // ── Build the four named pillars ──────────────────────────────────────────
  const pillars = PILLAR_DEFS.map((def) => {
    const pillarSignals = signalPool.filter((s) => def.buckets.includes(s.bucket));
    const netScore = parseFloat(
      pillarSignals.reduce((sum, s) => sum + s.points, 0).toFixed(1)
    );
    const outcome = netScore > 0.5 ? 'bullish' : netScore < -0.5 ? 'bearish' : 'neutral';
    return {
      id: def.id,
      label: def.label,
      description: def.description,
      netScore,
      outcome,
      topSignals: selectTopByAbsPoints(pillarSignals, 5),
    };
  });

  // ── Risk Penalty pillar (cross-cutting negative drag) ─────────────────────
  const totalPositive = signalPool
    .filter((s) => s.points > 0)
    .reduce((sum, s) => sum + s.points, 0);
  const totalNegative = signalPool
    .filter((s) => s.points < 0)
    .reduce((sum, s) => sum + Math.abs(s.points), 0);
  const totalMagnitude = totalPositive + totalNegative;
  const riskPressurePct = totalMagnitude > 0
    ? parseFloat(((totalNegative / totalMagnitude) * 100).toFixed(1))
    : 0;
  const riskOutcome = riskPressurePct > 50 ? 'high' : riskPressurePct > 28 ? 'moderate' : 'low';

  pillars.push({
    id: 'risk-penalty',
    label: 'Risk Penalty',
    description: 'Aggregate of all bearish/headwind signals across every category, reducing trade conviction',
    netScore: -parseFloat(totalNegative.toFixed(1)),
    outcome: riskOutcome,           // 'low' | 'moderate' | 'high'
    riskPressurePct,
    inverse: true,
    topSignals: selectTopByAbsPoints(signalPool.filter((s) => s.points < 0), 5),
  });

  const bullishPillars = pillars
    .filter((p) => !p.inverse && p.outcome === 'bullish')
    .map((p) => p.label);

  return {
    title: 'Factor Contribution',
    pillars,
    leaf: {
      action,
      score: normalizedScore,
      confidence: Math.round(normalizedConfidence),
      summary: bullishPillars.length
        ? `${action} supported by ${bullishPillars.join(' + ')}, with ${riskPressurePct}% risk pressure across all signals.`
        : `${action} with ${riskPressurePct}% risk pressure and mixed factor signals.`,
    },
  };
}

module.exports = {
  buildDecisionTree,
};
