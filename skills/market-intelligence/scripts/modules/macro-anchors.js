const { fetchYahooFinancePriceHistory } = require('./api-yahoo');

async function fetchMacroAnchors() {
  try {
    const symbols = [
      { ticker: 'CL=F', name: 'Crude Oil', type: 'commodity' },
      { ticker: 'GC=F', name: 'Gold', type: 'commodity' },
      { ticker: '^VIX', name: 'VIX Volatility', type: 'index' },
      { ticker: '^TNX', name: '10Y Treasury', type: 'rate' }
    ];
    
    const anchors = await Promise.all(
      symbols.map(async (sym) => {
        try {
          const history = await fetchYahooFinancePriceHistory(sym.ticker, 90);
          if (!history || history.length === 0) return null;
          
          const closes = history.map(h => h.close);
          const currentPrice = closes[closes.length - 1];
          const firstPrice = closes[0];
          const changePercent = ((currentPrice - firstPrice) / firstPrice) * 100;
          
          let trend = 'NEUTRAL';
          if (changePercent > 5) trend = 'BULLISH';
          else if (changePercent < -5) trend = 'BEARISH';

          return {
            ticker: sym.ticker,
            name: sym.name,
            type: sym.type,
            history,
            currentPrice,
            changePercent,
            trend
          };
        } catch(e) {
          return null;
        }
      })
    );
    return anchors.filter(a => a !== null);
  } catch(e) {
    return [];
  }
}

module.exports = {
  fetchMacroAnchors,
};
