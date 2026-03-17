---
name: eda-visual-analysis
description: >
  Performs Exploratory Data Analysis (EDA) on a MarketIntelligenceReport.
  Computes moving averages (MA10, MA20) from price history, generates Chart.js
  configuration objects for four chart types (price trend, volume, analyst
  consensus donut, news sentiment bars), and produces key textual insights via LLM.
metadata:
  version: "1.0.0"
  author: QuantBot
  inputs:
    - name: marketData
      type: MarketIntelligenceReport
      description: The full output object from the market-intelligence skill
      required: true
  outputs:
    - name: charts
      type: object
      description: Chart.js configuration objects for four charts
    - name: edaInsights
      type: object
      description: LLM-generated textual EDA findings
  tags:
    - finance
    - visualization
    - eda
    - chart-js
    - technical-analysis
---

# Skill: eda-visual-analysis

## Purpose
Transform raw market data into visual and textual insights. This skill is the SECOND step in the QuantBot pipeline, always called after `market-intelligence` and before `trade-recommendation`.

## Execution Steps

### Step 1 — Prepare Time-Series Data
From `marketData.priceHistory` (30 daily entries):
- Extract `labels` — date strings formatted as MM-DD (e.g., "03-17")
- Extract `prices` — array of closing prices
- Extract `volumes` — array of daily volumes

### Step 2 — Compute Moving Averages
Helper: `computeMA(data, period)` — for each index i, average the last `period` values (return `null` if fewer than `period` data points exist).
- **MA10** — 10-day moving average of closing prices
- **MA20** — 20-day moving average of closing prices

### Step 3 — Build Chart Configurations

#### Chart A: Price & Moving Averages (Line chart, full-width)
```
Title: "{TICKER} — 30-Day Price & Moving Averages"
Datasets:
  - Price line (cyan #00d4ff, filled, tension 0.3, no point markers)
  - MA10 dashed line (amber #f59e0b, dash [4,4])
  - MA20 dashed line (green #10b981, dash [8,4])
```

#### Chart B: Volume Analysis (Bar + Line combo)
```
Title: "{TICKER} — Volume Analysis"
Datasets:
  - Volume bars — red (rgba(239,68,68,0.7)) if volume > avgVolume × 1.3, else cyan (rgba(0,212,255,0.4))
  - Avg Volume reference line (amber dashed)
```

#### Chart C: Analyst Consensus (Doughnut, 65% cutout)
```
Title: "{TICKER} — Analyst Consensus"
Labels: ['Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell']
Colors: ['#10b981', '#6ee7b7', '#f59e0b', '#f87171', '#dc2626']
Data: [strongBuy, buy, hold, sell, strongSell]
```

#### Chart D: News Sentiment (Bar chart)
```
Title: "{TICKER} — News Sentiment"
Labels: news source names
Dataset: sentiment scores per source
Colors: green (rgba(16,185,129,0.7)) if score > 0, red (rgba(239,68,68,0.7)) if score ≤ 0
Y-axis range: −1 to +1
```

### Step 4 — LLM Analysis (EDA Insights)
Send a prompt to the LLM containing the following market data summary:
- Current price, RSI, Trend, Sentiment score, MA20, MA50

Request the LLM to return a JSON object:
- `insights` — array of 4 key EDA observations (plain English, quantitative where possible)
- `riskFlags` — array of risk flags (e.g., "Overbought — potential pullback risk")
- `technicalSummary` — 1–2 sentences synthesising the technical picture
- `momentumSignal` — one of: POSITIVE, NEGATIVE, NEUTRAL

#### Fallback (if LLM unavailable)
Compute insights deterministically:
1. RSI zone analysis (`> 70` → overbought, `< 30` → oversold, else healthy range)
2. Price deviation from MA50 (%)
3. Sentiment label + score
4. Analyst upside potential (%)

### Step 5 — Return Response
```json
{
  "charts": {
    "priceChart": { "type": "line", "title": "...", "data": { "labels": [], "datasets": [] } },
    "volumeChart": { "type": "bar",  "title": "...", "data": { "labels": [], "datasets": [] } },
    "analystChart": { "type": "doughnut", "title": "...", "data": { "labels": [], "datasets": [] } },
    "sentimentChart": { "type": "bar", "title": "...", "data": { "labels": [], "datasets": [] } }
  },
  "edaInsights": {
    "insights": ["...", "...", "...", "..."],
    "riskFlags": [],
    "technicalSummary": "...",
    "momentumSignal": "POSITIVE"
  },
  "skillUsed": "eda-visual-analysis"
}
```

## References
- See `references/chart-types.md` for Chart.js configuration patterns and theming guidelines.
