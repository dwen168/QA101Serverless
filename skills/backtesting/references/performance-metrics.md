# Performance Metrics Reference
## Detailed Formulas and Interpretations

### Metric Summary Table

| Metric | Formula | Range | Unit | Interpretation |
|--------|---------|-------|------|-----------------|
| **Total Return** | (Final - Initial) / Initial × 100 | Unbounded | % | Overall profitability |
| **Win Rate** | Winning trades / Total trades × 100 | 0-100 | % | % of profitable trades |
| **Profit Factor** | Sum(wins) / \|Sum(losses)\| | 0-∞ | Ratio | Reward per unit of risk |
| **Sharpe Ratio** | (Avg Return - RFR) / StdDev × √252 | -∞ to +∞ | Ratio | Risk-adjusted return |
| **Max Drawdown** | (Peak - Trough) / Peak × 100 | 0-100 | % | Worst decline from peak |
| **CAGR** | (Final / Initial)^(1/years) - 1 | -∞ to +∞ | % | Annualized return |
| **Sortino Ratio** | (Avg Return - RFR) / Downside StdDev × √252 | -∞ to +∞ | % | Risk-adjusted return (downside only) |

---

## Detailed Metric Descriptions

### 1. Total Return %

**Formula:**
```
Total Return = (Final Capital - Initial Capital) / Initial Capital × 100
```

**Example:**
```
Initial: $100,000
Final: $145,000
Total Return = ($145,000 - $100,000) / $100,000 × 100 = 45%
```

**Interpretation:**
- Positive = Profitable
- Larger = Better
- Only metric that matters in absolute terms

**Weakness:** Doesn't account for time or risk. A 50% return in 1 year is better than 50% in 5 years.

---

### 2. Win Rate %

**Formula:**
```
Win Rate = (# Profitable Trades / # Total Trades) × 100
```

**Example:**
```
Trades: [+$1000, -$500, +$800, -$200, +$1500]
Profitable trades: 3
Total trades: 5
Win Rate = 3 / 5 × 100 = 60%
```

**Threshold Matrix:**

| Win Rate | Verdict | Notes |
|----------|---------|-------|
| > 65% | Excellent | Consistently profitable trades |
| 55-65% | Good | Better than random (50%) |
| 45-55% | Acceptable | Profitable if profit factor > 1.5 |
| 35-45% | Risky | Requires very large wins |
| < 35% | Dangerous | Rarely sustainable |

**Key insight:** Even 40% win rate can be profitable if average win >> average loss.

---

### 3. Profit Factor

**Formula:**
```
Profit Factor = Sum of All Winning Trades / |Sum of All Losing Trades|
```

**Example:**
```
Wins: [+$1000, +$800, +$1500] → Total: $3,300
Losses: [-$500, -$200] → Total: -$700 (absolute: $700)
Profit Factor = $3,300 / $700 = 4.7
```

**Threshold Matrix:**

| Profit Factor | Verdict |
|---------------|---------|
| > 3.0 | Exceptional (earn $3 per $1 lost) |
| 2.0-3.0 | Excellent (earn $2 per $1 lost) |
| 1.5-2.0 | Good (earn $1.50 per $1 lost) |
| 1.0-1.5 | Acceptable (marginally profitable) |
| < 1.0 | Unprofitable (losing money) |

**Formula variant (using % returns):**
```
Sum of % wins: 5% + 3% + 2% = 10%
Sum of % losses: -1.5% + -2.5% = -4%
Profit Factor = 10 / 4 = 2.5
```

---

### 4. Sharpe Ratio

**Formula:**
```
Sharpe Ratio = (Mean Return - Risk Free Rate) / Standard Deviation of Returns × √252
```

**Where:**
- **Mean Return** = average daily/monthly return
- **Risk Free Rate** = 0.03% daily (≈ 7.5% annual US Treasury)
- **StdDev** = volatility of returns
- **√252** = annualization factor (252 trading days/year)

**Example (Monthly Returns):**
```
Returns: [+2%, +1.5%, -0.5%, +3%, +1.2%]
Mean = (2 + 1.5 - 0.5 + 3 + 1.2) / 5 = 1.44%
StdDev = sqrt(average of squared deviations) = 1.3%
Risk-Free Rate = 0.25% (monthly)

Sharpe = (1.44% - 0.25%) / 1.3% × √12 = 3.0
```

**Threshold Matrix:**

| Sharpe Ratio | Verdict | Comparable To |
|--------------|---------|---------|
| > 2.0 | Exceptional | Renaissance Technologies |
| 1.5-2.0 | Excellent | Top hedge funds |
| 1.0-1.5 | Very Good | Professional traders |
| 0.5-1.0 | Good | Index fund + alpha |
| 0-0.5 | Weak | Barely beating risk-free rate |
| < 0 | Negative | Underperforming cash |

**Key insight:** Penalizes both losses AND volatility. A strategy with 20% gains but 50% volatility has lower Sharpe than 15% gains with 5% volatility.

---

### 5. Max Drawdown %

**Formula:**
```
Max Drawdown = (Peak Portfolio Value - Lowest Value) / Peak Portfolio Value × 100
```

**Example:**
```
Equity curve: [$100k → $120k → $110k → $85k → $105k]
Peak: $120k (before trough)
Lowest: $85k
Max DD = ($120k - $85k) / $120k × 100 = 29.2%
```

