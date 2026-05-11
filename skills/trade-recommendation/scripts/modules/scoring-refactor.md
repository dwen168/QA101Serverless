# Scoring Engine Modularization Proposal

Following the manual review, `scoring.js` (currently ~700 lines) was identified as a monolithic file handling the evaluation logic for all 15+ signal types. While its immediate performance and logic are sound, it poses a maintainability risk as more signals are added.

## Proposed Architecture

To reduce file size and simplify testing, `scoring.js` should be refactored into an aggregator pattern:

1. **`scoring/technical.js`**: Handles RSI, MA50/200, MACD, BB, VWAP, OBV, KDJ, and intraday/momentum signals.
2. **`scoring/fundamental.js`**: Handles valuation, profitability, EPS, insider transactions, and analyst consensus.
3. **`scoring/macro.js`**: Handles event-regime overlays, monetary policy overlays, and general macro risk/sentiment scores.
4. **`scoring/sentiment.js`**: Handles news sentiment, short interest, and volume signals.
5. **`scoring/eda.js`**: Handles EDA breakout/breakdown engineered factors.

## Implementation Strategy
A Context Object should be created at the top of `scoreSignals` in the orchestrator:

```javascript
const context = {
  marketData,
  edaInsights,
  profile,
  add: (name, points, reason, detail, bucket) => { /* logic */ },
  w: (key) => getSignalWeight(key),
  fmt: (n, digits = 2) => /* logic */
};

scoreTechnical(context);
scoreFundamental(context);
scoreMacro(context);
// ...
```

This prevents the need to pass numerous closure variables around and keeps the `add` mutator centralized. Because this refactoring touches every single active evaluation rule in the platform, it is recommended to be implemented in a dedicated branch with accompanying unit tests to ensure score parity before merging.
