const { fetchYahooFinancePriceHistory } = require('./api-yahoo');

async function fetchMacroAnchors(mode) {
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
          if (!history || history.length === 0) {
            throw new Error('Empty history returned');
          }
          
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
          if (mode === 'live' || mode !== 'mock') {
            console.warn(`[Macro Anchors] Failed to fetch live data for ${sym.ticker} in live mode, filtering out. Error:`, e.message);
            return null;
          }

          console.warn(`[Macro Anchors] Failed to fetch live data for ${sym.ticker}, using mock fallback. Error:`, e.message);
          
          // Generate realistic mock history for fallback
          const history = [];
          const length = 30;
          let val = sym.ticker === 'CL=F' ? 78.5 : sym.ticker === 'GC=F' ? 2350.2 : sym.ticker === '^VIX' ? 14.2 : 4.45;
          const pctStep = sym.ticker === '^VIX' ? 0.015 : sym.ticker === '^TNX' ? 0.005 : 0.003;
          
          for (let i = 0; i < length; i++) {
            val = val * (1 + (Math.random() - 0.48) * pctStep);
            history.push({
              close: parseFloat(val.toFixed(sym.ticker === '^TNX' ? 4 : 2))
            });
          }
          
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
            trend,
            isMock: true
          };
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
