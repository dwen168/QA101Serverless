# Market Data Sources — Reference

## Current Architecture (Production Ready)

The market-intelligence skill uses **live data with timeout-aware fallback behavior**:

| Data Type | Primary Source | Fallback | Notes |
|-----------|---|---|---|
| **Price & Volume** | Alpha Vantage (`TIME_SERIES_DAILY`) | Yahoo Finance, then Mock | 25 req/day free; `REAL_DATA_TIMEOUT_MS` applies to live requests |
| **News & Sentiment** | Finnhub (`/company-news`) | Yahoo Finance news, then Mock | 60 req/min free; local rule-based sentiment scoring |
| **Analyst Consensus** | Finnhub (`/stock/recommendation/`) | Mock | Average of strongBuy, buy, hold, sell, strongSell counts |
| **Price Targets** | Finnhub (`/stock/price-target`) | Mock | High, low, mean from recent analyst estimates |
| **Fundamentals** | Finnhub (`/stock/profile2`, `/stock/metric`) | Mock | P/E, EPS, market cap, sector, industry |
| **Macro / Geopolitical News** | Finnhub general news + NewsAPI | Empty macro feed | Used to build `macroContext` with dominant themes and risk level |
| **Technical Indicators** | Local Computation | N/A | MACD, Bollinger Bands, KDJ, OBV, VWAP calculated from price history |

---

## Supported Live Data Providers

### Price & Fundamentals

| Provider | Free Tier | npm Package | Notes |
|----------|-----------|-------------|-------|
| **Alpha Vantage** ✅ *in use* | 25 req/day | — (use `fetch`) | Env var: `ALPHA_VANTAGE_API_KEY` |
| **Yahoo Finance 2** | Unlimited (unofficial) | `yahoo-finance2` | No API key needed |
| **Polygon.io** | 5 req/min | — (use `axios`) | Requires registration |
| **Finnhub** ✅ *in use* | 60 req/min | — (use `axios`) | News, analyst consensus, price targets, fundamentals |

### Alpha Vantage — Quick Integration
```js
// Daily prices (TIME_SERIES_DAILY)
const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`;
const { data } = await axios.get(url);
const timeSeries = data['Time Series (Daily)'];
```

### Yahoo Finance 2 — Quick Integration
```js
const yahooFinance = require('yahoo-finance2').default;
const quote  = await yahooFinance.quote(ticker);
const chart  = await yahooFinance.chart(ticker, { interval: '1d', range: '1mo' });
```

---

### Finnhub — Quick Integration ✅ *currently implemented*
```js
// News and sentiment
const newsRes = await axios.get(`https://finnhub.io/api/v1/company-news`, {
  params: { symbol: ticker, apikey: process.env.FINNHUB_API_KEY }
});

// Analyst consensus
const consRes = await axios.get(`https://finnhub.io/api/v1/stock/recommendation`, {
  params: { symbol: ticker, apikey: process.env.FINNHUB_API_KEY }
});

// Price targets
const targetRes = await axios.get(`https://finnhub.io/api/v1/stock/price-target`, {
  params: { symbol: ticker, apikey: process.env.FINNHUB_API_KEY }
});

// Fundamentals
const profileRes = await axios.get(`https://finnhub.io/api/v1/stock/profile2`, {
  params: { symbol: ticker, apikey: process.env.FINNHUB_API_KEY }
});

const metricsRes = await axios.get(`https://finnhub.io/api/v1/stock/metric`, {
  params: { symbol: ticker, metric: 'all', apikey: process.env.FINNHUB_API_KEY }
});
```

---

## Sentiment Scoring ✅ *currently implemented*
Market-intelligence uses **local rule-based headline scoring**:
- Scans headlines for positive and negative finance/macro keywords
- No external API or LLM required; entirely local computation
- Score bounds: [−1.0, +1.0]
- Company news and macro news both use the same deterministic scoring path

**Functions:** `scoreHeadlineSentimentFallback(headline)` and `scoreSentimentsWithRules(headlines)` in `skills/market-intelligence/scripts/index.js`

---

## Technical Indicators ✅ *currently implemented*
All technical indicators are computed locally from price history (no external API):
- **MACD** — 12-EMA, 26-EMA, 9-EMA signal line
- **Bollinger Bands** — 20-SMA ± 2σ with position and overbought/oversold signals
- **KDJ (Stochastic)** — %K, %D, %J with oversold/overbought detection
- **OBV (On-Balance Volume)** — Cumulative volume trend confirmation
- **VWAP** — Volume-weighted average price; support/resistance level

**Module:** `backend/lib/technical-indicators.js` with `calculateAllIndicators(priceData)` orchestrator

**References:** See `skills/market-intelligence/references/technical-indicators.md` for detailed interpretation, strategy guidance, and backtested Sharpe ratios.

---

## News & Sentiment Providers (Alternative)

| Provider | Free Tier | Endpoint | Status |
|----------|-----------|----------|--------|
| **Finnhub News** ✅ | 60 req/min | `/company-news` | In use |
| **NewsAPI** | 100 req/day | `https://newsapi.org/v2/everything` | In use for macro-news enrichment |
| **Benzinga** | Paid | REST API | Not implemented |

### NewsAPI — Quick Integration (Optional)
```js
const newsRes = await axios.get(`https://newsapi.org/v2/everything`, {
  params: { q: ticker, sortBy: 'publishedAt', pageSize: 5, apiKey: process.env.NEWS_API_KEY }
});
const articles = newsRes.data.articles;
```


## Rate Limit Recommendations
- Cache market data for ≥ 1 minute per ticker to avoid hitting free-tier limits.
- Add an in-memory Map or Redis cache keyed on `${ticker}:${date}`.
- Keep Alpha Vantage as a best-effort source; if it returns `Note` or `Information`, degrade to Yahoo Finance or mock data instead of failing the skill.
- Apply short enrichment timeouts to optional news/fundamental calls so price retrieval does not get blocked by secondary endpoints.
