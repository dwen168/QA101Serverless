const { calculateATR, calculateVaR } = require('../../../../backend/lib/technical-indicators');

function computeHistoricalVolatility(priceHistory, days = 14) {
  if (!priceHistory || priceHistory.length < days + 1) return null;
  const closes = priceHistory.map((p) => p.close).slice(-(days + 1));
  const returns = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push(Math.log(closes[i] / closes[i - 1]));
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  const dailyVol = Math.sqrt(variance);
  return dailyVol;
}

function computeRiskMetrics(marketData, profile) {
  const entry = marketData.price;
  let atr = null;
  let varMetrics = null;
  let stopLoss = entry * 0.95;  // Default 5% fallback
  let takeProfit = entry * 1.10; // Default 10% fallback

  if (marketData.priceHistory && marketData.priceHistory.length >= 15) {
    atr = calculateATR(marketData.priceHistory, 14);
    if (atr && atr > 0) {
      stopLoss = parseFloat((entry - atr * profile.atrStopMultiplier).toFixed(2));
      takeProfit = parseFloat((entry + atr * profile.atrTargetMultiplier).toFixed(2));
    } else {
      const dailyVol = computeHistoricalVolatility(marketData.priceHistory, 14) || 0.02; // fallback to 2% daily if calc fails
      const fallbackAtrApprox = entry * dailyVol;
      stopLoss = parseFloat((entry - fallbackAtrApprox * profile.atrStopMultiplier).toFixed(2));
      takeProfit = parseFloat((entry + fallbackAtrApprox * profile.atrTargetMultiplier).toFixed(2));
    }
    
    // Calculate Value at Risk (95% confidence)
    varMetrics = calculateVaR(marketData.priceHistory, 0.95);
  }

  const riskDenominator = entry - stopLoss;
  const riskReward = riskDenominator > 0.0001 
    ? parseFloat(((takeProfit - entry) / riskDenominator).toFixed(1)) 
    : 0;

  return {
    entry,
    stopLoss,
    takeProfit,
    riskReward,
    atr,
    varMetrics
  };
}

module.exports = {
  computeHistoricalVolatility,
  computeRiskMetrics
};
