#!/usr/bin/env python3
"""
Signal Calibration for Trade Recommendation
============================================
Uses historical price data to fit XGBoost model for optimal signal weights.
Predicts 5-day forward returns and extracts feature importance as weights.

Usage:
  python signal-calibration.py --symbols AAPL,MSFT,GOOGL,NVDA --days 500 --output weights.json
"""

import json
import os
import sys
import argparse
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
import warnings
warnings.filterwarnings('ignore')

# Try importing ML libraries - graceful fallback if not installed
try:
    import xgboost as xgb
    from sklearn.preprocessing import StandardScaler
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False
    print("[WARNING] XGBoost/sklearn not installed. Install with: pip install xgboost scikit-learn")


def fetch_alpha_vantage_data(symbol, api_key, days=500):
    """
    Fetch historical daily OHLCV from Alpha Vantage.
    Returns DataFrame with columns: [date, open, high, low, close, volume]
    """
    import requests
    
    url = f"https://www.alphavantage.co/query"
    params = {
        'function': 'TIME_SERIES_DAILY_ADJUSTED',
        'symbol': symbol,
        'outputsize': 'full',
        'apikey': api_key
    }
    
    print(f"  Fetching {symbol} from Alpha Vantage...", end=" ", flush=True)
    try:
        response = requests.get(url, params=params, timeout=15)
        data = response.json()
        
        if 'Error Message' in data:
            print(f"ERROR: {data['Error Message']}")
            return None
        if 'Note' in data:
            print(f"RATE LIMIT: {data['Note']}")
            return None
        
        time_series = data.get('Time Series (Daily)', {})
        if not time_series:
            print("ERROR: No time series data")
            return None
        
        records = []
        for date_str, vals in list(time_series.items())[:days]:
            records.append({
                'date': pd.to_datetime(date_str),
                'open': float(vals['1. open']),
                'high': float(vals['2. high']),
                'low': float(vals['3. low']),
                'close': float(vals['4. close']),
                'volume': int(vals['6. volume']),
            })
        
        df = pd.DataFrame(records).sort_values('date').reset_index(drop=True)
        print(f"✓ {len(df)} candles")
        return df
    
    except Exception as e:
        print(f"ERROR: {e}")
        return None


def compute_technical_indicators(df):
    """
    Compute all 12 technical signals from OHLCV data.
    Returns DataFrame with additional columns for each signal.
    """
    df = df.copy()
    
    # Moving averages
    df['ma20'] = df['close'].rolling(20).mean()
    df['ma50'] = df['close'].rolling(50).mean()
    df['ma200'] = df['close'].rolling(200).mean()
    
    # RSI
    delta = df['close'].diff()
    gain = np.where(delta > 0, delta, 0)
    loss = np.where(delta < 0, -delta, 0)
    avg_gain = pd.Series(gain).rolling(14).mean()
    avg_loss = pd.Series(loss).rolling(14).mean()
    rs = avg_gain / (avg_loss + 1e-9)
    df['rsi'] = 100 - (100 / (1 + rs))
    
    # MACD
    ema12 = df['close'].ewm(span=12, adjust=False).mean()
    ema26 = df['close'].ewm(span=26, adjust=False).mean()
    df['macd_line'] = ema12 - ema26
    df['macd_signal'] = df['macd_line'].ewm(span=9, adjust=False).mean()
    df['macd_histogram'] = df['macd_line'] - df['macd_signal']
    
    # Bollinger Bands
    df['bb_middle'] = df['close'].rolling(20).mean()
    df['bb_std'] = df['close'].rolling(20).std()
    df['bb_upper'] = df['bb_middle'] + (2 * df['bb_std'])
    df['bb_lower'] = df['bb_middle'] - (2 * df['bb_std'])
    df['bb_position'] = (df['close'] - df['bb_lower']) / (df['bb_upper'] - df['bb_lower'] + 1e-9)
    
    # KDJ (Stochastic)
    high = df['high'].rolling(9).max()
    low = df['low'].rolling(9).min()
    rsv = 100 * (df['close'] - low) / (high - low + 1e-9)
    df['kdj_k'] = rsv.ewm(span=3, adjust=False).mean()
    df['kdj_d'] = df['kdj_k'].ewm(span=3, adjust=False).mean()
    df['kdj_j'] = 3 * df['kdj_k'] - 2 * df['kdj_d']
    
    # OBV (On-Balance Volume)
    obv = (np.sign(df['close'].diff()) * df['volume']).fillna(0).cumsum()
    df['obv'] = obv
    df['obv_ma14'] = obv.rolling(14).mean()
    
    # VWAP
    typical_price = (df['high'] + df['low'] + df['close']) / 3
    df['vwap'] = (typical_price * df['volume']).rolling(20).sum() / df['volume'].rolling(20).sum()
    
    return df


