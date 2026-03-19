# QuantBot Functional Improvements v2.2

## Delta from V2.1
- V2.1 focused on UI integration for portfolio/backtesting, news summaries, and standardizing technical indicators.
- V2.2 builds on that by deepening the analytical integration between macro, technical, and quantitative layers:
  - **Macro Regime Overlays**: Market-wide macro context (interest rates, sector headwinds) is now automatically injected into both single-ticker trade recommendations and multi-ticker portfolio optimizations.
  - **EDA-Driven Scoring**: Exploratory Data Analysis (EDA) is no longer just a visual tool; it now computes structured quantitative factors (breakouts, volume regimes, volatility clusters, trend strength) that directly impact signal scoring.
  - **Robust Backtesting Data**: Added a fallback mechanism to Yahoo Finance for backtesting when Alpha Vantage data is insufficient or unavailable.
  - **Calibrated Scoring Weights**: Refined signal weights to prevent macro penalties from over-dominating technical signals, ensuring a balanced decision-edge.

## 0) Skills Improved in V2.2

### Improved `backtesting`:
- **Dual-Source Data Pipeline**: Implemented a fallback logic that attempts to fetch historical data from Alpha Vantage first and automatically switches to Yahoo Finance (`yahoo-finance2`) if data is missing.
- **Extended History**: Yahoo Finance fallback provides up to 10 years of daily OHLCV data, significantly reducing "Insufficient historical data" errors.
- **Data Transparency**: Added `dataSource` field to backtest reports to inform users whether the simulation used Alpha Vantage or Yahoo Finance data.

### Improved `eda-visual-analysis`:
- **Display to Decision Upgrade**: Transformed EDA from a "display-only" layer into a "factor-producer" layer.
- **Quantitative Factor Engineering**: Added `computeEdaFactors()` to generate structured signals:
  - `breakoutSignal`: Detects 20-day price breakouts/breakdowns.
  - `volumeRegime`: Identifies high-volume confirmation (volume > 1.3x average).
  - `volatilityRegime`: Calculates 20-day annualized volatility to flag high-risk environments.
  - `trendStrengthSignal`: Measures distance between MA20 and MA50 to quantify trend momentum.
- **Structured Output**: These factors are now attached to `edaInsights` and passed consistently to the trade recommendation engine.

### Improved `trade-recommendation`:
- **Multi-Layer Scoring Integration**: The scoring engine now aggregates three distinct intelligence layers:
  1. **Technical/Sentiment**: Core algorithmic signals.
  2. **Macro Overlay**: Adjusted scores based on global regime (Bullish/Bearish/High-Risk) and sector alignment.
  3. **EDA Overlay**: Small point adjustments (±0.5) based on breakout, volume, and volatility factors.
- **Traceability**: Added an `edaOverlay` field to the recommendation response, showing exactly which EDA factors influenced the final score.
- **Calibrated Weights**: Softened macro penalties (e.g., High Risk penalty reduced from -4 to -2) to maintain sensitivity to strong local technical setups.

### Improved `portfolio-optimization`:
- **Macro-Aware Allocation**: Portfolio construction now scales total exposure based on the `macroRegime`.
  - In `HIGH_RISK` regimes, the total allocation multiplier is reduced (e.g., to 0.90) and sector overlap penalties are applied to ensure diversification.
- **Ticker-Level Macro Buffers**: Individual ticker scores within the portfolio are adjusted by their sector's alignment with the current macro environment.

## 1) Enhanced Backtesting Reliability
- The backtesting engine no longer fails silently when primary data limits are hit.
- The use of `yahoo-finance2` as a robust fallback ensures that users can run multi-year simulations on almost any global ticker without manually changing configuration.

## 2) EDA as a Quantitative Signal
- Previously, EDA was a "black box" for visual inspection. In V2.2, it is a first-class citizen in the decision process.
- Quantitative logic now detects:
  - **Breakouts**: Bullish (+0.5) / Bearish (-0.5).
  - **Volume Confirmation**: High volume on positive price action (+0.5).
  - **Volatility Risk**: High-volatility penalty (-0.5) to protect against whipsaws.
  - **Trend Strength**: Momentum-based adjustments (±0.5).

## 3) Refined Weight Configuration
- Centralized `backend/lib/signal-weights.json` now includes 31 distinct parameters, including the new EDA and calibrated Macro weights.
- `backend/lib/weights-loader.js` ensures these weights are consistently applied across all analysis paths while providing safe defaults.

## 4) Summary of Technical Changes
- **Backend Core**: Added `weights-loader.js` and `signal-weights.json` for centralized parameter management.
- **Skill Evolution**:
  - `backtesting/scripts/index.js`: New data fetching hierarchy.
  - `eda-visual-analysis/scripts/index.js`: New `computeEdaFactors` logic.
  - `trade-recommendation/scripts/index.js`: Triple-layered scoring logic (Technical + Macro + EDA).
- **Commit History**:
  - `7534f89`: Integrated macro overlays into trade and portfolio.
  - `4533582`: Calibrated macro penalties for better balance.
  - `[Current]`: Yahoo Finance fallback and EDA integration.
