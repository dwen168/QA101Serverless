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
    const tickerMatch = String(message || '').toUpperCase().match(/\b(AAPL|TSLA|NVDA|MSFT|AMZN|GOOGL|META|[A-Z]{2,5})\b/);
    if (tickerMatch && String(message || '').toLowerCase().match(/analyz|buy|sell|recommend|look at|check|research/)) {
      return {
        message: `I'll analyze ${tickerMatch[1]} for you! Running all three skills now...`,
        action: 'ANALYZE_STOCK',
        ticker: tickerMatch[1],
        skillSequence: ['market-intelligence', 'eda-visual-analysis', 'trade-recommendation'],
      };
    }

    return {
      message: 'I\'m QuantBot! Ask me to analyze any stock — try "Analyze AAPL" or "Should I buy NVDA?"',
      action: null,
      ticker: null,
    };
  }
}

module.exports = {
  routeChatMessage,
};
