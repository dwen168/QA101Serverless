const { callDeepSeek } = require('../../../backend/lib/llm');
const { loadSkills } = require('../../../backend/lib/skill-loader');
const { computeMovingAverage, parseJsonResponse, requireObject } = require('../../../backend/lib/utils');
const { computeEdaFactors } = require('../../../backend/lib/technical-indicators');

const skills = loadSkills();

function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function buildCharts(marketData) {
  const { priceHistory, analystConsensus, ticker } = marketData;
  const labels = priceHistory.map((day) => day.date.slice(5));
  const prices = priceHistory.map((day) => day.close);
  const volumes = priceHistory.map((day) => day.volume);
  const ma10 = computeMovingAverage(prices, 10);
  const ma20 = computeMovingAverage(prices, 20);
  const avgVolumeSeries = prices.map(() => marketData.avgVolume);
  const sourceBuckets = (marketData.news || []).reduce((accumulator, headline) => {
    const source = String(headline?.source || 'Unknown').trim() || 'Unknown';
    const sentiment = safeNumber(headline?.sentiment, 0);
    if (!accumulator[source]) {
      accumulator[source] = { sum: 0, count: 0 };
    }
    accumulator[source].sum += sentiment;
    accumulator[source].count += 1;
    return accumulator;
  }, {});
  const sentimentSources = Object.keys(sourceBuckets);
  const sentimentBySource = sentimentSources.map((source) => {
    const bucket = sourceBuckets[source];
    return bucket.count > 0 ? parseFloat((bucket.sum / bucket.count).toFixed(2)) : 0;
  });

  return {
    priceChart: {
      type: 'line',
      title: `${ticker} - 30-Day Price & Moving Averages`,
      data: {
        labels,
        datasets: [
          { label: 'Price', data: prices, borderColor: '#00d4ff', backgroundColor: 'rgba(0,212,255,0.08)', tension: 0.3, fill: true, pointRadius: 0 },
          { label: 'MA10', data: ma10, borderColor: '#f59e0b', borderDash: [4, 4], tension: 0.3, pointRadius: 0, fill: false },
          { label: 'MA20', data: ma20, borderColor: '#10b981', borderDash: [8, 4], tension: 0.3, pointRadius: 0, fill: false },
        ],
      },
    },
    volumeChart: {
      type: 'bar',
      title: `${ticker} - Volume Analysis`,
      data: {
        labels,
        datasets: [
          { label: 'Volume', data: volumes, backgroundColor: volumes.map((volume) => (volume > marketData.avgVolume * 1.3 ? 'rgba(239,68,68,0.7)' : 'rgba(0,212,255,0.4)')) },
          { label: 'Avg Volume', data: avgVolumeSeries, type: 'line', borderColor: '#f59e0b', borderDash: [5, 5], pointRadius: 0, fill: false },
        ],
      },
    },
    analystChart: {
      type: 'doughnut',
      title: `${ticker} - Analyst Consensus`,
      data: {
        labels: ['Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell'],
        datasets: [{
          data: [
            analystConsensus.strongBuy,
            analystConsensus.buy,
            analystConsensus.hold,
            analystConsensus.sell,
            analystConsensus.strongSell,
          ],
          backgroundColor: ['#10b981', '#6ee7b7', '#f59e0b', '#f87171', '#dc2626'],
          borderWidth: 2,
          borderColor: '#0a0f1e',
        }],
      },
    },
    sentimentChart: {
      type: 'bar',
      title: `${ticker} - News Sentiment by Source`,
      data: {
        labels: sentimentSources,
        datasets: [{
          label: 'Avg Sentiment Score',
          data: sentimentBySource,
          backgroundColor: sentimentBySource.map((value) => (value > 0 ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.7)')),
        }],
      },
    },
  };
}

function buildFallbackInsights(marketData) {
  const edaFactors = marketData?.technicalIndicators?.edaFactors || computeEdaFactors(marketData.priceHistory);
  return {
    insights: [
      `RSI at ${marketData.rsi} - ${marketData.rsi > 70 ? 'overbought territory' : marketData.rsi < 30 ? 'oversold territory' : 'healthy range'}`,
      `Price is ${((marketData.price / marketData.ma50 - 1) * 100).toFixed(1)}% above MA50`,
      `Sentiment score of ${marketData.sentimentScore} indicates ${marketData.sentimentLabel} market mood`,
      `Analyst upside potential: ${marketData.analystConsensus.upside}%`,
    ],
    riskFlags: marketData.rsi > 70 ? ['Overbought - potential pullback risk'] : [],
    technicalSummary: `${marketData.ticker} shows a ${marketData.trend} trend with RSI at ${marketData.rsi}.`,
    momentumSignal: marketData.changePercent > 0 ? 'POSITIVE' : 'NEGATIVE',
    edaFactors,
  };
}

function normalizeMomentumSignal(value, fallbackValue = 'NEUTRAL') {
  const raw = String(value || '').trim().toUpperCase();
  if (!raw) return fallbackValue;

  if (['POSITIVE', 'NEGATIVE', 'NEUTRAL'].includes(raw)) {
    return raw;
  }

  if (/BULL|UP|STRONG_UP|RISING|GAIN/.test(raw)) {
    return 'POSITIVE';
  }
  if (/BEAR|DOWN|STRONG_DOWN|FALL|LOSS/.test(raw)) {
    return 'NEGATIVE';
  }
  if (/N\/A|NA|UNKNOWN|NONE/.test(raw)) {
    return fallbackValue;
  }

  return fallbackValue;
}

function sanitizeText(value) {
  return String(value || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeEdaInsights(parsed, fallback) {
  const insights = Array.isArray(parsed?.insights)
    ? parsed.insights.map((item) => sanitizeText(item)).filter(Boolean).slice(0, 6)
    : [];

  const riskFlags = Array.isArray(parsed?.riskFlags)
    ? parsed.riskFlags.map((item) => sanitizeText(item)).filter(Boolean).slice(0, 6)
    : [];

  const technicalSummary = sanitizeText(parsed?.technicalSummary) || fallback.technicalSummary;
  const momentumSignal = normalizeMomentumSignal(parsed?.momentumSignal, fallback.momentumSignal);

  return {
    insights: insights.length > 0 ? insights : fallback.insights,
    riskFlags,
    technicalSummary,
    momentumSignal,
    edaFactors: fallback.edaFactors,
  };
}

async function runEdaVisualAnalysis({ marketData }, dependencies = {}) {
  requireObject(marketData, 'marketData');

  const charts = buildCharts(marketData);
  const fallback = buildFallbackInsights(marketData);
  const llm = dependencies.callDeepSeek || callDeepSeek;
  const systemPrompt = `You are a senior quantitative analyst. Analyze market data and provide key Exploratory Data Analysis (EDA) insights.

Your task:
1. Provide 4 key observations in 'insights' (plain English, quantitative where possible).
2. List 'riskFlags' (e.g., "Overbought - potential pullback risk").
3. Write a 1-2 sentence 'technicalSummary' synthesizing the technical picture.
4. Set 'momentumSignal' to POSITIVE, NEGATIVE, or NEUTRAL.

Return JSON ONLY. Format:
{
  "insights": ["...", "...", "...", "..."],
  "riskFlags": ["..."],
  "technicalSummary": "...",
  "momentumSignal": "..."
}`;
  const userMessage = `Provide EDA insights for ${marketData.ticker}.\n\nContext:\n- Price=${marketData.price}, Change%=${marketData.changePercent}, RSI=${marketData.rsi}, Trend=${marketData.trend}\n- MA20=${marketData.ma20}, MA50=${marketData.ma50}, MA200=${marketData.ma200}\n- SentimentScore=${marketData.sentimentScore}, SentimentLabel=${marketData.sentimentLabel}\n- MacroRisk=${marketData.macroContext?.riskLevel || 'N/A'}, MacroTone=${marketData.macroContext?.sentimentLabel || 'N/A'}\n- MacroContext=${marketData.macroContext?.marketContext || 'N/A'}\n- TopNews=${(marketData.news || []).slice(0, 5).map((item) => `${item.title} [${item.sentiment}]`).join(' | ')}\n- Indicators=${JSON.stringify(marketData.technicalIndicators || {}, null, 2)}`;

  try {
    const analysis = await llm(systemPrompt, userMessage);
    const parsed = parseJsonResponse(analysis, {});
    const edaInsights = normalizeEdaInsights(parsed, fallback);
    return { charts, edaInsights, skillUsed: 'eda-visual-analysis' };
  } catch {
    return { charts, edaInsights: fallback, skillUsed: 'eda-visual-analysis' };
  }
}

module.exports = {
  buildCharts,
  runEdaVisualAnalysis,
};