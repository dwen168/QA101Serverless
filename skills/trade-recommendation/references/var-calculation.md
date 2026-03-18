# Value at Risk (VaR) Calculation
## Risk Measurement for Trade Recommendations

### Overview
**Value at Risk (VaR)** quantifies the maximum potential loss a position can suffer within a given time horizon at a specified confidence level.

**Formula:**
```
VaR = Mean − (Z-score × Standard Deviation)
```

Where:
- **Mean** = average of daily log returns [last 20 days]
- **Z-score** = 1.645 for 95% confidence, 2.326 for 99% confidence
- **StdDev** = volatility of daily returns

**Output:**
- **VaR%**: Percentage loss (e.g., -3.45%)
- **VaR$**: Dollar loss per share (e.g., -$6.39)
- **Interpretation**: "At 95% confidence, max 1-day loss is 3.45%"

---

## Example Calculation

**Input Data:**
- Current price: $185.50
- Last 20 daily returns: [-0.01, 0.02, -0.005, ..., 0.015]
- Mean return: 0.0045 (0.45%)
- Return stdev: 0.025 (2.5%)

**Calculation (95% confidence):**
```
Z-score(95%) = 1.645
VaR(95%)     = 0.0045 − (1.645 × 0.025)
             = 0.0045 − 0.0411
             = -0.0366 (−3.66%)

VaR$ = |−0.0366| × $185.50 = $6.79 loss per share
```

**Interpretation:**
- On 95 out of 100 days, daily loss will **not exceed** $6.79 (-3.66%) per share
- On 5 out of 100 days, loss could exceed $6.79 (tail risk)
- Useful for position sizing and risk alerts

---

## Implementation in QuantBot

### Where It's Computed
**File:** `backend/lib/technical-indicators.js`
**Function:** `calculateVaR(priceHistory, confidence=0.95)`

Input: 20+ days of OHLCV price data
Output: VaR metrics object

### Where It's Used
**File:** `skills/trade-recommendation/scripts/index.js`
**Function:** `runTradeRecommendation()`

Returns `riskMetrics` object with:
```javascript
{
  atr14: 2.10,
  var95: {
    varPercent: -3.45,
    varPrice: 6.39,
    confidence: 95,
    interpretation: "At 95% confidence, max 1-day loss is 3.45%"
  }
}
```

### API Response
```json
{
  "recommendation": { ... },
  "riskMetrics": {
    "atr14": 2.10,
    "var95": {
      "varPercent": -3.45,
      "varPrice": 6.39,
      "confidence": 95,
      "interpretation": "At 95% confidence, max 1-day loss is 3.45%"
    },
    "riskWarnifVarExceeds": {
      "message": "At 95% confidence, max 1-day loss is 3.45%",
      "maxDailyLoss": 6.39,
      "maxDailyLossPercent": 3.45
    }
  }
}
```

---

## Confidence Levels

| Confidence | Z-Score | Interpretation | Use Case |
|-----------|---------|----------------|----------|
| 90% | 1.282 | 1 in 10 days loss exceeds limit | Aggressive traders |
| **95%** | **1.645** | **1 in 20 days** | Standard practice |
| 99% | 2.326 | 1 in 100 days | Risk-averse/institutions |

---

## Interpreting the Output

### Scenario 1: Low VaR (Good)
```
AAPL
- Current price: $185.50
- VaR(95%): -1.5% [$2.78 per share]
→ Very stable stock, small daily swings
→ Good for conservative investors
```

### Scenario 2: High VaR (Risk)
```
TSLA
- Current price: $185.50
- VaR(95%): -6.8% [$12.62 per share]
→ Highly volatile stock, large daily swings
→ Requires larger stop-loss or position reduction
→ Better for risk-tolerant traders only
```

### Scenario 3: Tail Risk (Extreme)
```
Penny stock
- Current price: $185.50
- VaR(95%): -15.0% [$27.83 per share]
→ Extreme volatility or liquidity issues
→ Avoid or use only small speculative positions
```

---

## Position Sizing Example

Use VaR to calculate risk-appropriate position size:

```
Account risk limit per trade: 2% (e.g., $2,000 on $100k account)
VaR loss per share: $6.39
Position size = Account risk / VaR loss
              = $2,000 / $6.39
              = 312 shares

Result: 312 shares × $185.50 = $57,876 position
        If motion loss hit: $312 shares × $6.39 = ~$2,000 ✓
```

---

## Limitations & Assumptions

### Limitations
1. **Normal Distribution Assumption** — Assumes returns are normally distributed; markets often have fat tails (larger losses than predicted)
2. **Historical Volatility** — Uses last 20 days; doesn't account for regime changes
3. **1-Day Horizon** — Doesn't capture multi-day liquidation risk
4. **No Correlations** — Single-stock VaR ignores portfolio diversification effects

### How to Use Responsibly
- **Don't rely solely on VaR** — Combine with ATR, sentiment, and technical signals
- **Monitor actual vs forecasted losses** — Backtest VaR accuracy
- **Increase confidence% in crisis** — Switch to 99% VaR during high-volatility periods
- **Update frequently** — Recalculate daily as new data arrives

---

## Comparing VaR vs ATR-Based Targets

| Metric | ATR (1.5x SL) | VaR(95%) |
|--------|---------------|----------|
| **Basis** | Recent volatility | Historical daily returns |
| **Timeframe** | 14-day rolling | 20-day rolling |
| **Use Case** | Entry/exit price levels | Risk warning |
| **Advantage** | Direct price targets | Statistical interpretation |
| **Limitation** | Ignores return distribution | Doesn't give exact price levels |

**Best Practice:** Use both
- ATR → Determines stop-loss and take-profit prices
- VaR → Alerts you to position-sizing risk; validates ATR reasonableness

---

## Backtesting VaR Quality

To validate if VaR estimates are accurate:

```python
# Pseudocode
for each day in historical data:
  compute VaR(95%)
  compare to actual next-day loss
  count % of days where actual_loss > var_loss
  
expected_exceedance_rate = 5%  (1 in 20 days at 95% confidence)
```

If actual exceedance >> 5%, your estimate is too optimistic (need higher confidence level).
If actual exceedance << 5%, your estimate is too conservative.

---

## Advanced Extensions

### 1. Conditional VaR (CVaR / Expected Shortfall)
Average loss when VaR threshold is crossed:
```
CVaR = average of losses > VaR threshold
```
More sensitive to tail risk than VaR.

### 2. Rolling Window VaR
Recalculate daily to track VaR over time:
```
VaR(t) = VaR using returns from [t-20, t]
plot(VaR(t)) → risk curve showing rising/falling volatility
```

### 3. Sector-Adjusted VaR
Reduce individual stock VaR by correlation to portfolio:
```
Adjusted VaR = Stock VaR × (1 − β × correlationToPortfolio)
```

---

## References

- **Jorion, P.** "Value at Risk" (2007) — Industry standard textbook
- **Dowd, K.** "Measuring Market Risk" (2007)
- **Wikipedia:** https://en.wikipedia.org/wiki/Value_at_risk
- **Investopedia:** https://www.investopedia.com/terms/v/var.asp
