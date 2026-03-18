# QuantBot Functional Improvements v2.0 (Today)

## 0) Skills Added vs Improved
- Added skills (project-level):
  - `market-intelligence`
  - `eda-visual-analysis`
  - `trade-recommendation`
  - `portfolio-optimization`
  - `backtesting` (kept as independent endpoint/skill, not in default pipeline)
- Improved in V2.0 (functional updates in this v2.0 iteration):
  - `market-intelligence`:
    - Added Yahoo Finance path for international tickers.
    - Improved news + sentiment handling and API fallback robustness.
  - `trade-recommendation`:
    - Added richer signal detail output and historical pattern analog context.
  - `eda-visual-analysis`:
    - Kept in the execution sequence; no core logic rewrite today.
  - `portfolio-optimization`:
    - Fixed module path/import issue for stable execution.
  - `backtesting`:
    - Retained as standalone skill API; removed from default chained analysis flow.

## 1) International Market Data Support (Live)
- Added live market data support for international tickers via Yahoo Finance integration.
- System now supports exchange-suffixed symbols such as:
  - `CBA.AX`, `MSB.AX` (ASX)
  - `7203.T` (Tokyo)
  - `HSBA.L` (London)
- Routing behavior:
  - US-style tickers (no suffix) -> Alpha Vantage
  - International/suffixed tickers -> Yahoo Finance

## 2) Real vs Mock Data Transparency in UI
- Added explicit data-source visibility in the frontend:
  - Live banner for Alpha Vantage data
  - Live banner for Yahoo Finance data
  - Warning banner when fallback mock data is used
- Added a persistent data source label in the ticker header:
  - `alpha vantage`
  - `yahoo finance`
  - `mock data`

## 3) Chat Intent Routing Improvements
- Improved ticker extraction in chat fallback routing:
  - Correctly captures international symbols with suffixes (e.g., `MSB.AX`, `CBA.AX`).
  - Also handles ticker-only messages (e.g., `CBA`, `TSLA`) without requiring extra keywords.
- Result: messages that previously returned generic help text now trigger stock analysis pipeline correctly.

## 4) News and Sentiment Pipeline Improvements
- Upgraded news sentiment scoring from keyword-based logic to LLM batch scoring.
- Fixed Finnhub news retrieval to use valid `from/to` date window logic.
- Added null-safe handling for external API news results to prevent runtime crashes.

## 5) Stability and Reliability Fixes
- Fixed portfolio module import path issue causing `MODULE_NOT_FOUND`.
- Addressed server port conflict incidents (`EADDRINUSE`) during local run iterations.
- Preserved fallback behavior so analysis still works when live APIs fail.

## 6) Functional Outcome Snapshot
- `CBA.AX` analysis now runs end-to-end with:
  - live Yahoo Finance source,
  - no mock fallback,
  - real exchange/currency metadata (ASX / AUD),
  - technicals + sentiment + recommendation pipeline intact.

## 7) Version Summary
- This v2.0 update upgrades QuantBot from mostly US-only ticker handling to practical cross-market coverage with clear source traceability in both backend response and UI.
