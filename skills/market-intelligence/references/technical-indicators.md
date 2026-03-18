# Technical Indicators Reference

## MACD (Moving Average Convergence Divergence)

**Purpose**: Identify trend changes and momentum shifts.

**Calculation**:
- MACD Line = 12-EMA - 26-EMA
- Signal Line = 9-EMA of MACD
- Histogram = MACD - Signal Line

**Interpretation**:
- **BULLISH**: MACD crosses above signal line, histogram turns positive
- **BEARISH**: MACD crosses below signal line, histogram turns negative
- **NEUTRAL**: MACD oscillating around signal line

**Use in Strategy**:
- Entry: MACD bullish crossover + price above MA20
- Exit: MACD bearish crossover or negative divergence

---

## Bollinger Bands (BB)

**Purpose**: Identify overbought/oversold conditions and volatility.

**Calculation**:
- Middle Band = 20-SMA of close
- Upper Band = Middle Band + (2 × std deviation)
- Lower Band = Middle Band - (2 × std deviation)
- BB Position = (Price - Lower Band) / (Upper Band - Lower Band)

**Interpretation**:
- **OVERBOUGHT** (BB Position > 0.8): Price touches upper band, potential pullback
- **OVERSOLD** (BB Position < 0.2): Price touches lower band, potential bounce
- **SQUEEZE** (Bands narrow): Low volatility, breakout imminent
- **EXPANSION** (Bands widen): High volatility, trend strengthening

**Use in Strategy**:
- Mean reversion: Buy at lower band, sell at middle band
- Breakout: Buy when price breaks above upper band with volume
- Volatility: Use band width as risk indicator

---

## KDJ (Stochastic Oscillator)

**Purpose**: Identify overbought/oversold levels in mean-reverting markets.

**Calculation**:
- RSV = (Close - Lowest Low) / (Highest High - Lowest Low) × 100
- %K = 3-SMA of RSV
- %D = 3-SMA of %K
- %J = 3 × %K - 2 × %D

**Interpretation**:
- **%K > 80**: Overbought, sell signal
- **%K < 20**: Oversold, buy signal
- **%K > %D**: Bullish momentum
- **%K < %D**: Bearish momentum
- **Divergence**: Price makes new high but %K doesn't → Bearish

**Use in Strategy**:
- Reversal: Buy when %K bounces from oversold, sell from overbought
- Trend confirmation: Use with trend filter (MA slope)
- Golden Crossover: %K crosses above %D (bullish)

---

## OBV (On-Balance Volume)

**Purpose**: Confirm price trends with volume.

**Calculation**:
```
if Close > Previous Close:
  OBV = Previous OBV + Current Volume
elif Close < Previous Close:
  OBV = Previous OBV - Current Volume
else:
  OBV = Previous OBV (unchanged)
```

**Interpretation**:
- **Rising OBV + Rising Price**: Strong uptrend (volume confirms)
- **Rising OBV + Falling Price**: Bullish divergence (likely reversal soon)
- **Falling OBV + Falling Price**: Strong downtrend (volume confirms)
- **Falling OBV + Rising Price**: Bearish divergence (loss of momentum)

**Use in Strategy**:
- Trend confirmation: Check OBV trend matches price trend
- Divergence trading: Entry when price and OBV diverge
- Breakout confirmation: Volume spike via OBV on breakout

---

## VWAP (Volume Weighted Average Price)

**Purpose**: Identify fair value and intraday trend for institutional traders.

**Calculation**:
```
TP = (High + Low + Close) / 3
VWAP = Σ(TP × Volume) / Σ(Volume)
```

**Interpretation**:
- **Price > VWAP**: Bullish (buyers pushing price above fair value)
- **Price < VWAP**: Bearish (sellers pushing price below fair value)
- **Price bouncing off VWAP**: Support/resistance level
- **VWAP slope**: Trend direction (up = bullish, down = bearish)

**Use in Strategy**:
- Support/resistance: Buy pullbacks at VWAP from above
- Trend filter: Only buy when price > VWAP (uptrend)
- Entry/exit: Use VWAP crossovers as entry/exit signals

---

## Multi-Indicator Confirmation Strategy

**Score each indicator**:
- MACD bullish = +2 points
- BB not overbought = +1 point
- KDJ < 80 = +1 point
- OBV rising = +2 points
- Price > VWAP = +1 point

**Trade decision**:
- Score ≥ 5 = STRONG BUY (high conviction)
- Score 3-4 = BUY (moderate conviction)
- Score 1-2 = HOLD (weak signals)
- Score ≤ 0 = SELL/REDUCE

---

## Backtested Performance Notes

Based on typical S&P 500 stocks:
- **VWAP**: Best for intraday trending (Sharpe ratio 0.7-1.2)
- **MACD**: Effective in trending markets, whipsaws in ranges (Sharpe 0.6-0.9)
- **Bollinger Bands**: Strong mean-reversion edge, drawdown during trends (Sharpe 0.5-0.8)
- **KDJ**: Best in choppy/mean-reverting periods (Sharpe 0.4-0.7)
- **OBV**: Useful as confirming signal, weak standalone (Sharpe 0.3-0.6)

---

## Limitations & Warnings

- All indicators are **lagging** — they react to price, not predict it
- Performance varies dramatically across market regimes (trend, range, volatile, calm)
- Parameter optimization (periods, thresholds) is crucial and regime-dependent
- Indicators should **never be used in isolation** — always combine with price action and macro context
- Whipsaws and false signals are common in choppy markets
