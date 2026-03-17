const { runMarketIntelligence } = require('../../skills/market-intelligence/scripts');
const { runEdaVisualAnalysis } = require('../../skills/eda-visual-analysis/scripts');
const { runTradeRecommendation } = require('../../skills/trade-recommendation/scripts');

async function runFullAnalysis({ ticker }) {
  const marketIntelligence = await runMarketIntelligence({ ticker });
  const eda = await runEdaVisualAnalysis({ marketData: marketIntelligence.marketData });
  const tradeRecommendation = await runTradeRecommendation({
    marketData: marketIntelligence.marketData,
    edaInsights: eda.edaInsights,
  });

  return {
    ticker: marketIntelligence.marketData.ticker,
    marketIntelligence,
    eda,
    tradeRecommendation,
  };
}

module.exports = {
  runFullAnalysis,
};
