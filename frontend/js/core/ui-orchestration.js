// Frontend UI request orchestration and pipeline triggering.
function setPillState(n, state) {
  const pill = document.getElementById(`pill-${n}`);
  pill.className = `skill-pill ${state}`;
}
function resetPills() {
  [1,2,3,4].forEach(n => setPillState(n, ''));
}

async function sendMessage() {
  if (getProcessingStatus()) return;
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  addMessage('user', text);
  chatHistory.push({ role: 'user', content: text });
  await processMessage(text);
}

async function quickAnalyze(ticker) {
  if (getProcessingStatus()) return;
  const text = `Analyze ${ticker}`;
  addMessage('user', text);
  chatHistory.push({ role: 'user', content: text });
  await processMessage(text);
}

async function quickPortfolio(tickers) {
  if (getProcessingStatus()) return;
  const text = `Optimize portfolio ${tickers.join(', ')}`;
  addMessage('user', text);
  chatHistory.push({ role: 'user', content: text });
  await processMessage(text);
}

async function quickBacktest(ticker) {
  if (getProcessingStatus()) return;
  const text = `Backtest ${ticker} from 2025-01-01 to 2026-03-18`;
  addMessage('user', text);
  chatHistory.push({ role: 'user', content: text });
  await processMessage(text);
}

async function processMessage(text) {
  const loadEl = addLoadingMsg('Thinking...');
  resetPills();
  beginRequestSession();

  try {
    const res = await apiFetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: getLlmHeaders(),
      body: JSON.stringify({ message: text, history: chatHistory.slice(-6) }),
    });
    const data = await readApiJson(res);
    removeLoadingMsg();

    if (data.action === 'ANALYZE_STOCK' && data.ticker) {
      addMessage('bot', data.message || `Running analysis on ${data.ticker}...`);
      chatHistory.push({ role: 'assistant', content: data.message });
      if (document.body.classList.contains('is-mobile')) setMobileTab('analysis');
      await runSkillPipeline(data.ticker, data.timeHorizon || 'MEDIUM');
    } else if (data.action === 'RUN_BACKTEST' && data.ticker) {
      addMessage('bot', data.message || `Running backtest on ${data.ticker}...`);
      chatHistory.push({ role: 'assistant', content: data.message || 'Running backtest...' });
      if (document.body.classList.contains('is-mobile')) setMobileTab('analysis');
      await runBacktestPipeline(data.ticker, data.startDate, data.endDate, data.strategyName || 'trade-recommendation', data.timeHorizon || 'MEDIUM');
    } else if (data.action === 'OPTIMIZE_PORTFOLIO') {
      const tickers = Array.isArray(data.tickers) ? data.tickers : [];
      if (tickers.length >= 2) {
        addMessage('bot', data.message || `Running portfolio optimization on ${tickers.join(', ')}...`);
        chatHistory.push({ role: 'assistant', content: data.message || 'Running portfolio optimization...' });
        if (document.body.classList.contains('is-mobile')) setMobileTab('analysis');
        await runPortfolioPipeline(tickers, data.timeHorizon || 'MEDIUM');
      } else {
        addMessage('bot', data.message || 'Please provide at least 2 tickers, e.g. "Optimize portfolio AAPL, MSFT, NVDA".');
        chatHistory.push({ role: 'assistant', content: data.message || 'Please provide at least 2 tickers.' });
      }
    } else {
      addMessage('bot', data.message || 'How can I help?');
      chatHistory.push({ role: 'assistant', content: data.message });
    }
  } catch (err) {
    if (isAbortError(err)) {
      return;
    }
    removeLoadingMsg();
    const detail = String(err?.message || '').trim();
    addMessage('bot', detail || 'Request failed. Please retry in a moment.');
  } finally {
    endRequestSession();
  }
}

