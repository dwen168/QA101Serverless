# Multi-Factor Stock Selection Model — Reference

## Factor Definitions & Calibration

### Momentum Factor
**Purpose**: Capture recent price trend and acceleration.

**Calculation**:
```
momentum_1d  = (close[today] - close[1day_ago]) / close[1day_ago] * 100
momentum_5d  = (close[today] - close[5days_ago]) / close[5days_ago] * 100
momentum_1m  = (close[today] - close[30days_ago]) / close[30days_ago] * 100
avg_momentum = (momentum_1d + momentum_5d + momentum_1m) / 3

ma50_slope   = (price - ma50) / ma50 * 100
momentum_score = 50 + (avg_momentum + ma50_slope) / 2
// Clamp to [0, 100]
```

**Interpretation**:
- > 60: Strong uptrend, buy signal
- 40–60: Neutral/consolidating
- < 40: Downtrend, sell signal

**Typical range for S&P 500 stocks**: −5% to +15% (annualized momentum between −20% to +50%)

---

### Quality Factor
**Purpose**: Identify profitable, well-regarded stocks with positive sentiment.

**Sub-components**:
1. **Valuation Quality** (0–25 pts)
   - PE < 20: +25 pts (cheap)
   - PE 20–30: +15 pts (fair)
   - PE 30–50: +5 pts (expensive)
   - PE > 50: 0 pts (speculative)

2. **Earnings Quality** (0–25 pts)
   - EPS > 0 and EPS growth YoY > 10%: +25 pts
   - EPS > 0 and EPS growth > 0%: +15 pts
   - EPS stagnating: +5 pts
   - EPS declining: 0 pts

3. **Sentiment Quality** (0–25 pts)
   - Sentiment score > +0.5: +25 pts (very bullish)
   - Sentiment score +0.3 to +0.5: +15 pts (bullish)
   - Sentiment score −0.3 to +0.3: +10 pts (neutral)
   - Sentiment score < −0.5: 0 pts (bearish)

4. **Analyst Support** (0–25 pts)
   - Analyst upside > 15%: +25 pts
   - Analyst upside 10–15%: +15 pts
   - Analyst upside 0–10%: +10 pts
   - Analyst upside < 0%: 0 pts

**Total Quality Score**: Sum of sub-components, max 100.

---

### Risk-Adjusted Factor
**Purpose**: Penalize high-volatility, overbought positions; reward stability and oversold contrarian opportunities.

**Calculation**:
```
volatility_percentile = (stock_vol - sector_min_vol) / (sector_max_vol - sector_min_vol) * 100
risk_score = 100 - volatility_percentile  // Higher score = lower volatility

RSI_adjustment:
  if RSI > 70: risk_score -= 20  // Overbought, pullback risk
  if RSI < 30: risk_score += 15  // Oversold, bounce opportunity
  if RSI 40–60: risk_score += 5  // Healthy zone

riskAdjustedScore = max(0, min(100, risk_score))
```

**Interpretation**:
- > 70: Low volatility, low overextension → Safe
- 50–70: Moderate risk profile
- < 50: High volatility or overbought → Speculative

---

### Composite Multi-Factor Score

**Weighting** (configurable per time horizon):

**SHORT-term (< 2 weeks):**
- Momentum: 50% (fast price action dominates)
- Quality: 30%
- Risk-adjusted: 20%

**MEDIUM-term (2–8 weeks):**
- Momentum: 30% (balanced)
- Quality: 40%
- Risk-adjusted: 30%

**LONG-term (> 2 months):**
- Momentum: 20% (less relevant; structural trends matter)
- Quality: 50% (fundamentals dominate)
- Risk-adjusted: 30% (volatility control important)

**Formula**:
```
compositeScore = momentum * w_momentum + quality * w_quality + riskAdj * w_risk
// Typically: MEDIUM-term = 30% momentum + 40% quality + 30% risk-adjusted
```

---

## Correlation Matrix & Diversification

### Correlation Coefficient (Pearson)
**Purpose**: Identify redundant exposures within portfolio.

**Calculation**:
```
log_returns[i,t] = ln(price[i,t] / price[i,t-1])
correlation[i,j] = cov(returns_i, returns_j) / (std_i × std_j)
// Range: −1 (perfect inverse) to +1 (perfect positive)
```

**Interpretation**:
- **> 0.75**: Highly correlated (redundant); consider removing one
- **0.50–0.75**: Moderately correlated (acceptable)
- **0.25–0.50**: Weakly correlated (good diversification pair)
- **< 0.25**: Nearly uncorrelated or inversely correlated (excellent hedge)

