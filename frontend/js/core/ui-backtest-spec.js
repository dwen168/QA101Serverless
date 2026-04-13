function renderBacktestSpecModal() {
  const existing = document.getElementById('backtest-modal');
  if (existing) {
    existing.style.visibility = 'visible';
    existing.style.opacity = '1';
    existing.style.zIndex = '9999';
    if (typeof closeInfoMenu === 'function') closeInfoMenu();
    return;
  }

  const modalHtml = `
  <div id="backtest-modal" class="modal-overlay" style="visibility:visible;opacity:1;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;align-items:center;justify-content:center;backdrop-filter:blur(4px);display:flex">
    <div class="modal-content" style="background:var(--bg);width:92%;max-width:1280px;height:90%;border-radius:12px;border:1px solid var(--border);display:flex;flex-direction:column;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5)">
      <div style="padding:20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <div>
          <h2 style="margin:0;font-size:18px;color:var(--text);font-family:var(--sans)">Backtesting Algorithm Specification</h2>
          <div style="margin-top:6px;font-family:var(--mono);font-size:11px;color:var(--text3)">Precise behaviour for replaying the recommendation engine in historical tests</div>
        </div>
        <button onclick="hideBacktestSpec()" style="background:none;border:none;color:var(--text2);font-size:24px;cursor:pointer">&times;</button>
      </div>

      <div style="flex:1;overflow:auto;background:var(--bg2);padding:18px">
        <div style="display:flex;flex-direction:column;gap:14px">

          <div style="padding:14px;border:1px solid var(--border);border-radius:12px;background:var(--bg)">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
              <div style="font-family:var(--mono);font-size:11px;color:var(--cyan)">A. SHARED SCORING (IMPLEMENTATION)</div>
              <span style="padding:2px 8px;border-radius:999px;border:1px solid var(--border);font-family:var(--mono);font-size:10px;color:var(--text3)">scoreBacktestSnapshot()</span>
            </div>

            <div style="margin-top:10px;padding:12px;border-radius:10px;background:rgba(255,255,255,0.03);font-family:var(--mono);font-size:13px;color:var(--text2);line-height:1.6">
              The backtest uses a price-only snapshot function:
              <div style="margin-top:8px">score = scoreBacktestSnapshot(priceHistory, currentIndex, horizon)</div>
              Only signals derivable from OHLCV are included. Non-price inputs (sentiment, macro, analyst) are defaulted to neutral so they do not contribute to score.
            </div>

            <div style="margin-top:10px;font-size:12px;color:var(--text2);line-height:1.65">
              Implementation notes:
              <ul style="margin:6px 0 0 16px;color:var(--text2)">
                <li>MA calculations use closing prices: MA50 = mean(close[-50..-1]) if available.</li>
                <li>RSI computed with period 14 using last (period+1) closes (see scoring._rsiFromCloses()).</li>
                <li>Technical indicators are calculated with calculateAllIndicators(history) when history length &gt;= 20; otherwise technical indicators are marked unavailable.</li>
              </ul>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">

            <div style="padding:14px;border:1px solid var(--border);border-radius:12px;background:var(--bg)">
              <div style="font-family:var(--mono);font-size:11px;color:var(--green);margin-bottom:8px">B. EXIT &amp; EXECUTION</div>

              <div style="font-size:12px;color:var(--text2);line-height:1.6">
                Exits use ATR14 when available; fallback to percentage-based exits if warmup insufficient. Multipliers are taken from recommendation profiles (SHORT/MEDIUM/LONG).
              </div>

              <div style="margin-top:10px;padding:10px;border-radius:8px;background:rgba(255,255,255,0.03);font-family:var(--mono);font-size:12px;color:var(--text2);line-height:1.7">
                stopLoss = entry - ATR14 × SLmultiplier(horizon)<br>
                takeProfit = entry + ATR14 × TPmultiplier(horizon)
              </div>

              <div style="margin-top:10px;font-size:12px;color:var(--text2);line-height:1.6">
                ATR multipliers by profile are identical to live recommendations (SHORT: SL=1.2, TP=2.0; MEDIUM: SL=1.5, TP=2.5; LONG: SL=2.0, TP=4.0). Backtest then applies a dynamic TP expansion layer based on volatility ratio and entry-score strength, plus ATR-based trailing stop updates.
              </div>
            </div>

            <div style="padding:14px;border:1px solid var(--border);border-radius:12px;background:var(--bg)">
              <div style="font-family:var(--mono);font-size:11px;color:var(--amber);margin-bottom:8px">C. EXECUTION ASSUMPTIONS</div>

              <ul style="margin:0;padding-left:16px;display:flex;flex-direction:column;gap:8px;font-size:12px;color:var(--text2)">
                  <li>Slippage: not explicitly modelled in current implementation.</li>
                  <li>Position sizing: risk-based single-position model. Risk budget and max notional are horizon-specific (SHORT 0.8% risk / 35% max alloc, MEDIUM 1.0% / 50%, LONG 1.2% / 65%).</li>
                  <li>Order fill model: entries/exits use candle close price; partial fills are not modelled.</li>
                  <li>Trailing stop: enabled after entry using horizon-specific ATR trailing multiplier (SHORT 1.0x, MEDIUM 1.2x, LONG 1.5x).</li>
                  <li>Warmup: strategy-specific warmup bars are required before acting on signals (trade-recommendation uses longer warmup).</li>
              </ul>
            </div>

          </div>

          <div style="padding:14px;border:1px solid var(--border);border-radius:12px;background:var(--bg)">
            <div style="font-family:var(--mono);font-size:11px;color:var(--cyan);margin-bottom:8px">D. SIGNAL-TO-ACTION MAPPING</div>

            <div style="font-size:12px;color:var(--text2);line-height:1.6">
              Backtest maps composite score using the same shared profile thresholds as recommendation (via getActionThresholds):
              <div style="margin-top:8px;padding:10px;border-radius:8px;background:rgba(255,255,255,0.03);font-family:var(--mono);font-size:12px;color:var(--text2);line-height:1.6">
                SHORT/MEDIUM: score &gt;= 7 → STRONG BUY, score &gt;= 4 → BUY, score &lt;= -4 → SELL, score &lt;= -7 → STRONG SELL<br>
                LONG: score &gt;= 8 → STRONG BUY, score &gt;= 5 → BUY, score &lt;= -5 → SELL, score &lt;= -8 → STRONG SELL<br>
                -2 ≤ score ≤ 2 → HOLD<br>
                else → HOLD
              </div>
            </div>

            <div style="margin-top:10px;font-size:12px;color:var(--text2);line-height:1.6">
              Note: thresholds are now unified between recommendation and backtest to reduce behavior drift.
            </div>

            <div id="backtest-weights" style="margin-top:12px;padding:12px;border-radius:8px;background:rgba(255,255,255,0.02);font-family:var(--mono);font-size:12px;color:var(--text2);line-height:1.6">
              Loading weights metadata...
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
            <div style="padding:14px;border:1px solid var(--border);border-radius:12px;background:var(--bg)">
              <div style="font-family:var(--mono);font-size:11px;color:var(--cyan);margin-bottom:8px">E. PERFORMANCE &amp; REPORTING</div>
              <div style="font-size:12px;color:var(--text2);line-height:1.6">
                The backtest output includes:
                <ul style="margin:6px 0 0 16px;color:var(--text2)">
                  <li>Per-trade: entryDate, entryPrice, exitDate, exitPrice, atrAtEntry, stopLossPrice, takeProfitPrice, pnlDollars, pnlPercent, reason.</li>
                  <li>Portfolio-level: equity curve, cumulative return, max drawdown, win rate, avgWin/avgLoss, expectancyPct, expectancyDollars.</li>
                  <li>Diagnostics: score-bucket stats (4-4.9 / 5-5.9 / 6+) and holding-period stats (1-5d / 6-20d / 21d+).</li>
                  <li>Signal engine metadata: mode, coverage, and missing-context categories (portfolio-level metadata).</li>
                </ul>
              </div>
            </div>

            <div style="padding:14px;border:1px solid var(--border);border-radius:12px;background:var(--bg)">
              <div style="font-family:var(--mono);font-size:11px;color:var(--green);margin-bottom:8px">F. LIMITATIONS</div>
              <div style="font-size:12px;color:var(--text2);line-height:1.6">
                Backtests do not reconstruct historical news sentiment, macro headlines, analyst revisions, or release timing. Historical analog scans (RSI+MA50 patterns) are context-only and not a substitute for full inter-temporal reconstruction.
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
  `;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = modalHtml;
  document.body.appendChild(wrapper);
  if (typeof closeInfoMenu === 'function') closeInfoMenu();
}

function hideBacktestSpec() {
  const modal = document.getElementById('backtest-modal');
  if (!modal) return;
  modal.style.visibility = 'hidden';
  modal.style.opacity = '0';
  modal.style.zIndex = '-1';
}

window.showBacktestSpec = async function() {
  renderBacktestSpecModal();
  if (typeof injectBacktestMetadata === 'function') {
    await injectBacktestMetadata();
  }
};
window.hideBacktestSpec = hideBacktestSpec;