**Timeline:**
- **Drawdown Start:** When equity curve peaks
- **Drawdown Bottom:** When loss is largest
- **Recovery:** When equity returns to peak

**Threshold Matrix:**

| Max Drawdown | Risk Profile |
|--------------|--------------|
| 0-5% | Ultra-conservative |
| 5-10% | Conservative |
| 10-20% | Moderate |
| 20-30% | Aggressive |
| > 30% | Very High Risk |

**Psychological aspect:** A 50% drawdown requires a **100% gain** to recover!

```
$100k → 50% loss → $50k
$50k → 100% gain → $100k ❌ (back to breakeven)
```

---

### 6. CAGR (Compound Annual Growth Rate)

**Formula:**
```
CAGR = (Final Capital / Initial Capital)^(1 / Years) - 1
```

**Example:**
```
Initial: $100,000 (Jan 1, 2023)
Final: $165,000 (Dec 31, 2025)
Years: 3
CAGR = ($165,000 / $100,000)^(1/3) - 1 = 18.1%
```

**Benchmark Comparisons:**
```
S&P 500 (historical avg): 10% CAGR
Nasdaq (tech-heavy): 12% CAGR
QQQ ETF (top 100 growth): 15% CAGR
Professional hedge fund: 15-20% CAGR
Exceptional quant strategy: > 20% CAGR
```

**Key insight:** Normalizes returns for time period. Better than total return for comparing different time horizons.

---

### 7. Sortino Ratio (Advanced)

**Formula:**
```
Sortino Ratio = (Mean Return - Risk Free Rate) / Downside Deviation × √252
```

**Difference from Sharpe:**
- Sharpe penalizes **all** volatility
- Sortino penalizes **only downside** volatility (losses)

**Example:**
```
Strategy A: +2%, +2%, +2%, -2%, -2%, -2%  (Sharpe: 0.6, Sortino: 1.2)
Strategy B: +1%, +1%, +1%, +1%, -5%, +1%  (Sharpe: 0.4, Sortino: 0.8)

Both have same mean (0.67%), but different downside patterns.
```

**When to use:** Sortino is better for evaluating skewed strategies (those with occasional large losses).

---

## Comparison Matrix: What Each Metric Reveals

| Metric | Reveals | Hides |
|--------|---------|-------|
| **Total Return** | Overall profitability | How risky the path was |
| **Win Rate** | Trade hit ratio | Size of wins vs losses |
| **Profit Factor** | Win/loss size ratio | Frequency of trades |
| **Sharpe Ratio** | Return per unit of risk | Direction of skewness |
| **Max Drawdown** | Worst-case scenario | How often drawdowns occur |
| **CAGR** | Annualized growth | Volatility of growth |

**Lesson:** Never use just one metric. Use all together for complete picture.

---

## Real-World Example: Three Strategies

### Strategy A: Stable, Slow Grower
```
Total Return: +24% (2 years)
Win Rate: 65%
Profit Factor: 2.1
Sharpe Ratio: 1.2
Max Drawdown: -8%
CAGR: 11.4%
Trades: 120

→ Conservative but reliable. Good for risk-averse traders.
```

### Strategy B: High Volatility, High Reward
```
Total Return: +72% (2 years)
Win Rate: 48%
Profit Factor: 1.8
Sharpe Ratio: 0.9
Max Drawdown: -26%
CAGR: 32%
Trades: 45

→ Volatile but profitable. For experienced traders only.
```

### Strategy C: Low Win Rate, Directional
```
Total Return: +36% (2 years)
Win Rate: 35%
Profit Factor: 2.8 (few large wins, many small losses)
Sharpe Ratio: 1.1
Max Drawdown: -15%
CAGR: 16.8%
Trades: 200

→ Contrarian style. Works when markets trend, struggles in ranges.
```

---

## Quick Decision Guide

**Use Total Return when:** Comparing final outcomes between strategies.
**Use Win Rate when:** Assessing consistency and trade quality.
**Use Profit Factor when:** Evaluating reward-to-risk balance.
**Use Sharpe Ratio when:** Comparing risk-adjusted performance across different risk levels.
**Use Max Drawdown when:** Assessing psychological tolerance and capital requirements.
**Use CAGR when:** Comparing returns over different time periods.

---

## Pitfall: Misuse of Metrics

### ❌ Wrong: Optimizing Only for Total Return
```
Strategy A: 50% return, 60% drawdown
Strategy B: 45% return, 8% drawdown

A > B on total return, but B is far superior!
```

### ❌ Wrong: Ignoring Profit Factor
```
Win rate: 45% looks bad, but...
Avg win: $10,000
Avg loss: $1,000
→ Profit factor = 4.5 (excellent!)
Profitable despite low win rate.
```

### ❌ Wrong: Focusing Only on Sharpe
```
Sharpe: 2.0 (excellent), but...
Max drawdown: 45%
→ Can you survive 45% decline psychologically?
```

---

## References

- **Sharpe, W.** "The Sharpe Ratio" (1994)
- **Sortino, F.** "The Sortino Framework for Constructing Portfolios" (2010)
- **Pardo, R.** "The Evaluation and Optimization of Trading Strategies" (2008)
- Investopedia: Sharpe Ratio, Sortino Ratio, Drawdown
