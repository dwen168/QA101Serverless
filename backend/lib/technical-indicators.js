/**
 * Technical Indicators Calculator
 * Computes MACD, Bollinger Bands, KDJ, OBV, VWAP
 */

function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

// Calculate Exponential Moving Average (EMA)
function calculateEMA(data, period) {
  if (data.length < period) return null;
  
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b) / period;
  
  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * k + ema;
  }
  
  return ema;
}

// Calculate full EMA series (null for unavailable early points)
function calculateEMASeries(data, period) {
  if (!Array.isArray(data) || data.length < period) return [];

  const series = new Array(data.length).fill(null);
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  series[period - 1] = ema;

  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * k + ema;
    series[i] = ema;
  }

  return series;
}

// Calculate Simple Moving Average (SMA)
function calculateSMA(data, period) {
  if (data.length < period) return null;
  return data.slice(-period).reduce((a, b) => a + b) / period;
}

// Calculate Standard Deviation
function calculateStdDev(data, period) {
  if (data.length < period) return null;
  
  const subset = data.slice(-period);
  const mean = subset.reduce((a, b) => a + b) / period;
  const variance = subset.reduce((sum, val) => sum + (val - mean) ** 2, 0) / period;
  
  return Math.sqrt(variance);
}

// MACD (Moving Average Convergence Divergence)
function calculateMACD(closes) {
  // Standard MACD(12,26,9): signal line is EMA9 of MACD line
  if (!Array.isArray(closes) || closes.length < 34) return null;

  const ema12Series = calculateEMASeries(closes, 12);
  const ema26Series = calculateEMASeries(closes, 26);
  if (ema12Series.length === 0 || ema26Series.length === 0) return null;

  const macdSeries = [];
  for (let i = 0; i < closes.length; i++) {
    if (ema12Series[i] != null && ema26Series[i] != null) {
      macdSeries.push(ema12Series[i] - ema26Series[i]);
    }
  }

  if (macdSeries.length < 9) return null;

  const signalSeries = calculateEMASeries(macdSeries, 9);
  if (signalSeries.length === 0) return null;

  const macdLine = macdSeries[macdSeries.length - 1];
  const signalLine = signalSeries[signalSeries.length - 1];
  if (macdLine == null || signalLine == null) return null;

  const histogram = macdLine - signalLine;
  
  return {
    macdLine: parseFloat(macdLine.toFixed(4)),
    signalLine: parseFloat(signalLine.toFixed(4)),
    histogram: parseFloat(histogram.toFixed(4)),
    signal: histogram > 0 ? 'BULLISH' : histogram < 0 ? 'BEARISH' : 'NEUTRAL',
  };
}

// Bollinger Bands
function calculateBollingerBands(closes, period = 20, stdDevMultiplier = 2) {
  if (closes.length < period) return null;
  
  const middleBand = calculateSMA(closes, period);
  const stdDev = calculateStdDev(closes, period);
  
  if (!middleBand || !stdDev) return null;
  
  const upperBand = middleBand + (stdDev * stdDevMultiplier);
  const lowerBand = middleBand - (stdDev * stdDevMultiplier);
  const currentPrice = closes[closes.length - 1];
  
  // Bollinger Band position (0 = lower, 1 = upper)
  const bbPosition = (currentPrice - lowerBand) / (upperBand - lowerBand);
  
  let signal = 'NEUTRAL';
  if (bbPosition > 0.8) signal = 'OVERBOUGHT';
  else if (bbPosition < 0.2) signal = 'OVERSOLD';
  
  return {
    upperBand: parseFloat(upperBand.toFixed(2)),
    middleBand: parseFloat(middleBand.toFixed(2)),
    lowerBand: parseFloat(lowerBand.toFixed(2)),
    bbPosition: parseFloat(bbPosition.toFixed(3)),
    signal,
    stdDev: parseFloat(stdDev.toFixed(4)),
  };
}

// KDJ (Stochastic Oscillator)
function calculateKDJ(priceData, period = 9) {
  if (priceData.length < period) return null;
  
  const closes = priceData.map(p => p.close);
  const highs = priceData.map(p => p.high);
  const lows = priceData.map(p => p.low);
  
  const recentCandles = priceData.slice(-period);
  const highestHigh = Math.max(...recentCandles.map(p => p.high));
  const lowestLow = Math.min(...recentCandles.map(p => p.low));
  
  const rsv = (closes[closes.length - 1] - lowestLow) / (highestHigh - lowestLow) * 100;
  
  // Simplified: use RSV as %K (full calculation requires history)
  const k = Math.max(0, Math.min(100, rsv));
  const d = k; // Approximation
  const j = 3 * k - 2 * d;
  
  let signal = 'NEUTRAL';
  if (k > 80) signal = 'OVERBOUGHT';
  else if (k < 20) signal = 'OVERSOLD';
  
  return {
    k: parseFloat(k.toFixed(2)),
    d: parseFloat(d.toFixed(2)),
    j: parseFloat(j.toFixed(2)),
    rsv: parseFloat(rsv.toFixed(2)),
    signal,
  };
}

