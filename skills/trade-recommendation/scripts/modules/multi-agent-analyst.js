const { parseJsonResponse } = require('../../../../backend/lib/utils');

async function runAnalystTeam({ marketData, policyOverlay, eventRegimeOverlay, llm }) {
  const ticker = marketData.ticker || 'Stock';

  // 1. Fundamental Analyst
  const fundamentalSystemPrompt = `You are the Fundamental Analyst Agent.
Your task is to analyze the company's valuation, growth, cash flow, earnings stability, and analyst consensus.
Provide a strictly neutral, objective, and evidence-driven analysis. Do not recommend buying or selling; list only fact-based strengths and weaknesses.
Return your response in JSON format ONLY:
{
  "analysis": "A concise 2-3 sentence overview of fundamental factors (PE, ROE, Cash Flow, Earnings Surprise).",
  "evidence": ["Evidence point 1 (e.g. PE ratio is X)", "Evidence point 2 (e.g. ROE is Y%)", "Evidence point 3"]
}`;
  const fundamentalUserMessage = `Analyze ${ticker}.
Valuation & Fundamentals: PE ratio is ${marketData.pe || 'N/A'}, Trailing EPS is ${marketData.eps || 'N/A'}.
Advanced Fundamentals: Return on Equity (ROE) is ${marketData.advancedFundamentals?.returnOnEquity ? `${(marketData.advancedFundamentals.returnOnEquity * 100).toFixed(1)}%` : 'N/A'}, Free Cash Flow is ${marketData.advancedFundamentals?.freeCashflow ? `$${(marketData.advancedFundamentals.freeCashflow / 1e6).toFixed(1)}M` : 'N/A'}.
Earnings Surprise history: ${JSON.stringify(marketData.earningsSurprise || [])}.
Analyst Consensus: Strong Buy/Buy: ${(marketData.analystConsensus?.strongBuy || 0) + (marketData.analystConsensus?.buy || 0)}, Hold: ${marketData.analystConsensus?.hold || 0}, Sell/Strong Sell: ${(marketData.analystConsensus?.sell || 0) + (marketData.analystConsensus?.strongSell || 0)}, target mean is $${marketData.analystConsensus?.targetMean || 'N/A'} (implied upside is ${marketData.analystConsensus?.upside || 'N/A'}%).`;

  // 2. Sentiment Analyst
  const sentimentSystemPrompt = `You are the Sentiment Analyst Agent.
Your task is to analyze news/social media sentiment, short interest pressure, and insider transactions.
Provide a strictly neutral, objective, and evidence-driven analysis. List positive and negative sentiment signals with direct data points.
Return your response in JSON format ONLY:
{
  "analysis": "A concise 2-3 sentence overview of market sentiment, short interest, and insider trading.",
  "evidence": ["Evidence point 1 (e.g. Sentiment score is X)", "Evidence point 2 (e.g. Insider net shares is Y)", "Evidence point 3"]
}`;
  let insiderText = 'No recent insider transactions.';
  if (marketData.insiderTransactions && marketData.insiderTransactions.length > 0) {
    let netShares = 0;
    marketData.insiderTransactions.forEach(t => {
      const shares = typeof t.shares === 'object' ? Number(t.shares?.raw || 0) : Number(t.shares || 0);
      const isPurchase = (t.transactionText || '').toLowerCase().includes('buy') || (t.transactionText || '').toLowerCase().includes('purchase') || (t.transactionText || '').toLowerCase().includes('award');
      const isSale = (t.transactionText || '').toLowerCase().includes('sale') || (t.transactionText || '').toLowerCase().includes('sell');
      if (isPurchase) netShares += shares;
      else if (isSale) netShares -= shares;
    });
    insiderText = `Net insider transaction volume: ${netShares > 0 ? '+' : ''}${netShares.toLocaleString()} shares over recent transactions.`;
  }
  const shortPercent = marketData.shortMetrics?.shortPercent || 0;
  const sentimentUserMessage = `Analyze ${ticker}.
News Sentiment Score: ${marketData.sentimentScore || 0} (${marketData.sentimentLabel || 'Neutral'}).
Short Selling Interest: ${shortPercent}% of float shorted (DataSource: ${marketData.shortMetrics?.dataSource || 'N/A'}).
Insider Trading: ${insiderText}`;

  // 3. News Analyst
  const newsSystemPrompt = `You are the News Analyst Agent.
Your task is to analyze macroeconomic conditions, central bank policy biases, event regimes, and cross-asset macro anchors.
Provide a strictly neutral, objective, and evidence-driven macro analysis. Discuss tailwinds and headwinds with macro data points.
Return your response in JSON format ONLY:
{
  "analysis": "A concise 2-3 sentence overview of macroeconomic context, central bank policy, and geopolitical event regimes.",
  "evidence": ["Evidence point 1 (e.g. Fed policy bias is X)", "Evidence point 2 (e.g. VIX is Y)", "Evidence point 3"]
}`;
  const macroContext = marketData.macroContext || {};
  const newsUserMessage = `Analyze ${ticker} macro surroundings.
Macro Context: Risk Level is ${macroContext.riskLevel || 'MEDIUM'}, Sentiment is ${macroContext.sentimentLabel || 'Neutral'} (Score: ${macroContext.sentimentScore || 0}).
Dominant Macro Themes: ${JSON.stringify(macroContext.dominantThemes || [])}.
Macro Indicators: CPI inflation is ${macroContext.macroIndicators?.cpi || 'N/A'}%, Unemployment rate is ${macroContext.macroIndicators?.unemploymentRate || 'N/A'}%.
Policy Overlay: Net Bias is ${policyOverlay?.netBias || 0}, Details: ${policyOverlay?.summary || 'N/A'}.
Event Regime Overlay: Net Bias is ${eventRegimeOverlay?.netBias || 0}, Direction: ${eventRegimeOverlay?.direction || 'NEUTRAL'}, Summary: ${eventRegimeOverlay?.summary || 'N/A'}.
Cross-Asset Macro Anchors: ${JSON.stringify(marketData.macroAnchors || [])}.`;

  // 4. Technical Analyst
  const technicalSystemPrompt = `You are the Technical Analyst Agent.
Your task is to analyze price structure, moving averages, daily momentum, oscillators, and key technical indicators.
Provide a strictly neutral, objective, and evidence-driven analysis of the stock's chart structure.
Return your response in JSON format ONLY:
{
  "analysis": "A concise 2-3 sentence overview of technical structure, trend lines, moving averages, and oscillators.",
  "evidence": ["Evidence point 1 (e.g. Price is above/below MA50)", "Evidence point 2 (e.g. RSI is Y)", "Evidence point 3"]
}`;
  const ti = marketData.technicalIndicators || {};
  const technicalUserMessage = `Analyze ${ticker} chart.
Price: $${marketData.price || 'N/A'}, 50-day MA is $${marketData.ma50 || 'N/A'}, 200-day MA is $${marketData.ma200 || 'N/A'}.
Daily Change: ${marketData.changePercent || 0}% today.
RSI: ${marketData.rsi || 'N/A'} (14-day).
MACD: Signal is ${ti.macd?.signal || 'N/A'}, Hist: ${ti.macd?.histogram || 'N/A'}, Line: ${ti.macd?.macdLine || 'N/A'}, SignalLine: ${ti.macd?.signalLine || 'N/A'}.
Bollinger Bands: Signal is ${ti.bollingerBands?.signal || 'N/A'}, Band Position: ${ti.bollingerBands?.bbPosition || 'N/A'}.
KDJ: Signal is ${ti.kdj?.signal || 'N/A'}, K: ${ti.kdj?.k || 'N/A'}, D: ${ti.kdj?.d || 'N/A'}, J: ${ti.kdj?.j || 'N/A'}.
OBV: Signal is ${ti.obv?.signal || 'N/A'}, Value: ${ti.obv?.obv || 'N/A'}.
VWAP: Signal is ${ti.vwap?.signal || 'N/A'}, Value: ${ti.vwap?.vwap || 'N/A'}.`;

  // Execute Layer 1 calls in parallel
  const [fundamentalReport, sentimentReport, newsReport, technicalReport] = await Promise.all([
    (async () => {
      try {
        const res = await llm(fundamentalSystemPrompt, fundamentalUserMessage);
        return parseJsonResponse(res, {
          analysis: `Fundamental factors processed for ${ticker}. Valuation PE stands at ${marketData.pe || 'N/A'}.`,
          evidence: [`PE Ratio: ${marketData.pe || 'N/A'}`, `EPS: ${marketData.eps || 'N/A'}`]
        });
      } catch (err) {
        console.warn('[Fundamental Analyst] Failed:', err.message);
        return {
          analysis: `Fallback fundamental analysis for ${ticker}.`,
          evidence: [`Valuation indicators are loaded`, `Analyst targets processed`]
        };
      }
    })(),
    (async () => {
      try {
        const res = await llm(sentimentSystemPrompt, sentimentUserMessage);
        return parseJsonResponse(res, {
          analysis: `Sentiment metrics analyzed. Short float stands at ${shortPercent}%.`,
          evidence: [`Sentiment Score: ${marketData.sentimentScore || 0}`, `Short Percent: ${shortPercent}%`]
        });
      } catch (err) {
        console.warn('[Sentiment Analyst] Failed:', err.message);
        return {
          analysis: `Fallback sentiment analysis for ${ticker}.`,
          evidence: [`News sentiment indicators parsed`, `Insider activity checked`]
        };
      }
    })(),
    (async () => {
      try {
        const res = await llm(newsSystemPrompt, newsUserMessage);
        return parseJsonResponse(res, {
          analysis: `Macro and global news context evaluated. Net regime bias is ${eventRegimeOverlay?.netBias || 0}.`,
          evidence: [`Macro Risk: ${macroContext.riskLevel || 'MEDIUM'}`, `Policy Net Bias: ${policyOverlay?.netBias || 0}`]
        });
      } catch (err) {
        console.warn('[News Analyst] Failed:', err.message);
        return {
          analysis: `Fallback news and macro analysis for ${ticker}.`,
          evidence: [`Central bank guidelines compiled`, `Macro anchors analyzed`]
        };
      }
    })(),
    (async () => {
      try {
        const res = await llm(technicalSystemPrompt, technicalUserMessage);
        return parseJsonResponse(res, {
          analysis: `Technical chart indicators analyzed. Current price is $${marketData.price || 'N/A'}.`,
          evidence: [`RSI (14): ${marketData.rsi || 'N/A'}`, `Price relative to MA50: ${marketData.price > marketData.ma50 ? 'Above' : 'Below'}`]
        });
      } catch (err) {
        console.warn('[Technical Analyst] Failed:', err.message);
        return {
          analysis: `Fallback technical chart analysis for ${ticker}.`,
          evidence: [`Moving averages loaded`, `Oscillators evaluated`]
        };
      }
    })()
  ]);

  return {
    fundamental: fundamentalReport,
    sentiment: sentimentReport,
    news: newsReport,
    technical: technicalReport
  };
}

module.exports = {
  runAnalystTeam
};