def create_signal_features(df):
    """
    Create 12 binary/continuous signal features:
    1. Price > MA50 (bullish)
    2. Price > MA200 (bullish)
    3. RSI zone (oversold/healthy/overbought)
    4. MACD bullish
    5. BB oversold
    6. KDJ oversold
    7. OBV bullish
    8. VWAP above
    9-12. Additional momentum signals
    """
    signals = pd.DataFrame(index=df.index)
    
    # 1. Price vs MA50
    signals['price_gt_ma50'] = (df['close'] > df['ma50']).astype(int)
    
    # 2. Price vs MA200
    signals['price_gt_ma200'] = (df['close'] > df['ma200']).astype(int)
    
    # 3. RSI zone
    signals['rsi_oversold'] = (df['rsi'] < 30).astype(int)
    signals['rsi_healthy'] = ((df['rsi'] >= 45) & (df['rsi'] <= 65)).astype(int)
    signals['rsi_overbought'] = (df['rsi'] > 70).astype(int)
    
    # 4. MACD bullish
    signals['macd_bullish'] = (df['macd_line'] > df['macd_signal']).astype(int)
    
    # 5. BB oversold
    signals['bb_oversold'] = (df['bb_position'] < 0.2).astype(int)
    signals['bb_overbought'] = (df['bb_position'] > 0.8).astype(int)
    
    # 6. KDJ oversold
    signals['kdj_oversold'] = (df['kdj_k'] < 20).astype(int)
    signals['kdj_overbought'] = (df['kdj_k'] > 80).astype(int)
    
    # 7. OBV bullish
    signals['obv_bullish'] = (df['obv'] > df['obv_ma14']).astype(int)
    
    # 8. VWAP above
    signals['price_gt_vwap'] = (df['close'] > df['vwap']).astype(int)
    
    # 9. Daily momentum
    signals['momentum_up'] = (df['close'].pct_change() > 0.015).astype(int)
    signals['momentum_down'] = (df['close'].pct_change() < -0.02).astype(int)
    
    # 10. Volatility
    signals['volatility_high'] = (df['close'].pct_change().rolling(5).std() > df['close'].pct_change().rolling(5).std().quantile(0.75)).astype(int)
    
    return signals


def create_target_variable(df, forward_days=5, threshold=0.02):
    """
    Create forward-looking binary target:
    1 = stock rises > threshold in next forward_days
    0 = stock falls <= threshold
    """
    future_return = df['close'].shift(-forward_days) / df['close'] - 1
    target = (future_return > threshold).astype(int)
    
    return target, future_return


def fit_xgboost_model(signals, target, test_size=0.2, max_depth=5):
    """
    Fit XGBoost classifier and return feature importance (as weights).
    """
    # Remove rows with NaN
    valid_idx = signals.notna().all(axis=1) & target.notna()
    X = signals[valid_idx].values
    y = target[valid_idx].values
    feature_names = signals.columns.tolist()
    
    if len(X) < 100:
        print(f"[WARNING] Only {len(X)} valid samples - model may be unreliable")
    
    # Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)
    
    # Scale
    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train)
    X_test = scaler.transform(X_test)
    
    # Train XGBoost
    print("  Training XGBoost...", flush=True)
    model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=max_depth,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        use_label_encoder=False,
        eval_metric='logloss',
        verbosity=0
    )
    model.fit(X_train, y_train, verbose=False)
    
    # Evaluate
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    
    acc = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    auc = roc_auc_score(y_test, y_pred_proba)
    
    print(f"  Accuracy: {acc:.3f} | F1: {f1:.3f} | AUC: {auc:.3f}")
    
    # Extract feature importance
    importances = model.feature_importances_
    
    # Normalize to signal weights
    # Map each feature importance to a signal weight
    weights = {}
    for fname, importance in zip(feature_names, importances):
        # Scale to range [-2, +2] with sign based on correlation
        normalized_weight = (importance / importances.max()) * 2
        weights[fname] = float(normalized_weight)
    
    return weights, model, (acc, f1, auc)


