# Signal Weights Calibration
## Data-Driven Learning for Trade Recommendation Signals

### Overview
The `trade-recommendation` skill now supports **dynamic, learned signal weights** instead of hardcoded experience values.

**Without calibration:** Uses hardcoded defaults (MA50: +2/-2, RSI: +1/-2, etc.)
**With calibration:** Learns optimal weights from 2+ years of historical price data using XGBoost classification.

---

## Why Calibrate?

### The Problem
Original weights are based on intuition:
- Price > MA50 → +2 points (why not +1.5 or +2.5?)
- RSI < 30 → +1 point (is this equally predictive as MA50?)
- MACD bullish → +1 point (how much does this actually predict 5-day returns?)

### The Solution
**Statistical calibration** learns from data:
1. Collect 500+ days of historical OHLCV data for 7-10 stocks
2. Compute all 12 signals for each day
3. Label each day: "Did price rise > 2% in next 5 days?" (1) or not (0)
4. Train XGBoost classifier to predict forward 5-day returns
5. Extract feature importances → these become signal weights
6. Measure model accuracy (Accuracy, F1-score, AUC)

---

## Quick Start

### 1. Install Python Dependencies
```bash
pip install xgboost scikit-learn pandas numpy requests
```

### 2. Set Your API Key
```bash
# Windows PowerShell
$env:ALPHA_VANTAGE_API_KEY = "your_key_here"

# Or edit backend/.env
ALPHA_VANTAGE_API_KEY=your_key_here
```

Get a free API key: https://www.alphavantage.co

### 3. Run Calibration
```bash
cd backend

# Calibrate on 7 popular stocks with 500 days of history
npm run calibrate-weights -- --symbols AAPL,MSFT,GOOGL,NVDA,TSLA,AMD,NFLX --days 500

# Output: lib/signal-weights.json
```

### 4. Verify
Check the generated `backend/lib/signal-weights.json`:
```json
{
  "timestamp": "2026-03-18T...",
  "model_metrics": {
    "accuracy": 0.62,
    "f1_score": 0.61,
    "auc": 0.68
  },
  "signal_weights": {
    "trend_ma50_bullish": 2.15,
    "rsi_oversold": 0.85,
    ...
  }
}
```

### 5. Test the API
```bash
node server.js

# In another terminal:
curl http://localhost:3000/api/skills/trade-recommendation?ticker=AAPL

# Response now includes:
{
  "recommendation": { ... },
  "weightingMetadata": {
    "version": "1.0-calibrated-2026-03-18",
    "calibrated": true,
    "metrics": { "accuracy": 0.62, ... }
  }
}
```

---

## Detailed Workflow

### Step 1: Data Collection
```bash
python backend/scripts/signal-calibration.py \
  --symbols AAPL,MSFT,GOOGL,NVDA,TSLA \
  --days 500
```

For each symbol:
- Fetches 500 daily candles from Alpha Vantage
- Computes: MA20, MA50, MA200, RSI, MACD, BB, KDJ, OBV, VWAP
- Example: AAPL produces ~500 feature rows × 12 signal columns

### Step 2: Label Creation
For each day `t`:
- Compute 5-day forward return: `r_future = (close[t+5] / close[t]) - 1`
- Label: 1 if `r_future > 2%`, else 0

This creates a binary classification task:
- **Positive class (1):** Stock rises ≥ 2% in next 5 days
- **Negative class (0):** Stock flat or down

### Step 3: Model Training
```python
model = xgb.XGBClassifier(
  n_estimators=100,
  max_depth=5,
  learning_rate=0.1,
  subsample=0.8
)
model.fit(X_train, y_train)
```

Training uses 80% of data; validation on 20%.

**Typical results (S&P 500 stocks):**
- Accuracy: 58-65%
- F1-score: 55-62%
- AUC: 0.62-0.72

These are realistic for 5-day prediction without additional features (volatility, sector, macro).

### Step 4: Weight Extraction
Each feature's importance score → normalized to signal weight:
```
norm_weight = (importance / max_importance) × 2
```

Example output:
```
trend_ma50_bullish:    2.34    (very predictive)
macd_bullish:          1.87    (moderately predictive)
rsi_healthy:           0.82    (weakly predictive)
momentum_strong_down: -1.45   (bearish when triggered)
```

---

## Configuration

### Command-Line Options
```bash
python backend/scripts/signal-calibration.py \
  --symbols AAPL,MSFT,GOOGL,NVDA,TSLA     # Stocks to calibrate on
  --days 500                                # Trading days of history
  --output lib/signal-weights.json         # Where to save weights
  --api-key YOUR_KEY_HERE                  # Optional; uses env var if not provided
```

Default: 7 popular tech stocks, 500 days, saves to `lib/signal-weights.json`

### Environment Variables
```
ALPHA_VANTAGE_API_KEY=your_api_key
```

Required for data fetching. Get free tier: https://www.alphavantage.co (25 requests/day)

---

## Output: signal-weights.json

### Structure
```json
{
  "timestamp": "2026-03-18T12:34:56.789Z",
  "version": "1.0-calibrated-aapl-msft-googl",
  "symbols": ["AAPL", "MSFT", "GOOGL", ...],
  "samples": 3415,
  "positive_ratio": 0.48,
  "model_metrics": {
    "accuracy": 0.628,
    "f1_score": 0.612,
    "auc": 0.685
  },
  "signal_weights": {
    "trend_ma50_bullish": { "points": 2.34 },
    "rsi_oversold": { "points": 1.02 },
    ...
  },
  "feature_importance": {
    "price_gt_ma50": 0.187,
    "macd_bullish": 0.145,
    ...
  }
}
```

