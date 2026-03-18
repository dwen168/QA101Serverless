/**
 * Backtesting Skill
 * =================
 * Simulates trading strategy on historical data and computes performance metrics.
 * 
 * Usage:
 *   runBacktest({
 *     ticker: 'AAPL',
 *     strategyName: 'trade-recommendation',
 *     startDate: '2025-01-01',
 *     endDate: '2026-03-18',
 *     initialCapital: 100000
 *   })
 */

const { requireObject } = require('../../../backend/lib/utils');
const { callDeepSeek } = require('../../../backend/lib/llm');

// Fetch historical data from Alpha Vantage
async function fetchHistoricalData(ticker, apiKey) {
  const axios = require('axios');
  
  try {
    const url = 'https://www.alphavantage.co/query';
    const params = {
      function: 'TIME_SERIES_DAILY_ADJUSTED',
      symbol: ticker,
      outputsize: 'full',
      apikey: apiKey,
    };
    
    const response = await axios.get(url, { params, timeout: 15000 });
    const data = response.data;
    
    if (data['Error Message'] || data['Note']) {
      console.error('[Backtest] API Error:', data['Error Message'] || data['Note']);
      return null;
    }
    
    const timeSeries = data['Time Series (Daily)'] || {};
    const priceHistory = Object.entries(timeSeries)
      .map(([date, vals]) => ({
        date: new Date(date),
        open: parseFloat(vals['1. open']),
        high: parseFloat(vals['2. high']),
        low: parseFloat(vals['3. low']),
        close: parseFloat(vals['4. close']),
        volume: parseInt(vals['6. volume']),
      }))
      .sort((a, b) => a.date - b.date);
    
    return priceHistory;
  } catch (error) {
    console.error('[Backtest] Fetch error:', error.message);
    return null;
  }
}

// Generate trading signals (simplified trade-recommendation scoring)
function generateSignal(priceData, index, signalType = 'trade-recommendation') {
  if (index < 50) return 'HOLD'; // Need enough history for indicators
  
  const current = priceData[index];
  const history = priceData.slice(0, index + 1);
  const closes = history.map(p => p.close);
  
  let score = 0;
  
  // MA50 signal
  const ma50 = closes.slice(-50).reduce((a, b) => a + b) / 50;
  if (current.close > ma50) score += 2;
  else score -= 2;
  
  // MA200 signal
  if (history.length >= 200) {
    const ma200 = closes.slice(-200).reduce((a, b) => a + b) / 200;
    if (current.close > ma200) score += 1;
    else score -= 1;
  }
  
  // RSI signal
  const rsi = calculateRSI(closes, 14);
  if (rsi > 70) score -= 2;
  else if (rsi < 30) score += 1;
  else if (rsi >= 45 && rsi <= 65) score += 1;
  
  // MACD signal (simplified)
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  if (ema12 && ema26) {
    if (ema12 > ema26) score += 1;
    else score -= 1;
  }
  
  // Bollinger Bands signal
  const bb = calculateBollingerBands(closes, 20);
  if (bb) {
    const bbPosition = (current.close - bb.lower) / (bb.upper - bb.lower);
    if (bbPosition < 0.2) score += 1;
    else if (bbPosition > 0.8) score -= 1;
  }
  
  // Map score to action
  if (score >= 6) return 'STRONG_BUY';
  if (score >= 3) return 'BUY';
  if (score >= -2 && score <= 2) return 'HOLD';
  if (score <= -6) return 'STRONG_SELL';
  if (score <= -3) return 'SELL';
  
  return 'HOLD';
}

function calculateRSI(closes, period = 14) {
  if (closes.length < period + 1) return 50;
  
  const changes = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }
  
  const gains = changes.filter(c => c > 0).reduce((a, b) => a + b, 0) / period;
  const losses = Math.abs(changes.filter(c => c < 0).reduce((a, b) => a + b, 0) / period);
  
  const rs = gains / (losses + 1e-9);
  return 100 - (100 / (1 + rs));
}

function calculateEMA(data, period) {
  if (data.length < period) return null;
  
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b) / period;
  
  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * k + ema;
  }
  
  return ema;
}