### Correlation-Weighted Concentration

Measures portfolio-level diversification risk:
```
concentration = Σ_i Σ_j allocation[i] × allocation[j] × corr[i,j]
// Min = allocation^2 (all one stock)
// Max = N × (avg_allocation)^2 if all perfectly correlated
```

**Target**:
- < 0.25: Very well diversified
- 0.25–0.50: Well diversified
- 0.50–0.75: Moderately concentrated
- > 0.75: Highly concentrated (risky)

### Data-Source Diagnostics
The current implementation also tracks where each ticker's upstream market data came from:

- `alpha-vantage` and `yahoo-finance` count as live sources
- `mock` indicates live retrieval failed or timed out
- Portfolio output includes a `dataSources` object with `status`, `sourceBreakdown`, `details`, and a summary message

This helps distinguish portfolio conclusions built from fully live data versus mixed or degraded inputs.

---

## Sector Rotation Framework

**Sector Rotation Cycle** (macro-driven):
1. **Crisis Recovery**: Utilities, Healthcare (defensive)
2. **Early Cycle**: Industrials, Consumer Discretionary, Tech (growth)
3. **Mid Cycle**: Healthcare, Financials (maturing growth)
4. **Late Cycle**: Utilities, Consumer Staples, Treasuries (defensive)
5. **Slowdown**: Energy shifts, Staples lead

**QuantBot Sector Strength Score**:
```
sectorStrength[sector] = avg(momentumScore for tickers in sector) * 0.4 +
                          avg(qualityScore for tickers in sector) * 0.4 +
                          avg(riskAdjustedScore for tickers in sector) * 0.2
// Range: 0–100
// > 70 = attractive sector
// < 40 = stressed sector
```

---

## Position Sizing & Kelly Criterion

**Simplified Kelly Criterion**:
```
optimal_fraction = (win_probability * avg_win − lose_probability × avg_loss) / avg_win
target_position = optimal_fraction × portfolio_value
// Typically scale down by 1/4 for safety (quarter-Kelly)
```

**QuantBot Heuristic Allocation** (based on score):

| Score | Allocation |
|-------|-----------|
| 75–100 | 8–10% per position |
| 60–74 | 5–7% |
| 45–59 | 3–5% |
| 30–44 | 1–3% |
| < 30 | 0% (exit) |

In the current skill, live ticker fetches are intentionally sequenced instead of run in parallel to reduce Alpha Vantage free-tier burst failures. When a paid or higher-rate source is introduced later, this can be revisited.

---

## Expected Return & Volatility

**Expected Portfolio Return** (simple):
```
E[R_portfolio] = Σ allocation[i] × E[R_i]
where E[R_i] approximates (upside_target_% / time_horizon_months)
```

**Portfolio Volatility** (with correlation):
```
σ_portfolio = sqrt(Σ_i Σ_j allocation[i] × allocation[j] × cov[i,j])
where cov[i,j] = corr[i,j] × σ_i × σ_j
```

**Sharpe Ratio** (risk-adjusted return):
```
sharpeRatio = (E[R_portfolio] − risk_free_rate) / σ_portfolio
// Typical benchmark: > 0.5 (decent), > 1.0 (excellent)
```

---

## Portfolio Narrative

The current implementation does **not** call an LLM for portfolio commentary.

- `portfolioNarrative` is generated deterministically from ranked tickers, sector strength, diversification metrics, and macro regime
- `llmNarrative` is retained only as a compatibility alias and mirrors `portfolioNarrative`
- This reduces token usage and makes portfolio output more stable across providers

---

## Backtesting & Calibration Notes

**Walk-Forward Validation**:
- Train factors on historical data (1–2 years)
- Test on out-of-sample period (3–6 months)
- Rebalance monthly or quarterly
- Track factor decay and adjust weights

**Common Pitfalls**:
- **Overfitting**: Too many factors or time-sensitive thresholds
- **Survivorship bias**: Data excludes delisted stocks
- **Lookahead bias**: Using future data in signal computation
- **Regime change**: Factors perform differently in bull/bear markets

---

## Disclaimer

All factor scores and models are for **educational purposes only**. Past factor performance does not guarantee future results. Actual portfolio construction should include regulatory compliance, tax optimization, liquidity constraints, and personal risk tolerance. Consult a licensed financial advisor before investing.
