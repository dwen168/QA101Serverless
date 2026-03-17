# Equity Risk Factors — Reference

## Signal Scoring Quick Reference

| Signal | Bull (+) | Bear (−) |
|--------|----------|----------|
| Price vs MA50 | > MA50 → +2 | < MA50 → −2 |
| Price vs MA200 | > MA200 → +1 | < MA200 → −1 |
| RSI (14) | 45–65 → +1; < 30 → +1 (contrarian) | > 70 → −2 |
| News Sentiment | score > 0.3 → +2 | score < −0.3 → −2 |
| Analyst Consensus | Buy% > 60% → +2 | Buy% < 30% → −1 |
| Price Target Upside | upside > 10% → +1 | upside < −5% → −1 |
| Daily Momentum | changePercent > +1.5% → +1 | changePercent < −2% → −1 |

**Max theoretical score:** +12 (all bullish) / −12 (all bearish)

---

## Risk Factor Taxonomy

### Market / Macro Risks
- **Interest rate risk** — Rising rates compress equity valuations (especially growth stocks)
- **Inflation** — Erodes consumer spending; affects margins in non-pricing-power sectors
- **Recession risk** — GDP contraction typically precedes broad market drawdowns
- **Geopolitical risk** — Wars, sanctions, supply chain disruption

### Sector-Specific Risks
- **Technology** — Regulatory AI scrutiny, antitrust, valuation multiple compression
- **Energy** — Oil price volatility, energy transition regulation, geopolitics
- **Financials** — Credit cycle, loan default rates, interest margin squeezes
- **Healthcare** — Drug trial failures, FDA approval risk, patent cliffs
- **Automotive/EV** — Raw material costs (lithium, cobalt), consumer demand cycles

### Technical Risks
- **Overbought (RSI > 70)** — Momentum exhaustion; potential for mean reversion
- **Death cross (MA50 < MA200)** — Long-term bearish trend change signal
- **Volume divergence** — Rising price on falling volume = weakening confirmation
- **Support breakdown** — Price closing below key MA or prior support level

### Liquidity & Position Risks
- **Low float stocks** — High volatility, bid/ask spreads, manipulation risk
- **Earnings event risk** — Outsized moves around quarterly reports
- **Options expiry risk** — Pin risk and gamma squeezes near option strikes

---

## Position Sizing Guidance (Educational)

The Kelly Criterion provides a theoretical optimal position size:
```
f* = (bp − q) / b
where:
  b = odds received (risk/reward ratio)
  p = probability of win (estimated from confidence %)
  q = 1 − p
```
In practice, use **half-Kelly** or cap any single position at 5–10% of portfolio.

**ATR-based stop-loss** (used in QuantBot):
```
ATR ≈ (52w_high − 52w_low) / 52
Stop Loss = entry − 1.5 × ATR
Take Profit = entry + 2.5 × ATR
Risk/Reward = 2.5 / 1.5 ≈ 1.67
```
A risk/reward ≥ 2.0 is generally preferred for discretionary trades.

---

## Disclaimer
All risk factor descriptions and scoring models in QuantBot are for **educational and demonstration purposes only**. They do not constitute financial advice, investment recommendations, or a solicitation to buy or sell any security. Past performance is not indicative of future results. Always consult a licensed financial advisor before making investment decisions.
