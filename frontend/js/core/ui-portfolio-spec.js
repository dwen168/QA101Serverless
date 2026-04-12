function showPortfolioSpec() {
  const existing = document.getElementById('portfolio-modal');
  if (existing) {
    existing.style.visibility = 'visible';
    existing.style.opacity = '1';
    existing.style.zIndex = '9999';
    if (typeof closeInfoMenu === 'function') closeInfoMenu();
    return;
  }

  const modalHtml = `
  <div id="portfolio-modal" class="modal-overlay" style="visibility:visible;opacity:1;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;align-items:center;justify-content:center;backdrop-filter:blur(4px);display:flex">
    <div class="modal-content" style="background:var(--bg);width:92%;max-width:1280px;height:90%;border-radius:12px;border:1px solid var(--border);display:flex;flex-direction:column;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5)">
      <div style="padding:20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <div>
          <h2 style="margin:0;font-size:18px;color:var(--text);font-family:var(--sans)">Portfolio Optimization Specification</h2>
          <div style="margin-top:6px;font-family:var(--mono);font-size:11px;color:var(--text3)">Detailed behaviour and formulas for portfolio ranking and allocation</div>
        </div>
        <button onclick="hidePortfolioSpec()" style="background:none;border:none;color:var(--text2);font-size:24px;cursor:pointer">&times;</button>
      </div>

      <div style="flex:1;overflow:auto;background:var(--bg2);padding:18px">
        <div style="display:flex;flex-direction:column;gap:14px">

          <div style="padding:14px;border:1px solid var(--border);border-radius:12px;background:var(--bg)">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
              <div style="font-family:var(--mono);font-size:11px;color:var(--cyan)">A. OBJECTIVE</div>
              <span style="padding:2px 8px;border-radius:999px;border:1px solid var(--border);font-family:var(--mono);font-size:10px;color:var(--text3)">Maximize risk-adjusted return subject to constraints</span>
            </div>
            <div style="margin-top:10px;font-size:12px;color:var(--text2);line-height:1.65">
              Optimization may use score-derived weights, mean-variance optimization, or heuristic ranking. The UI exposes parameters for targetGrossWeight, maxWeight, iterations, and riskAversion.
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
            <div style="padding:14px;border:1px solid var(--border);border-radius:12px;background:var(--bg)">
              <div style="font-family:var(--mono);font-size:11px;color:var(--green);margin-bottom:8px">B. INPUTS (PER TICKER)</div>
              <ul style="margin:0;padding-left:16px;display:flex;flex-direction:column;gap:8px;font-size:12px;color:var(--text2)">
                <li>compositeScore (from recommendation engine) mapped to 0-100 scale.</li>
                <li>momentum, quality, riskAdjusted sub-scores (0-100) used in composite construction.</li>
                <li>analyst upside %, sentiment score, ATR, and price history for covariance estimation.</li>
                <li>user constraints: maxWeight, targetGrossWeight, sector limits.</li>
              </ul>
            </div>

            <div style="padding:14px;border:1px solid var(--border);border-radius:12px;background:var(--bg)">
              <div style="font-family:var(--mono);font-size:11px;color:var(--amber);margin-bottom:8px">C. ALGORITHMS &amp; FORMULAS</div>
              <div style="font-family:var(--mono);font-size:12px;color:var(--text2);line-height:1.6">
                Expected return estimate (per ticker):<br>
                <div style="margin-top:8px;padding:10px;border-radius:8px;background:rgba(255,255,255,0.03);font-family:var(--mono);font-size:12px;color:var(--text2);line-height:1.6">
                  expectedReturnPct = clamp(scoreComponent + analystComponent + sentimentComponent, -20, 30)<br>
                  where scoreComponent = ((adjustedComposite - 50) / 35) × scoreRange<br>
                  scoreRange = {SHORT:10, MEDIUM:12, LONG:14}<br>
                  analystComponent = upside × 0.35<br>
                  sentimentComponent = sentimentScore × 2
                </div>

                Weight optimization (default): mean-variance gradient-descent with projection to constraints. Pseudocode:
                <ul style="margin:6px 0 0 16px;color:var(--text2)">
                  <li>preferences = max(0.001, expectedReturn + 0.02)</li>
                  <li>initial weights = preferences / sum(preferences) × targetGrossWeight</li>
                  <li>iterate: gradient = expectedReturns - 2 × riskAversion × (Cov × weights); weights += stepSize × gradient; project to [0,maxWeight] and total targetGrossWeight</li>
                </ul>
              </div>
            </div>
          </div>

          <div style="padding:14px;border:1px solid var(--border);border-radius:12px;background:var(--bg)">
            <div style="font-family:var(--mono);font-size:11px;color:var(--cyan);margin-bottom:8px">D. RISK METRICS</div>
            <div style="font-size:12px;color:var(--text2);line-height:1.6">
              Portfolio-level metrics are computed via quadratic form on covariance matrix:
              <div style="margin-top:8px;padding:10px;border-radius:8px;background:rgba(255,255,255,0.03);font-family:var(--mono);font-size:12px;color:var(--text2);line-height:1.6">
                expectedReturn = w · r<br>
                variance = w^T Σ w<br>
                volatility = sqrt(variance)<br>
                sharpe = (expectedReturn - riskFree) / volatility
              </div>

              <div id="portfolio-params" style="margin-top:10px;padding:10px;border-radius:6px;background:rgba(255,255,255,0.02);font-family:var(--mono);font-size:12px;color:var(--text2)">
                Loading optimizer parameters...
              </div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
            <div style="padding:14px;border:1px solid var(--border);border-radius:12px;background:var(--bg)">
              <div style="font-family:var(--mono);font-size:11px;color:var(--cyan);margin-bottom:8px">E. OUTPUTS &amp; JUSTIFICATION</div>
              <div style="font-size:12px;color:var(--text2);line-height:1.6">
                Outputs: weights (fraction), suggested position sizes (shares, dollars), expected portfolio metrics, and per-ticker risk contributions. The UI also generates a short executive summary explaining top drivers.
              </div>
            </div>

            <div style="padding:14px;border:1px solid var(--border);border-radius:12px;background:var(--bg)">
              <div style="font-family:var(--mono);font-size:11px;color:var(--green);margin-bottom:8px">F. LIMITATIONS &amp; NOTES</div>
              <div style="font-size:12px;color:var(--text2);line-height:1.6">
                Covariance estimation uses historical returns from priceHistory and may be unstable for small sample sizes. Risk-parity/mean-variance choices are configurable; default heuristics exist for demo mode.
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

function hidePortfolioSpec() {
  const modal = document.getElementById('portfolio-modal');
  if (!modal) return;
  modal.style.visibility = 'hidden';
  modal.style.opacity = '0';
  modal.style.zIndex = '-1';
}

window.showPortfolioSpec = async function() { showPortfolioSpec(); await injectPortfolioParams(); };
window.hidePortfolioSpec = hidePortfolioSpec;