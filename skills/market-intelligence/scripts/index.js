const { normalizeTicker } = require('../../../backend/lib/utils');
const { generateMockMarketData } = require('./modules/mock');
const { fetchYahooFinanceData, fetchFinnhubMarketData, fetchAlphaVantageMarketData } = require('./modules/market-data');
const { fetchMacroAnchors } = require('./modules/macro-anchors');
const { scoreCompanyNewsWithLlm, scoreMacroNewsWithLlm } = require('./modules/sentiment');
const { detectFedRbaPolicyMention } = require('./modules/macro');

function buildFallbackAnalysis(ticker, marketData) {
  const macroText = marketData?.macroContext?.marketContext || 'Macro context unavailable.';
  return {
    summary: `${ticker} is trading at $${marketData.price} with a ${marketData.trend} trend.`,
    keyTrends: [
      `RSI at ${marketData.rsi}`,
      `Sentiment: ${marketData.sentimentLabel}`,
      `Price vs MA50: ${((marketData.price / marketData.ma50 - 1) * 100).toFixed(1)}%`,
    ],
    riskFlags: marketData?.macroContext?.riskLevel === 'HIGH' ? ['Macro risk is elevated from current global headlines.'] : [],
    marketContext: macroText,
  };
}

async function runMarketIntelligence({ ticker, mode }, dependencies = {}) {
  const cleanTicker = normalizeTicker(ticker);
  const isInternational = cleanTicker.includes('.');
  let marketData;
  if (mode === 'mock') {
    marketData = generateMockMarketData(cleanTicker);
  } else {
    try {
      if (isInternational) {
        marketData = await fetchYahooFinanceData(cleanTicker, dependencies);
      } else {
        try {
          marketData = await fetchFinnhubMarketData(cleanTicker, dependencies);
        } catch (err) {
          marketData = await fetchAlphaVantageMarketData(cleanTicker, dependencies);
        }
      }
    } catch (error) {
      throw new Error(`Live market data fetch failed for ${cleanTicker}: ${error.message}`);
    }
  }
  
  if (marketData && !marketData.macroAnchors) {
    marketData.macroAnchors = await fetchMacroAnchors(mode);
  }

  return {
    marketData,
    llmAnalysis: buildFallbackAnalysis(cleanTicker, marketData),
    skillUsed: 'market-intelligence',
    dataSource: marketData.dataSource,
    usedFallback: marketData.dataSource === 'mock',
    fallbackReason: marketData.fallbackReason,
  };
}

module.exports = {
  generateMockMarketData,
  runMarketIntelligence,
  scoreCompanyNewsWithLlm,
  scoreMacroNewsWithLlm,
  detectFedRbaPolicyMention,
};