async function runSkillPipeline(ticker, timeHorizon = 'MEDIUM') {
  const pipelineStartedAt = performance.now();
  // Clear previous analysis
  const panel = document.getElementById('analysis-panel');
  panel.innerHTML = '';
  destroyCharts();

  // ── SKILL 1 ──
  setPillState(1, 'active');
  const l1 = addLoadingMsg('⟳ Running market-intelligence skill...');

  let marketData, llmAnalysis, dataSource, usedFallback, fallbackReason;
  try {
    const skillStartedAt = performance.now();
    const r1 = await apiFetch(`${API_BASE}/skills/market-intelligence`, {
      method: 'POST', headers: getLlmHeaders(),
      body: JSON.stringify({ ticker }),
    });
    const d1 = await readApiJson(r1);
    marketData = d1.marketData;
    llmAnalysis = d1.llmAnalysis;
    dataSource = d1.dataSource || d1.marketData.dataSource || 'unknown';
    usedFallback = d1.usedFallback || false;
    fallbackReason = d1.fallbackReason;
    setPillState(1, 'done');
    removeLoadingMsg();
    addMessage('bot', `✓ Market intelligence collected for ${ticker} (${formatDurationMs(performance.now() - skillStartedAt)})`, { cls: 's1', label: '① market-intelligence' });
    renderMarketIntelligence(marketData, llmAnalysis, panel, dataSource, usedFallback, fallbackReason);
  } catch (err) {
    if (isAbortError(err)) return;
    setPillState(1, '');
    removeLoadingMsg();
    addMessage('bot', String(err?.message || 'Market intelligence failed.'));
    return;
  }

  // ── SKILLS 2 & 3 (Parallel) ──
  setPillState(2, 'active');
  setPillState(3, 'active');
  const l23 = addLoadingMsg('⟳ Running visual EDA and recommendation engines...');

  let charts, edaInsights, rec;

  const skill2Promise = (async () => {
    const skillStartedAt = performance.now();
    try {
      const r2 = await apiFetch(`${API_BASE}/skills/eda-visual-analysis`, {
        method: 'POST', headers: getLlmHeaders(),
        body: JSON.stringify({ marketData }),
      });
      const d2 = await readApiJson(r2);
      charts = d2.charts;
      edaInsights = d2.edaInsights;
      setPillState(2, 'done');
      addMessage('bot', `✓ Visual EDA complete — ${edaInsights.insights?.length || 4} key insights found (${formatDurationMs(performance.now() - skillStartedAt)})`, { cls: 's2', label: '② eda-visual-analysis' });
      renderEDA(charts, edaInsights, marketData, panel);
      return d2;
    } catch (err) {
      if (isAbortError(err)) return null;
      setPillState(2, '');
      addMessage('bot', String(err?.message || 'EDA analysis failed.'));
      return null;
    }
  })();

  const skill3Promise = (async () => {
    const skillStartedAt = performance.now();
    try {
      // Note: passing null for edaInsights here as it's running in parallel.
      // The backend now uses precomputed edaFactors from marketData.technicalIndicators.
      const r3 = await apiFetch(`${API_BASE}/skills/trade-recommendation`, {
        method: 'POST', headers: getLlmHeaders(),
        body: JSON.stringify({ marketData, edaInsights: null, timeHorizon }),
      });
      const d3 = await readApiJson(r3);
      rec = d3.recommendation;
      
      // Fetch backtest-style decision
      try {
        const rbt = await apiFetch(`${API_BASE}/skills/trade-recommendation/backtest-action`, {
          method: 'POST', headers: getLlmHeaders(), body: JSON.stringify({ priceHistory: marketData.priceHistory, timeHorizon }),
        });
        const dbt = await readApiJson(rbt);
        if (rbt.ok && !dbt.error) {
          rec.backtestView = dbt;
        }
      } catch (e) { /* ignore */ }

      setPillState(3, 'done');
      addMessage('bot', `✓ ${rec.action} — ${rec.confidence}% confidence (${formatDurationMs(performance.now() - skillStartedAt)})`, { cls: 's3', label: '③ trade-recommendation' });
      renderRecommendation(rec, panel);
      return d3;
    } catch (err) {
      if (isAbortError(err)) return null;
      setPillState(3, '');
      addMessage('bot', `Recommendation engine failed.`);
      return null;
    }
  })();

  await Promise.all([skill2Promise, skill3Promise]);
  removeLoadingMsg();

  // Save snapshot for rehydration
  try {
    window.__lastAnalysisSnapshot = {
      marketData: marketData || null,
      llmAnalysis: llmAnalysis || null,
      charts: charts || null,
      edaInsights: edaInsights || null,
      recommendation: rec || null,
      timeHorizon: timeHorizon || 'MEDIUM',
    };
  } catch (e) {
    window.__lastAnalysisSnapshot = null;
  }
  
  addMessage('bot', `⏱ Total pipeline time: ${formatDurationMs(performance.now() - pipelineStartedAt)}`);
}

