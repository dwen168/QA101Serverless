---
name: trade-recommendation
description: >
  Synthesizes market data and EDA insights into an actionable trade recommendation.
  Scores 8+ signals across trend, momentum, RSI, sentiment, and analyst consensus,
  maps the aggregate score to a BUY / HOLD / SELL action with a confidence percentage,
  computes entry, stop-loss, take-profit, and risk/reward, then uses the LLM to
  generate a plain-English rationale and key risk factors.
metadata:
  version: "1.0.0"
  author: QuantBot
  inputs:
    - name: marketData
      type: MarketIntelligenceReport
      description: Full market data object from the market-intelligence skill
      required: true
    - name: edaInsights
      type: object
      description: EDA insights object from the eda-visual-analysis skill (optional)
      required: false
  outputs:
    - name: recommendation
      type: TradeRecommendation
      description: Complete trade recommendation with action, targets, and rationale
  tags:
    - finance
    - recommendation
    - risk-management
    - signal-scoring
---

# Skill: trade-recommendation

## Purpose
Generate a data-driven, risk-aware trade recommendation. This skill is the THIRD and final step in the QuantBot pipeline.

## Execution Steps

### Step 1 — Signal Scoring
Evaluate each signal below and accumulate a total `score`. Each signal adds or subtracts points.

| # | Signal | Condition | Points |
|---|--------|-----------|--------|
| 1 | Price vs MA50 | price > MA50 | +2 |
|   |              | price < MA50 | −2 |
| 2 | Price vs MA200 | price > MA200 | +1 |
|   |               | price < MA200 | −1 |
| 3 | RSI Zone | RSI > 70 (overbought) | −2 |
|   |          | RSI < 30 (oversold, contrarian) | +1 |
|   |          | RSI 45–65 (healthy bullish) | +1 |
| 4 | News Sentiment | sentimentScore > 0.3 | +2 |
|   |                | sentimentScore < −0.3 | −2 |
| 5 | Analyst Consensus | Buy% > 60% | +2 |
|   |                   | Buy% < 30% | −1 |
| 6 | Analyst Price Target | upside > 10% | +1 |
|   |                      | upside < −5% | −1 |
| 7 | Daily Momentum | changePercent > +1.5% | +1 |
|   |               | changePercent < −2.0% | −1 |

### Step 2 — Map Score to Action
| Score Range | Action | Color |
|-------------|--------|-------|
| ≥ 6 | STRONG BUY | #10b981 |
| 3 – 5 | BUY | #6ee7b7 |
| −2 – 2 | HOLD | #f59e0b |
| −5 – −3 | SELL | #f87171 |
| ≤ −6 | STRONG SELL | #dc2626 |

**Confidence** = min(95, floor(|score| / 12 × 100 + 40)) — expressed as a percentage.

### Step 3 — Compute Price Targets
Using ATR (Average True Range) approximation:
```
atr   = (high52w − low52w) / 52
entry = currentPrice
stopLoss   = entry − (atr × 1.5)
takeProfit = entry + (atr × 2.5)
riskReward = (takeProfit − entry) / (entry − stopLoss)   [rounded to 1 dp]
```

### Step 4 — LLM Rationale
Send the following to the LLM:
- Action, score, and all scored signals (name + points)
- Request JSON output with:
  - `rationale` — 2–3 sentences explaining the recommendation
  - `timeHorizon` — SHORT (< 2 weeks), MEDIUM (2–8 weeks), or LONG (> 2 months)
  - `keyRisks` — array of 2–3 specific risk factors
  - `executiveSummary` — 1 plain-English sentence suitable for a non-technical reader

#### Fallback (if LLM unavailable)
Build deterministic defaults from signal data and Buy% value.

### Step 5 — Return Response
```json
{
  "recommendation": {
    "ticker": "AAPL",
    "action": "BUY",
    "actionColor": "#6ee7b7",
    "confidence": 72,
    "score": 4,
    "signals": [
      { "name": "Price > MA50", "points": 2, "reason": "Bullish trend confirmation" }
    ],
    "entry": 185.50,
    "stopLoss": 175.20,
    "takeProfit": 202.80,
    "riskReward": 1.7,
    "rationale": "...",
    "timeHorizon": "MEDIUM",
    "keyRisks": ["Market volatility", "Regulatory risk"],
    "executiveSummary": "...",
    "disclaimer": "⚠️ For educational/demo purposes only. Not financial advice."
  },
  "skillUsed": "trade-recommendation"
}
```

## References
- See `references/risk-factors.md` for a taxonomy of common equity risk factors and position sizing guidance.