function calculateBollingerBands(closes, period = 20) {
  if (closes.length < period) return null;
  
  const subset = closes.slice(-period);
  const mean = subset.reduce((a, b) => a + b) / period;
  const variance = subset.reduce((sum, val) => sum + (val - mean) ** 2, 0) / period;
  const stdDev = Math.sqrt(variance);
  
  return {
    middle: mean,
    upper: mean + 2 * stdDev,
    lower: mean - 2 * stdDev,
  };
}

// Simulate trading
function simulateTrades(priceData, signals, initialCapital) {
  const trades = [];
  const equityCurve = [{ date: priceData[0].date, capital: initialCapital, action: 'START' }];
  
  let position = null; // { entryIndex, entryPrice, entryDate }
  let capital = initialCapital;
  let tradeId = 0;
  
  for (let i = 0; i < signals.length; i++) {
    const signal = signals[i];
    const current = priceData[i];
    
    // Check exit conditions
    if (position) {
      const entryPrice = position.entryPrice;
      const currentPrice = current.close;
      const pnlPercent = (currentPrice - entryPrice) / entryPrice;
      
      // Stop-loss: -3%
      if (pnlPercent < -0.03) {
        closeTrade(position, currentPrice, 'STOP_LOSS', tradeId++);
      }
      // Take-profit: +7%
      else if (pnlPercent > 0.07) {
        closeTrade(position, currentPrice, 'TAKE_PROFIT', tradeId++);
      }
      // Sell signal
      else if (['SELL', 'STRONG_SELL'].includes(signal)) {
        closeTrade(position, currentPrice, 'SELL_SIGNAL', tradeId++);
      }
    }
    
    // Check entry conditions
    if (!position && ['BUY', 'STRONG_BUY'].includes(signal)) {
      position = {
        entryIndex: i,
        entryPrice: current.close,
        entryDate: current.date,
        tradeId: tradeId,
      };
    }
  }
  
  // Close remaining position if open
  if (position) {
    const lastPrice = priceData[priceData.length - 1].close;
    closeTrade(position, lastPrice, 'END_OF_PERIOD', tradeId++);
  }
  
  function closeTrade(pos, exitPrice, reason, id) {
    const pnlPercent = (exitPrice - pos.entryPrice) / pos.entryPrice;
    const pnlDollars = capital * pnlPercent;
    
    trades.push({
      tradeId: id,
      entryDate: pos.entryDate,
      entryPrice: parseFloat(pos.entryPrice.toFixed(2)),
      exitDate: priceData[priceData.length - 1].date,
      exitPrice: parseFloat(exitPrice.toFixed(2)),
      pnlPercent: parseFloat((pnlPercent * 100).toFixed(2)),
      daysHeld: Math.floor((priceData[priceData.length - 1].date - pos.entryDate) / (1000 * 60 * 60 * 24)),
      reason,
    });
    
    capital *= (1 + pnlPercent);
    equityCurve.push({
      date: priceData[priceData.length - 1].date,
      capital: parseFloat(capital.toFixed(2)),
      action: 'SELL',
      tradeId: id,
      pnl: parseFloat(pnlDollars.toFixed(2)),
    });
    
    position = null;
  }
  
  return { trades, capital, equityCurve };
}

// Compute performance metrics
function computeMetrics(trades, initialCapital, finalCapital, days) {
  const winningTrades = trades.filter(t => t.pnlPercent > 0);
  const losingTrades = trades.filter(t => t.pnlPercent <= 0);
  
  const totalReturn = ((finalCapital - initialCapital) / initialCapital) * 100;
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
  
  const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnlPercent, 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnlPercent, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 999 : 0);
  
  // Sharpe Ratio (simplified)
  const dailyReturns = trades.length > 0 ? trades.map(t => t.pnlPercent / 100) : [0];
  const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((sum, r) => sum + (r - avgReturn) ** 2, 0) / dailyReturns.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? ((avgReturn - 0.0003) / stdDev) * Math.sqrt(252) : 0;
  
  // Max Drawdown (simplified from equity curve)
  const maxRunup = finalCapital / initialCapital;
  const maxDrawdown = ((1 - (finalCapital / (initialCapital * maxRunup))) * 100) || 0;
  
  // CAGR
  const years = days / 252;
  const cagr = years > 0 ? (Math.pow(finalCapital / initialCapital, 1 / years) - 1) * 100 : 0;
  
  const avgTradeReturn = trades.length > 0 ? totalReturn / trades.length : 0;
  
  return {
    totalTrades: trades.length,
    winRate: parseFloat(winRate.toFixed(1)),
    profitFactor: parseFloat(profitFactor.toFixed(2)),
    sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
    maxDrawdown: parseFloat(maxDrawdown.toFixed(1)),
    cagr: parseFloat(cagr.toFixed(1)),
    avgTradeReturn: parseFloat(avgTradeReturn.toFixed(2)),
  };
}