### Interpretation

| Metric | Meaning |
|--------|---------|
| **accuracy** | % of 5-day predictions correct |
| **f1_score** | Harmonic mean of precision/recall |
| **auc** | Area under ROC curve; 0.5 = random, 1.0 = perfect |
| **signal_weights** | Updated weight for each signal (in points) |

**Quality thresholds:**
- AUC > 0.70: Strong predictive signal
- AUC 0.60-0.70: Moderate predictive power
- AUC < 0.55: Weak (may need more data or features)

---

## Advanced Usage

### Multi-Sector Calibration
Calibrate separate weight sets by sector (Tech vs Finance vs Healthcare):

```bash
# Tech sector
npm run calibrate-weights -- --symbols AAPL,MSFT,GOOGL,NVDA,NFLX --output lib/weights/tech.json

# Finance sector
npm run calibrate-weights -- --symbols JPM,BAC,WFC,GS,BLK --output lib/weights/finance.json
```

Then modify `weights-loader.js` to select sector-specific weights:
```javascript
function getSignalWeight(signalKey, sector = 'tech') {
  const weights = loadWeights(sector);
  return weights.signal_weights?.[signalKey]?.points || 0;
}
```

### In-Sample vs Out-of-Sample Validation
Current script uses 80/20 train/test split. For production:
1. Train on 2020-2024 data
2. Validate on 2025 data (unseen)
3. If metrics degrade, refresh calibration yearly

### Live Retraining
Create a scheduled job (cron/Lambda):
```bash
# Every month: retrain on latest 500 days
0 0 1 * * cd /app/backend && npm run calibrate-weights -- --days 500
```

---

## Troubleshooting

### Error: "No valid data collected"
**Cause:** API rate limit or invalid API key
**Solution:** 
- Check `ALPHA_VANTAGE_API_KEY` is set
- Wait 60 seconds between requests (free tier: 25/day)
- Try fewer symbols: `--symbols AAPL,MSFT`

### Error: "ModuleNotFoundError: No module named 'xgboost'"
**Solution:**
```bash
pip install xgboost scikit-learn pandas numpy requests
```

### Weights haven't changed from defaults
**Cause:** Calibration successful but features have low predictive power
**Solution:**
- Add more data: `--days 1000` instead of 500
- Try different symbols (current ones may have idiosyncratic patterns)
- Improve features: add volatility, sector strength, or macro indicators

### API calls are too slow
**Cause:** Alpha Vantage enforces rate limits
**Solution:**
```bash
# Add delay between requests
python backend/scripts/signal-calibration.py --symbols AAPL,MSFT --days 100  # Smaller dataset
```

---

## Architecture: How Weights Flow Through the System

```
┌─────────────────────────────────────────────┐
│  backend/lib/signal-weights.json            │
│  (calibrated weights from XGBoost)          │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  backend/lib/weights-loader.js              │
│  - loadWeights()                            │
│  - getSignalWeight(key)                     │
│  - getAllWeights()                          │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  skills/trade-recommendation/scripts/       │
│  index.js: scoreSignals()                   │
│                                             │
│  const w = (key) =>                         │
│    getSignalWeight(key);                    │
│                                             │
│  if (price > ma50)                          │
│    add('Price > MA50',                      │
│      w('trend_ma50_bullish'), ...)          │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  { signals, score, buyRatio }               │
│  - Each signal now uses learned weight      │
│  - Total score reflects calibration         │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  /api/skills/trade-recommendation          │
│  Response includes:                         │
│  - recommendation: { signals, action, ... } │
│  - weightingMetadata: { version,            │
│      metrics, calibrated }                  │
└─────────────────────────────────────────────┘
```

---

## Next Steps

### Short Term (1-2 weeks)
- [ ] Run calibration on your historical data (2+ years)
- [ ] Review model metrics (Accuracy, F1, AUC)
- [ ] Compare new weights vs hardcoded baseline
- [ ] A/B test on live trade recommendations

### Medium Term (1-3 months)
- [ ] Create sector-specific weight sets
- [ ] Add volatility, breadth, and macro features to improve AUC > 0.70
- [ ] Implement monthly retraining pipeline
- [ ] Backtest against historical S&P 500 (Sharpe ratio, max drawdown)

### Long Term (3-6 months)
- [ ] Deploy production weight recalibration (automated nightly)
- [ ] Add regime detection (bull/bear) for conditional weights
- [ ] Integrate FinBERT sentiment for better feature engineering
- [ ] Optimize for different time horizons (1-day, 5-day, 10-day returns)

---

## References

- **XGBoost Docs:** https://xgboost.readthedocs.io/
- **Feature Importance:** https://christophm.github.io/interpretable-ml-book/feature-importance.html
- **Binary Classification Metrics:** https://en.wikipedia.org/wiki/Confusion_matrix

---

## Questions?

If your weights don't improve after calibration, consider:
1. Is the feature engineering correct? (Check `compute_technical_indicators()`)
2. Is the target variable well-defined? (5-day forward return > 2%)
3. Do you have enough data? (≥1000 samples recommended for XGBoost)
4. Are your stocks correlated? (Try diverse sectors: Tech, Finance, Healthcare)
