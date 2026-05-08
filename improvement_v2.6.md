# Improvement Summary v2.6

This version focuses on enhancing the precision of the quantitative engine, improving data consistency for the Australian market (ASX), and polishing the user experience in the chat interface.

## 1. Quantitative Scoring & Signal Logic
*   **Dynamic RSI Thresholds**: Implemented context-aware RSI logic in `scoring.js`. The system now adjusts overbought/oversold levels based on the long-term trend (MA50/MA200) and momentum (MACD).
    *   *Bullish Regime*: RSI overbought threshold raised to 80 to prevent premature bearish signals in strong uptrends.
    *   *Bearish Regime*: RSI oversold threshold lowered to 20 to avoid "catching a falling knife."
*   **Trend Dampening**: Added logic to reduce the weight of contrarian signals (like RSI divergence) when a stock is in a confirmed high-conviction trend, reducing noise.

## 2. Market Intelligence & ASX Precision
*   **Sector Normalization Layer**: Added a `normalizeSector()` function in `market-data.js` to map inconsistent raw data from Yahoo Finance (e.g., "Basic Materials", "Financial Services") to internal canonical sectors.
*   **Expanded ASX Aliases**: Added Australian-specific industry keywords like `resources`, `gold`, `lithium`, `a-reit`, and `banks` to ensure accurate sector categorization.
*   **Consumer Staples Support**: Fully integrated the Consumer Staples sector for ASX, including a new fallback peer list (WOW, COL, TWE, etc.).
*   **Mock Data Upgrade**: Added the top 10 ASX stocks (BHP, CBA, CSL, etc.) to the mock database to ensure realistic testing scenarios for Australian users.

## 3. Frontend UI/UX Enhancements
*   **Chat State Management**:
    *   Disabled chat input, send button, and quick-action buttons while the LLM or Skill pipeline is running.
    *   Added visual "disabled" states (dimmed opacity, `not-allowed` cursor) to prevent user confusion and race conditions.
*   **Signal Breakdown Redesign**:
    *   Refactored the "Signal Breakdown" component into a **two-column "Tug-of-War" layout**.
    *   **Left Column**: Bullish Factors (sorted by impact).
    *   **Right Column**: Bearish Factors (sorted by impact).
    *   Added subtle color-coded backgrounds (Green/Red) to emphasize the polarity of signals.

## 4. Stability & Core Logic
*   **ID Mapping**: Added `id="send-btn"` to the chat interface for standard DOM access.
*   **Defensive Orchestration**: Added global processing state checks in `ui-orchestration.js` to block duplicate requests even if triggered via keyboard shortcuts.