// Main backtest function
async function runBacktest(params, dependencies = {}) {
  const { ticker, strategyName, startDate, endDate, initialCapital = 100000, apiKey } = params;
  
  if (!ticker || !startDate || !endDate) {
    throw new Error('Missing required parameters: ticker, startDate, endDate');
  }
  
  // Fetch historical data
  const priceData = await fetchHistoricalData(ticker, apiKey);
  if (!priceData || priceData.length < 50) {
    return {
      error: 'Insufficient historical data. Need at least 50 trading days.',
      skillUsed: 'backtesting',
    };
  }
  
  // Filter by date range
  const start = new Date(startDate);
  const end = new Date(endDate);
  const filteredData = priceData.filter(p => p.date >= start && p.date <= end);
  
  if (filteredData.length < 50) {
    return {
      error: `Insufficient data in date range [${startDate}, ${endDate}]. Got ${filteredData.length} days.`,
      skillUsed: 'backtesting',
    };
  }
  
  // Generate signals
  const signals = filteredData.map((p, i) => generateSignal(filteredData, i, strategyName));
  
  // Simulate trades
  const { trades, capital: finalCapital, equityCurve } = simulateTrades(filteredData, signals, initialCapital);
  
  // Compute metrics
  const days = filteredData.length;
  const metrics = computeMetrics(trades, initialCapital, finalCapital, days);
  
  // Signal distribution
  const buySignals = signals.filter(s => ['BUY', 'STRONG_BUY'].includes(s)).length;
  const sellSignals = signals.filter(s => ['SELL', 'STRONG_SELL'].includes(s)).length;
  const holdDays = signals.filter(s => s === 'HOLD').length;
  
  // Build recommendations
  const recommendations = [];
  if (metrics.sharpeRatio > 1.0) {
    recommendations.push('✅ Excellent Sharpe ratio - risk-adjusted returns are strong');
  } else if (metrics.sharpeRatio > 0.5) {
    recommendations.push('✅ Good Sharpe ratio - positive risk-adjusted returns');
  } else {
    recommendations.push('⚠️ Low Sharpe ratio - improve risk management');
  }
  
  if (metrics.winRate > 55) {
    recommendations.push('✅ Win rate above 55% - strategy is profitable more often than not');
  } else if(metrics.winRate > 40) {
    recommendations.push('✅ Win rate above 40% - decent performance');
  } else {
    recommendations.push('⚠️ Win rate below 40% - consider revisiting signals');
  }
  
  if (metrics.profitFactor > 1.5) {
    recommendations.push('✅ Profit factor > 1.5 - good reward/risk balance');
  }
  
  if (Math.abs(metrics.maxDrawdown) < 15) {
    recommendations.push('✅ Max drawdown < 15% - acceptable risk level');
  } else {
    recommendations.push(`⚠️ Max drawdown ${Math.abs(metrics.maxDrawdown).toFixed(1)}% - consider larger stop-loss`);
  }
  
  if (metrics.totalTrades < 20) {
    recommendations.push('⚠️ Less than 20 trades - increase sample size for statistical significance');
  }
  
  return {
    backtestReport: {
      ticker,
      strategyName,
      period: {
        startDate,
        endDate,
        tradingDays: days,
      },
      capital: {
        initial: initialCapital,
        final: parseFloat(finalCapital.toFixed(2)),
        totalReturn: parseFloat(((finalCapital - initialCapital) / initialCapital * 100).toFixed(2)),
      },
      performanceMetrics: metrics,
      tradeLog: trades.slice(0, 50), // Return first 50 trades
      equityCurve: equityCurve.slice(0, 100), // Return key points
      signalDistribution: {
        buySignals,
        sellSignals,
        holdDays,
      },
      recommendations,
    },
    skillUsed: 'backtesting',
  };
}

module.exports = {
  runBacktest,
};
