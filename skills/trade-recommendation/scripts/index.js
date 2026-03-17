const { callDeepSeek } = require('../../../backend/lib/llm');
const { loadSkills } = require('../../../backend/lib/skill-loader');
const { parseJsonResponse, requireObject } = require('../../../backend/lib/utils');

const skills = loadSkills();

function scoreSignals(marketData) {
  const signals = [];
  let score = 0;

  const add = (name, points, reason) => {
    signals.push({ name, points, reason });
    score += points;
  };

  if (marketData.price > marketData.ma50) {
    add('Price > MA50', 2, 'Bullish trend confirmation');
  } else {
    add('Price < MA50', -2, 'Bearish trend - price below medium-term average');
  }

  if (marketData.price > marketData.ma200) {
    add('Price > MA200', 1, 'Long-term uptrend intact');
  } else {
    add('Price < MA200', -1, 'Long-term downtrend');
  }

  if (marketData.rsi > 70) {
    add('RSI Overbought', -2, `RSI ${marketData.rsi} > 70 - overextended`);
  } else if (marketData.rsi < 30) {
    add('RSI Oversold', 1, `RSI ${marketData.rsi} < 30 - contrarian buy signal`);
  } else if (marketData.rsi >= 45 && marketData.rsi <= 65) {
    add('RSI Healthy', 1, `RSI ${marketData.rsi} in bullish healthy zone`);
  }

  if (marketData.sentimentScore > 0.3) {
    add('Positive Sentiment', 2, `Sentiment score ${marketData.sentimentScore} - bullish`);
  } else if (marketData.sentimentScore < -0.3) {
    add('Negative Sentiment', -2, `Sentiment score ${marketData.sentimentScore} - bearish`);
  }

  const consensus = marketData.analystConsensus;
  const totalRatings = consensus.strongBuy + consensus.buy + consensus.hold + consensus.sell + consensus.strongSell;
  const buyRatio = totalRatings === 0 ? 0 : (consensus.strongBuy + consensus.buy) / totalRatings;

  if (buyRatio > 0.6) {
    add('Strong Analyst Buy', 2, `${(buyRatio * 100).toFixed(0)}% analysts rate Buy/Strong Buy`);
  } else if (buyRatio < 0.3) {
    add('Weak Analyst Support', -1, `Only ${(buyRatio * 100).toFixed(0)}% analysts rate Buy`);
  }

  if (consensus.upside > 10) {
    add('Analyst Upside', 1, `${consensus.upside}% upside to mean price target`);
  } else if (consensus.upside < -5) {
    add('Downside Risk', -1, `Analysts see ${Math.abs(consensus.upside)}% downside`);
  }

  if (marketData.changePercent > 1.5) {
    add('Strong Daily Momentum', 1, `Up ${marketData.changePercent.toFixed(1)}% today`);
  } else if (marketData.changePercent < -2) {
    add('Bearish Day', -1, `Down ${Math.abs(marketData.changePercent).toFixed(1)}% today`);
  }

  return { signals, score, buyRatio };
}

function mapAction(score) {
  if (score >= 6) {
    return { action: 'STRONG BUY', actionColor: '#10b981' };
  }
  if (score >= 3) {
    return { action: 'BUY', actionColor: '#6ee7b7' };
  }
  if (score >= -2) {
    return { action: 'HOLD', actionColor: '#f59e0b' };
  }
  if (score >= -5) {
    return { action: 'SELL', actionColor: '#f87171' };
  }
  return { action: 'STRONG SELL', actionColor: '#dc2626' };
}

function buildFallbackRecommendation(marketData, action, signals, confidence, buyRatio) {
  return {
    rationale: `Based on technical and sentiment analysis, ${marketData.ticker} shows a ${marketData.trend} setup with ${marketData.rsi > 50 ? 'positive' : 'weakening'} momentum. Analyst consensus supports the view with ${(buyRatio * 100).toFixed(0)}% buy ratings.`,
    timeHorizon: 'MEDIUM',
    keyRisks: ['Market volatility', 'Sector headwinds', 'RSI extended'],
    executiveSummary: `${marketData.ticker} - ${action} recommendation based on ${signals.length} signals with ${confidence}% confidence.`,
  };
}

async function runTradeRecommendation({ marketData, edaInsights }, dependencies = {}) {
  requireObject(marketData, 'marketData');

  const { signals, score, buyRatio } = scoreSignals(marketData);
  const { action, actionColor } = mapAction(score);
  const confidence = Math.min(95, Math.floor((Math.abs(score) / 12) * 100 + 40));

  const atr = (marketData.high52w - marketData.low52w) / 52;
  const entry = marketData.price;
  const stopLoss = parseFloat((entry - atr * 1.5).toFixed(2));
  const takeProfit = parseFloat((entry + atr * 2.5).toFixed(2));
  const riskReward = parseFloat(((takeProfit - entry) / (entry - stopLoss)).toFixed(1));

  const llm = dependencies.callDeepSeek || callDeepSeek;
  const systemPrompt = `You are a senior quantitative analyst running the trade-recommendation skill.\n\n${skills['trade-recommendation']}\n\nSynthesize all signals and write a clear trade recommendation.`;
  const userMessage = `Write a trade recommendation for ${marketData.ticker}. Action: ${action}. Score: ${score}. Key signals: ${signals.map((signal) => `${signal.name}(${signal.points > 0 ? '+' : ''}${signal.points})`).join(', ')}. Return JSON with: rationale (2-3 sentences), timeHorizon (SHORT/MEDIUM/LONG), keyRisks (array of 2-3 strings), executiveSummary (1 sentence plain English). Additional EDA context: ${JSON.stringify(edaInsights || {}, null, 2)}`;

  let llmRecommendation;
  try {
    const analysis = await llm(systemPrompt, userMessage);
    llmRecommendation = parseJsonResponse(analysis, buildFallbackRecommendation(marketData, action, signals, confidence, buyRatio));
  } catch {
    llmRecommendation = buildFallbackRecommendation(marketData, action, signals, confidence, buyRatio);
  }

  return {
    recommendation: {
      ticker: marketData.ticker,
      action,
      actionColor,
      confidence,
      score,
      signals,
      entry,
      stopLoss,
      takeProfit,
      riskReward,
      ...llmRecommendation,
      disclaimer: 'WARNING: For educational/demo purposes only. Not financial advice.',
    },
    skillUsed: 'trade-recommendation',
  };
}

module.exports = {
  mapAction,
  runTradeRecommendation,
  scoreSignals,
};