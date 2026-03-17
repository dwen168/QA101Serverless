const { callDeepSeek } = require('../llm');
const { loadSkills } = require('../skill-loader');
const { computeMovingAverage, parseJsonResponse, requireObject } = require('../utils');

const skills = loadSkills();

function buildCharts(marketData) {
  const { priceHistory, analystConsensus, ticker } = marketData;
  const labels = priceHistory.map((day) => day.date.slice(5));
  const prices = priceHistory.map((day) => day.close);
  const volumes = priceHistory.map((day) => day.volume);
  const ma10 = computeMovingAverage(prices, 10);
  const ma20 = computeMovingAverage(prices, 20);
  const avgVolumeSeries = prices.map(() => marketData.avgVolume);

  return {
    priceChart: {
      type: 'line',
      title: `${ticker} — 30-Day Price & Moving Averages`,
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
      title: `${ticker} — Volume Analysis`,
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
      title: `${ticker} — Analyst Consensus`,
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
      title: `${ticker} — News Sentiment`,
      data: {
        labels: marketData.news.map((headline) => headline.source),
        datasets: [{
          label: 'Sentiment Score',
          data: marketData.news.map((headline) => headline.sentiment),
          backgroundColor: marketData.news.map((headline) => (headline.sentiment > 0 ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.7)')),
        }],
      },
    },
  };
}

function buildFallbackInsights(marketData) {
  return {
    insights: [
      `RSI at ${marketData.rsi} — ${marketData.rsi > 70 ? 'overbought territory' : marketData.rsi < 30 ? 'oversold territory' : 'healthy range'}`,
      `Price is ${((marketData.price / marketData.ma50 - 1) * 100).toFixed(1)}% above MA50`,
      `Sentiment score of ${marketData.sentimentScore} indicates ${marketData.sentimentLabel} market mood`,
      `Analyst upside potential: ${marketData.analystConsensus.upside}%`,
    ],
    riskFlags: marketData.rsi > 70 ? ['Overbought — potential pullback risk'] : [],
    technicalSummary: `${marketData.ticker} shows a ${marketData.trend} trend with RSI at ${marketData.rsi}.`,
    momentumSignal: marketData.changePercent > 0 ? 'POSITIVE' : 'NEGATIVE',
  };
}

async function runEdaVisualAnalysis({ marketData }, dependencies = {}) {
  requireObject(marketData, 'marketData');

  const charts = buildCharts(marketData);
  const llm = dependencies.callDeepSeek || callDeepSeek;
  const systemPrompt = `You are a quantitative analyst running the eda-visual-analysis skill.\n\n${skills['eda-visual-analysis']}\n\nAnalyze the market data and provide key EDA insights as JSON.`;
  const userMessage = `Provide EDA insights for ${marketData.ticker}. Return JSON with: insights (array of 4 key observations), riskFlags (array of strings), technicalSummary (1-2 sentences), momentumSignal (POSITIVE/NEGATIVE/NEUTRAL). Market data summary: Price: ${marketData.price}, RSI: ${marketData.rsi}, Trend: ${marketData.trend}, Sentiment: ${marketData.sentimentScore}, MA20: ${marketData.ma20}, MA50: ${marketData.ma50}`;

  try {
    const analysis = await llm(systemPrompt, userMessage);
    const edaInsights = parseJsonResponse(analysis, buildFallbackInsights(marketData));
    return { charts, edaInsights, skillUsed: 'eda-visual-analysis' };
  } catch {
    return { charts, edaInsights: buildFallbackInsights(marketData), skillUsed: 'eda-visual-analysis' };
  }
}

module.exports = {
  buildCharts,
  runEdaVisualAnalysis,
};