// OBV (On-Balance Volume)
function calculateOBV(priceData) {
  if (priceData.length < 2) return null;
  
  let obv = 0;
  const obvValues = [];
  
  for (let i = 0; i < priceData.length; i++) {
    const currentPrice = priceData[i].close;
    const previousPrice = i > 0 ? priceData[i - 1].close : currentPrice;
    const volume = priceData[i].volume;
    
    if (currentPrice > previousPrice) {
      obv += volume;
    } else if (currentPrice < previousPrice) {
      obv -= volume;
    }
    
    obvValues.push(obv);
  }
  
  const currentOBV = obvValues[obvValues.length - 1];
  const previousOBV = obvValues.length > 1 ? obvValues[obvValues.length - 2] : currentOBV;
  const obvTrend = currentOBV > previousOBV ? 'BULLISH' : currentOBV < previousOBV ? 'BEARISH' : 'NEUTRAL';
  
  // OBV moving average (14-period)
  const obvMA14 = obvValues.length >= 14 
    ? obvValues.slice(-14).reduce((a, b) => a + b) / 14 
    : currentOBV;
  
  return {
    obv: currentOBV,
    obvMA14: parseFloat(obvMA14.toFixed(0)),
    obvTrend,
    signal: obvTrend,
  };
}

// VWAP (Volume Weighted Average Price)
function calculateVWAP(priceData) {
  if (priceData.length === 0) return null;
  
  let cumulativeTP_Vol = 0;
  let cumulativeVol = 0;
  
  for (const candle of priceData) {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    const volume = candle.volume || 0;
    
    cumulativeTP_Vol += typicalPrice * volume;
    cumulativeVol += volume;
  }
  
  const vwap = cumulativeVol > 0 ? cumulativeTP_Vol / cumulativeVol : 0;
  const currentPrice = priceData[priceData.length - 1].close;
  
  const vwapSignal = currentPrice > vwap ? 'ABOVE_VWAP' : currentPrice < vwap ? 'BELOW_VWAP' : 'AT_VWAP';
  
  return {
    vwap: parseFloat(vwap.toFixed(2)),
    currentPrice: parseFloat(currentPrice.toFixed(2)),
    priceDiff: parseFloat((currentPrice - vwap).toFixed(2)),
    priceDiffPercent: parseFloat(((currentPrice - vwap) / vwap * 100).toFixed(2)),
    signal: vwapSignal,
  };
}

// Calculate Average True Range (ATR) - more accurate than simple high52w-low52w
function calculateATR(priceData, period = 14) {
  if (!priceData || priceData.length < period + 1) return null;

  // Compute true range for each candle
  const trueRanges = [];
  for (let i = 1; i < priceData.length; i++) {
    const high = priceData[i].high;
    const low = priceData[i].low;
    const prevClose = priceData[i - 1].close;

    // TR = max(High - Low, abs(High - Close_prev), abs(Low - Close_prev))
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }

  if (trueRanges.length < period) return null;

  // ATR = SMA of true range
  const atr = trueRanges.slice(-period).reduce((a, b) => a + b) / period;
  
  return parseFloat(atr.toFixed(2));
}

// Calculate Value at Risk (VaR) - maximum potential loss at given confidence level
function calculateVaR(priceHistory, confidence = 0.95) {
  if (!priceHistory || priceHistory.length < 20) return null;

  // Calculate daily returns
  const returns = [];
  for (let i = 1; i < priceHistory.length; i++) {
    const dailyReturn = (priceHistory[i].close - priceHistory[i - 1].close) / priceHistory[i - 1].close;
    returns.push(dailyReturn);
  }

  if (returns.length < 20) return null;

  // Mean and standard deviation of returns
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, ret) => sum + (ret - mean) ** 2, 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  // Z-score for confidence level
  // 0.95 (95% confidence) → z ≈ 1.645
  // 0.99 (99% confidence) → z ≈ 2.326
  const zScores = {
    0.90: 1.282,
    0.95: 1.645,
    0.99: 2.326,
  };
  const z = zScores[confidence] || 1.645;

  // VaR in percentage: mean - z * stdDev
  // (negative value: potential loss)
  const varPercent = mean - z * stdDev;
  
  // VaR in absolute price (for current price)
  const currentPrice = priceHistory[priceHistory.length - 1].close;
  const varPrice = Math.abs(varPercent * currentPrice);

  return {
    varPercent: parseFloat((varPercent * 100).toFixed(2)),  // e.g., -3.45%
    varPrice: parseFloat(varPrice.toFixed(2)),              // e.g., $5.23 loss per share
    confidence: confidence * 100,                            // 95%, 99%, etc.
    interpretation: `At ${confidence * 100}% confidence, max 1-day loss is ${Math.abs(varPercent * 100).toFixed(2)}%`,
  };
}

// Calculate all technical indicators
function calculateAllIndicators(priceData) {
  if (!priceData || priceData.length < 20) {
    return {
      error: 'Insufficient price data (require minimum 20 candles)',
      available: false,
    };
  }
  
  const closes = priceData.map(p => p.close);
  
  return {
    available: true,
    macd: calculateMACD(closes),
    bollingerBands: calculateBollingerBands(closes),
    kdj: calculateKDJ(priceData),
    obv: calculateOBV(priceData),
    vwap: calculateVWAP(priceData),
    atr14: calculateATR(priceData, 14),
    var95: calculateVaR(priceData, 0.95),
    calculatedAt: new Date().toISOString(),
  };
}

module.exports = {
  calculateMACD,
  calculateBollingerBands,
  calculateKDJ,
  calculateOBV,
  calculateVWAP,
  calculateATR,
  calculateVaR,
  calculateAllIndicators,
  calculateEMA,
  calculateEMASeries,
  calculateSMA,
  calculateStdDev,
};