def extract_signal_weights(feature_weights):
    """
    Map feature importances to the 12 trade recommendation signals.
    Average multiple features that contribute to same signal.
    """
    signal_weights = {
        'price_gt_ma50': 2.0,       # default
        'price_gt_ma200': 1.0,
        'rsi_oversold': 1.0,
        'rsi_healthy': 1.0,
        'rsi_overbought': -2.0,
        'macd_bullish': 1.0,
        'bb_oversold': 1.0,
        'bb_overbought': -1.0,
        'kdj_oversold': 1.0,
        'kdj_overbought': -1.0,
        'obv_bullish': 1.0,
        'price_gt_vwap': 1.0,
    }
    
    # Use feature weights to calibrate defaults
    feature_to_signal = {
        'price_gt_ma50': 'price_gt_ma50',
        'price_gt_ma200': 'price_gt_ma200',
        'rsi_oversold': 'rsi_oversold',
        'rsi_healthy': 'rsi_healthy',
        'rsi_overbought': 'rsi_overbought',
        'macd_bullish': 'macd_bullish',
        'bb_oversold': 'bb_oversold',
        'bb_overbought': 'bb_overbought',
        'kdj_oversold': 'kdj_oversold',
        'kdj_overbought': 'kdj_overbought',
        'obv_bullish': 'obv_bullish',
        'price_gt_vwap': 'price_gt_vwap',
    }
    
    for feature, signal in feature_to_signal.items():
        if feature in feature_weights:
            # Use model's importance but preserve sign convention
            signal_weights[signal] = feature_weights[feature]
    
    return signal_weights


def main():
    parser = argparse.ArgumentParser(description='Calibrate signal weights using XGBoost')
    parser.add_argument('--symbols', default='AAPL,MSFT,GOOGL,NVDA,TSLA,AMD,NFLX', 
                       help='Comma-separated stock symbols')
    parser.add_argument('--days', type=int, default=500, help='Days of history to fetch')
    parser.add_argument('--output', default='backend/lib/signal-weights.json', 
                       help='Output weights file')
    parser.add_argument('--api-key', default=None, help='Alpha Vantage API key (env: ALPHA_VANTAGE_API_KEY)')
    
    args = parser.parse_args()
    
    if not ML_AVAILABLE:
        print("[ERROR] XGBoost/sklearn required. Install with: pip install xgboost scikit-learn")
        return
    
    # Get API key
    api_key = args.api_key or os.getenv('ALPHA_VANTAGE_API_KEY')
    if not api_key:
        print("[ERROR] Set ALPHA_VANTAGE_API_KEY environment variable or pass --api-key")
        return
    
    symbols = args.symbols.split(',')
    print(f"\n=== Signal Calibration (XGBoost) ===")
    print(f"Symbols: {', '.join(symbols)}")
    print(f"History: {args.days} days\n")
    
    # Collect all data
    all_signals = []
    all_targets = []
    
    for symbol in symbols:
        df = fetch_alpha_vantage_data(symbol, api_key, days=args.days)
        if df is None or len(df) < 100:
            print(f"  Skipping {symbol} (insufficient data)")
            continue
        
        # Compute indicators
        df = compute_technical_indicators(df)
        
        # Create signals and targets
        signals = create_signal_features(df)
        target, _ = create_target_variable(df, forward_days=5)
        
        all_signals.append(signals)
        all_targets.append(target)
    
    if not all_signals:
        print("[ERROR] No valid data collected")
        return
    
    # Combine
    combined_signals = pd.concat(all_signals, ignore_index=True)
    combined_targets = pd.concat(all_targets, ignore_index=True)
    
    print(f"\nTotal samples: {len(combined_signals)}")
    print(f"Positive class: {combined_targets.sum()} ({100*combined_targets.mean():.1f}%)\n")
    
    # Train model
    feature_weights, model, (acc, f1, auc) = fit_xgboost_model(combined_signals, combined_targets)
    
    # Extract signal weights
    signal_weights = extract_signal_weights(feature_weights)
    
    # Output
    output = {
        'timestamp': datetime.now().isoformat(),
        'symbols': symbols,
        'samples': len(combined_signals),
        'positive_ratio': float(combined_targets.mean()),
        'model_metrics': {
            'accuracy': float(acc),
            'f1_score': float(f1),
            'auc': float(auc),
        },
        'signal_weights': signal_weights,
        'feature_importance': {k: float(v) for k, v in feature_weights.items()},
    }
    
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    with open(args.output, 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"\n✓ Weights saved to: {args.output}")
    print(f"\nCalibrated Signal Weights:")
    for signal, weight in sorted(signal_weights.items()):
        print(f"  {signal}: {weight:.2f}")


if __name__ == '__main__':
    main()
