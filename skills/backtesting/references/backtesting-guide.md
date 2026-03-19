# Backtesting Guide
## Methodology, Pitfalls, and Best Practices

### Overview
Backtesting is the process of simulating a trading strategy on historical data to evaluate its performance **before risking real money**.

**Goal:** Answer: "Does this strategy have **predictive power over randomness**?"

---

## Key Components

### 1. Historical Data Quality
**Critical:** Backtesting is only as good as your data.

**Current QuantBot retrieval path:**
- Try Alpha Vantage first
- Fall back to Yahoo Finance if Alpha Vantage is unavailable, rate-limited, or times out
- Report the resolved source as `backtestReport.dataSource`
- Apply configurable per-source timeouts so slow vendors do not stall the entire run

**Data requirements:**
- ✅ Adjusted prices (dividends, splits removed)
- ✅ Complete trading days (no missing data)
- ✅ High-frequency venues (intraday trades should use 5-min+ bars)
- ✅ Survivorship bias corrected (don't use only survivors)

**What we check:**
```
- Min data points: 100+ trading days
- Recommended: 500+ days (2+ years for daily strategies)
- Optimal: 5+ years of history (multiple market regimes)
```

### 2. Signal Generation
QuantBot supports multiple signal types:

#### trade-recommendation (Default)
- 15-signal scoring model
- Buy/Hold/Sell actions based on aggregate score
- Incorporates sentiment, technicals, fundamentals

#### macd-bb (Simple Confluence)
- MACD bullish crossover + BB oversold → BUY
- MACD bearish crossover + BB overbought → SELL

#### Custom Signals
- Extend by adding new signal functions in `scripts/index.js`

### 3. Trade Simulation
**Entry Rules:**
- Signal = BUY → Open long position next bar at close[day]
- Signal = SELL (or HOLD) → Exit if position open

**Exit Rules (in priority order):**
1. **Stop-loss:** Loss > 3% from entry
2. **Take-profit:** Gain > 7% from entry
3. **Explicit sell signal:** Score drops to ≤ -3
4. **End of period:** Force-close remaining position

**Key assumption:** You can execute at close price (realistic for EOD strategies, not intraday scalping)

**Practical note:** If historical data cannot be retrieved from either live source with sufficient depth, the run should fail clearly instead of silently inventing prices.

### 4. Performance Metrics

#### Total Return %
```
ROI = (Final Capital - Initial Capital) / Initial Capital × 100
```
**Interpretation:** Overall profitability. Positive = profitable, negative = loss.

#### Win Rate %
```
Win Rate = (# profitable trades / # total trades) × 100
```
**Threshold:**
- \> 55% = Strong (better than a coin flip)
- 40-55% = Acceptable (with good profit factor)
- \< 40% = Risky (need large wins to offset)

#### Profit Factor
```
Profit Factor = Sum of winning trades / |Sum of losing trades|
```
**Threshold:**
- \> 2.0 = Excellent (earn $2 for every $1 lost)
- 1.5-2.0 = Good
- 1.0-1.5 = Acceptable
- \< 1.0 = Unprofitable

#### Sharpe Ratio
```
Sharpe = (Avg Return - Risk-Free Rate) / StdDev(Returns) × √252
```
**Interpretation:** Risk-adjusted return per unit of volatility.
**Threshold:**
- \> 1.5 = Excellent (strong excess return per risk)
- 1.0-1.5 = Good
- 0.5-1.0 = Acceptable (still positive)
- \< 0.5 = Weak (low risk-adjusted return)
- \< 0 = Negative (losses outpace risk)

#### Max Drawdown %
```
Max DD = (Peak Capital - Lowest Capital) / Peak Capital × 100
```
**Interpretation:** Worst peak-to-trough decline during backtest.
**Threshold:**
- \< 10% = Conservative
- 10-20% = Moderate risk
- 20-30% = Aggressive
- \> 30% = Extreme risk

#### CAGR (Annualized Return)
```
CAGR = (Final Capital / Initial Capital)^(1/years) - 1
```
**Interpretation:** Average yearly percentage gain.
**Benchmark:**
- S&P 500 avg ≈ 10% CAGR
- \> 20% = Very strong
- 10-20% = Competitive
- \< 5% = Underperforming

---

## Example Interpretation

### Scenario 1: Profitable & Safe ✅
```
- Total Return: +45% over 2 years
- Win Rate: 62%
- Profit Factor: 2.3
- Sharpe Ratio: 1.4
- Max Drawdown: -9%
- CAGR: 20%

→ Good strategy! Risk-adjusted returns are strong.
```

### Scenario 2: Profitable but Risky ⚠️
```
- Total Return: +50% over 2 years
- Win Rate: 45%
- Profit Factor: 1.2
- Sharpe Ratio: 0.6
- Max Drawdown: -28%
- CAGR: 22%

→ High returns but relies on few big wins. 
   Vulnerable to drawdowns. Consider:
   - Wider stop-loss?
   - More frequent exits?
   - Smaller position sizes?
```

### Scenario 3: Unprofitable ❌
```
- Total Return: -15%
- Win Rate: 35%
- Profit Factor: 0.8
- Sharpe Ratio: -0.4
- Max Drawdown: -32%
- CAGR: -7%

→ Strategy is losing money. Back to drawing board.
```

---

## Common Pitfalls (Overfitting)

### Pitfall #1: Curve Fitting
**Problem:** Optimize parameters so much that they fit the specific price movement (overfitting).

**Example:**
```
Original: "Buy if RSI < 30" → Win rate 58%
Optimized: "Buy if 27.3 < RSI < 28.9" → Win rate 89% (on historical data)
But on new data: Win rate 35% ❌
```

**Prevention:**
- Use walk-forward validation: train on data[0:50%], test on data[50:100%]
- Avoid over-optimizing parameters
- Use round numbers (30, not 27.3)

### Pitfall #2: Survivorship Bias
**Problem:** Only backtest stocks that survived (e.g., current S&P 500 constituents). Ignores ones that went bankrupt.

**Prevention:**
- Include delisted stocks
- Test on broad universe (all stocks, not just winners)

### Pitfall #3: Look-Ahead Bias
**Problem:** Using tomorrow's data to make today's decision.

**Example (wrong):**
```
if future_return[tomorrow] > 5%:  # ❌ Can't know this today!
  buy_today()
```

**Prevention:** Check that you only use data available at signal time.

### Pitfall #4: Insufficient Sample Size
**Problem:** Backtest with too few trades; statistics are unreliable.

**Threshold:**
- \< 20 trades = Very risky (random chance dominates)
- 20-50 trades = Marginal confidence
- 50-200 trades = Reasonable confidence
- \> 200 trades = Good confidence

**Prevention:** Test on longer time periods or shorter holding periods.

### Pitfall #5: Ignoring Costs
**Problem:** Assume zero commission, zero slippage, perfect execution.

**Reality:**
- Commission: $5-10 per trade (interactive brokers: ~$1)
- Slippage: 0.1-0.5% per trade (bid-ask spread + market impact)
- Bid-ask: $0.01-0.10 per share

**Prevention:** Subtract 0.2% per trade as buffer.

### Pitfall #6: Ignoring Data Source Degradation
**Problem:** Treating a fallback source exactly the same as the preferred source without surfacing it to the user.

**Why it matters:**
- Different vendors may have slightly different adjustments, timestamps, or missing bars
- A backtest run based on Yahoo fallback may not be perfectly comparable to one based on Alpha Vantage

**Prevention:**
- Always record and display `backtestReport.dataSource`
- Investigate repeated fallback use; it may indicate rate limits or timeout settings that are too aggressive

---

## Validation Techniques

### 1. Walk-Forward Analysis
Test strategy **in windows**, not all at once:

```
Period 1: Build on [2020-2021], Test on [2022]
Period 2: Build on [2021-2022], Test on [2023]
Period 3: Build on [2022-2023], Test on [2024]
Period 4: Build on [2023-2024], Test on [2025]

→ Average test results across all periods
```

If average test performance ≈ build performance, strategy is robust.
If test performance << build performance, overfitted.

### 2. Out-of-Sample Testing
```
Train: 2020-2023 (4 years)
Test: 2024-2025 (1 year, unseen data)
```

The test period should show **similar metrics** to training period.

### 3. Parameter Sensitivity Analysis
Change one parameter by ±10% and see if results change drastically:

```
Original: RSI < 30 → Buy (Win rate 58%)
Modified: RSI < 33 → Buy (Win rate 57%)
Modified: RSI < 27 → Buy (Win rate 59%)

→ Robust (insensitive to small changes)
```

vs.

```
Original: RSI < 30 → Buy (Win rate 58%)
Modified: RSI < 33 → Buy (Win rate 12%)  ❌ Overfitted!
```

### 4. Monte Carlo Simulation
Randomly shuffle trade sequence to see if order matters:

```
Actual trades: Win, Win, Loss, Win, Loss → +45%
Random shuffle 1: Loss, Win, Win, Loss, Win → +43%
Random shuffle 2: Win, Loss, Win, Win, Loss → +44%
...
Average of shuffles: +46%
```

If actual ≈ average, results are due to strategy, not luck.
If actual >> average, you got lucky (overfitted).

---

## Rules for Safe Backtesting

1. **Use at least 2 years of data** (500+ days)
2. **Require > 50 trades** before trusting results
3. **Test out-of-sample** (don't optimize on same data you test)
4. **Report Sharpe ratio** (not just ROI)
5. **Check max drawdown** (know the worst-case scenario)
6. **Account for costs** (subtract 0.2% per round-trip)
7. **Document assumptions** (position sizing, exit rules, slippage)
8. **Test multiple parameter sets** (is yours truly best, or just lucky?)

---

## From Backtest to Live Trading

### Step 1: Confirm Backtest Quality
✅ Sharpe ratio > 0.8
✅ Win rate > 45%
✅ Max drawdown < 20%
✅ Profit factor > 1.3
✅ \> 50 trades

### Step 2: Paper Trade (Simulated)
- Run strategy for 2-4 weeks with **fake money**
- Check if live metrics match backtest
- Spot execution issues, delays, slippage

### Step 3: Live Trade (Small)
- Start with 5-10% of intended capital
- Use position sizing based on VaR (e.g., 2% risk per trade)
- Monitor daily P&L vs backtest expectations

### Step 4: Monitor & Retrain
- If live performance diverges from backtest after 100+ trades, investigate:
  - Data quality issues?
  - Market regime change?
  - Overfitting?
- Retrain model quarterly with new data

---

## References

- **Pardo, R.** "The Evaluation and Optimization of Trading Strategies" (2008)
- **De Prado, M.L.** "Advances in Financial Machine Learning" (2018)
- **Narang, R.** "Inside the Black Box: A Practical Guide to Algorithmic Trading" (2013)
- Wikipedia: https://en.wikipedia.org/wiki/Backtesting