async function runPortfolioPipeline(tickers, timeHorizon = 'MEDIUM') {
  const pipelineStartedAt = performance.now();
  const panel = document.getElementById('analysis-panel');
  panel.innerHTML = '';
  destroyCharts();
  resetPills();

  const loading = addLoadingMsg('⟳ Running portfolio-optimization skill...');
  try {
    const skillStartedAt = performance.now();
    const r = await apiFetch(`${API_BASE}/skills/portfolio-optimization`, {
      method: 'POST',
      headers: getLlmHeaders(),
      body: JSON.stringify({ tickers, timeHorizon }),
    });
    const d = await r.json();
    removeLoadingMsg();

    if (!r.ok || d.error) {
      addMessage('bot', d.error || 'Portfolio optimization failed.');
      return;
    }

    addMessage(
      'bot',
      `✓ Portfolio optimization complete for ${tickers.join(', ')} (${formatDurationMs(performance.now() - skillStartedAt)})`,
      { cls: 's2', label: 'portfolio-optimization' }
    );
    addMessage('bot', `⏱ Total pipeline time: ${formatDurationMs(performance.now() - pipelineStartedAt)}`);
    renderPortfolioOptimization(d, panel);
  } catch (err) {
    if (isAbortError(err)) return;
    removeLoadingMsg();
    addMessage('bot', 'Could not run portfolio optimization. Please check deployment logs and API routes.');
  }
}

async function runBacktestPipeline(ticker, startDate, endDate, strategyName = 'trade-recommendation', timeHorizon = 'MEDIUM') {
  const pipelineStartedAt = performance.now();
  const panel = document.getElementById('analysis-panel');
  // Preserve the current analysis panel HTML so the user can return without re-querying
  try {
    window.__lastAnalysisPanelHtml = panel.innerHTML || '';
  } catch (e) {
    window.__lastAnalysisPanelHtml = '';
  }
  panel.innerHTML = '';
  destroyCharts();
  resetPills();

  setPillState(4, 'active');
  const loading = addLoadingMsg('⟳ Running backtesting skill...');
  try {
    const skillStartedAt = performance.now();
    const r = await apiFetch(`${API_BASE}/skills/backtesting`, {
      method: 'POST',
      headers: getLlmHeaders(),
      body: JSON.stringify({ ticker, startDate, endDate, strategyName, timeHorizon, initialCapital: 10000 }),
    });
    const d = await r.json();
    removeLoadingMsg();

    if (!r.ok || d.error) {
      setPillState(4, '');
      const availableRange = d?.availableRange;
      const rangeHint = availableRange?.startDate && availableRange?.endDate
        ? `\nAvailable range: ${availableRange.startDate} to ${availableRange.endDate}`
        : '';
      addMessage('bot', `${d.error || 'Backtesting failed.'}${rangeHint}`);
      return;
    }

    setPillState(4, 'done');
    addMessage('bot', `✓ Backtest complete for ${ticker} (${formatDurationMs(performance.now() - skillStartedAt)})`, { cls: 's2', label: '④ backtesting' });
    addMessage('bot', `⏱ Total pipeline time: ${formatDurationMs(performance.now() - pipelineStartedAt)}`);
    renderBacktestReport(d.backtestReport, panel);
  } catch (err) {
    if (isAbortError(err)) return;
    setPillState(4, '');
    removeLoadingMsg();
    addMessage('bot', 'Could not run backtest. Make sure backend is running and API keys are configured.');
  }
}


window.sendMessage = sendMessage;
window.quickAnalyze = quickAnalyze;
window.quickPortfolio = quickPortfolio;
window.quickBacktest = quickBacktest;
