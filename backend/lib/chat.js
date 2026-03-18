const axios = require('axios');
const config = require('./config');

async function routeChatMessage({ message, history = [] }) {
  const systemPrompt = `You are QuantBot, an AI-powered quantitative analysis assistant. You help users analyze stocks using three specialized Agent Skills:

1. **market-intelligence** — Collects price trends, news, consensus, and sentiment
2. **eda-visual-analysis** — Performs visual exploratory data analysis
3. **trade-recommendation** — Generates BUY/HOLD/SELL recommendations

When a user mentions a stock ticker or asks to analyze a stock, you MUST:
1. Acknowledge you'll run the analysis
2. Return a JSON command to trigger the skill pipeline

ALWAYS respond with a JSON object in this format:
{
  "message": "Your conversational response here",
  "action": null OR "ANALYZE_STOCK",
  "ticker": null OR "TICKER_SYMBOL",
  "skillSequence": null OR ["market-intelligence", "eda-visual-analysis", "trade-recommendation"]
}

For non-stock questions, set action to null and just respond conversationally.
For stock analysis requests, extract the ticker and set action to "ANALYZE_STOCK".

Common tickers: AAPL (Apple), TSLA (Tesla), NVDA (Nvidia), MSFT (Microsoft), AMZN (Amazon), GOOGL (Google), META (Meta).

Be concise, professional, and enthusiastic about quantitative analysis.`;

  const messages = [
    ...history.map((entry) => ({ role: entry.role, content: entry.content })),
    { role: 'user', content: message },
  ];

  try {
    if (!config.deepseekApiKey) {
      throw new Error('DEEPSEEK_API_KEY is not configured');
    }

    const response = await axios.post(
      `${config.deepseekBaseUrl}/chat/completions`,
      {
        model: 'deepseek-chat',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.5,
        max_tokens: 500,
      },
      {
        headers: {
          Authorization: `Bearer ${config.deepseekApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const content = response.data.choices[0].message.content;
    const cleaned = String(content || '').replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    // Fallback: extract ticker from message
    // Matches: US tickers (AAPL, TSLA, CBA), international (CBA.AX, 7203.T, HSBA.L), NASDAQ/NYSE codes
    const msg = String(message || '').toUpperCase().trim();
    
    // Pattern: 1-6 alphanumeric chars, optionally followed by dot and 1-3 letter exchange code
    const tickerMatch = msg.match(/\b([A-Z0-9]{1,6}(?:\.[A-Z]{1,3})?)\b/);
    
    // Check if message looks like a ticker query (ticker alone, or with action keywords)
    const hasActionKeyword = msg.toLowerCase().match(/analyz|buy|sell|recommend|look at|check|research|price|news|target|opinion|should i|what.?s|performance/);
    const isTickerOnly = tickerMatch && msg.split(/\s+/).length <= 2; // Just ticker, maybe with one word
    
    if (tickerMatch && (hasActionKeyword || isTickerOnly)) {
      const ticker = tickerMatch[1];
      return {
        message: `I'll analyze ${ticker} for you! Running all three skills now...`,
        action: 'ANALYZE_STOCK',
        ticker: ticker,
        skillSequence: ['market-intelligence', 'eda-visual-analysis', 'trade-recommendation'],
      };
    }

    return {
      message: 'I\'m QuantBot! Ask me to analyze any stock — try "Analyze AAPL", "CBA.AX", or "Should I buy NVDA?"',
      action: null,
      ticker: null,
    };
  }
}

module.exports = {
  routeChatMessage,
};
