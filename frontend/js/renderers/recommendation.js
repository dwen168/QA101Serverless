function renderRecommendation(rec, panel) {
  const renderDecisionTreeHtml = (tree) => {
    if (!tree || !Array.isArray(tree.pillars) || tree.pillars.length === 0) return '';

    const leaf = tree.leaf || {};
    const risk = tree.risk || {};

    // ── Colour helpers ────────────────────────────────────────────────────────
    // For regular pillars: bullish=green, bearish=red, neutral=amber
    const pillarPalette = (outcome) => {
      if (outcome === 'bullish') return { color: 'var(--green)', border: 'rgba(16,185,129,0.25)', bg: 'rgba(16,185,129,0.07)', chip: 'BULLISH' };
      if (outcome === 'bearish') return { color: 'var(--red)',   border: 'rgba(239,68,68,0.25)',  bg: 'rgba(239,68,68,0.07)',  chip: 'BEARISH' };
      return { color: 'var(--amber)', border: 'rgba(245,158,11,0.25)', bg: 'rgba(245,158,11,0.07)', chip: 'NEUTRAL' };
    };
    // For Risk Penalty: low=green, moderate=amber, high=red
    const riskPalette = (outcome) => {
      if (outcome === 'low')      return { color: 'var(--green)', border: 'rgba(16,185,129,0.25)', bg: 'rgba(16,185,129,0.07)', chip: 'LOW RISK' };
      if (outcome === 'high')     return { color: 'var(--red)',   border: 'rgba(239,68,68,0.25)',  bg: 'rgba(239,68,68,0.07)',  chip: 'HIGH RISK' };
      return { color: 'var(--amber)', border: 'rgba(245,158,11,0.25)', bg: 'rgba(245,158,11,0.07)', chip: 'MOD RISK' };
    };

    // ── Contribution bar (centred, extends left or right) ─────────────────────
    const contributionBar = (netScore, maxAbsScore = 10) => {
      const capped = Math.min(Math.abs(netScore), maxAbsScore);
      const pct = (capped / maxAbsScore) * 50;   // max 50% each side
      const bullish = netScore >= 0;
      const fillColor = bullish ? 'rgba(16,185,129,0.65)' : 'rgba(239,68,68,0.65)';
      const leftPct  = bullish ? 50 : 50 - pct;
      const widthPct = pct;
      return `
        <div style="position:relative;height:6px;border-radius:999px;background:rgba(255,255,255,0.06);margin:8px 0 4px;overflow:hidden">
          <div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:rgba(157,179,212,0.4)"></div>
          <div style="position:absolute;top:0;bottom:0;left:${leftPct.toFixed(1)}%;width:${widthPct.toFixed(1)}%;background:${fillColor};border-radius:999px"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:9px;font-family:var(--mono);color:var(--text3);letter-spacing:0.05em"><span>Bearish</span><span>Neutral</span><span>Bullish</span></div>
      `;
    };

    // ── Risk pressure bar (0–100% drag) ──────────────────────────────────────
    const riskPressureBar = (pct) => {
      const fillColor = pct > 50 ? 'rgba(239,68,68,0.65)' : pct > 28 ? 'rgba(245,158,11,0.65)' : 'rgba(16,185,129,0.65)';
      return `
        <div style="position:relative;height:6px;border-radius:999px;background:rgba(255,255,255,0.06);margin:8px 0 4px;overflow:hidden">
          <div style="position:absolute;top:0;bottom:0;left:0;width:${pct.toFixed(1)}%;background:${fillColor};border-radius:999px"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:9px;font-family:var(--mono);color:var(--text3);letter-spacing:0.05em"><span>0%</span><span>Risk pressure</span><span>100%</span></div>
      `;
    };

    // ── Signal evidence row ───────────────────────────────────────────────────
    const signalRow = (signal) => {
      const pts = Number(signal.points || 0);
      const ptsColor = pts > 0 ? 'var(--green)' : pts < 0 ? 'var(--red)' : 'var(--amber)';
      return `
        <div style="padding:7px 10px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.03);display:flex;gap:8px;align-items:flex-start">
          <span style="font-family:var(--mono);font-size:12px;font-weight:700;color:${ptsColor};min-width:32px;text-align:right;flex-shrink:0">${pts > 0 ? '+' : ''}${pts}</span>
          <div style="min-width:0">
            <div style="font-size:12px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${signal.name}</div>
            <div style="font-size:11px;color:var(--text2);margin-top:2px;line-height:1.4">${signal.reason}</div>
          </div>
        </div>
      `;
    };

    // ── Render each pillar card ────────────────────────────────────────────────
    const pillarCards = tree.pillars.map((pillar) => {
      const palette = pillarPalette(pillar.outcome);
      const topSignals = Array.isArray(pillar.topSignals) ? pillar.topSignals : [];
      const evidenceId = `factor-evidence-${String(pillar.id).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
      const scoreLabel = `${pillar.netScore >= 0 ? '+' : ''}${pillar.netScore} pts`;
      const barHtml = contributionBar(pillar.netScore);

      return `
        <div style="padding:11px 13px;border-radius:11px;border:1px solid ${palette.border};background:${palette.bg}">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
            <div style="font-size:12px;font-family:var(--mono);font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:${palette.color}">${pillar.label}</div>
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:12px;font-family:var(--mono);font-weight:700;color:${palette.color}">${scoreLabel}</span>
              <span style="padding:2px 6px;border-radius:999px;border:1px solid ${palette.border};font-size:9px;font-family:var(--mono);color:${palette.color}">${palette.chip}</span>
            </div>
          </div>
          <div style="font-size:11px;color:var(--text2);margin-top:5px;line-height:1.45">${pillar.description}</div>
          ${barHtml}
          ${topSignals.length ? `
            <div style="margin-top:8px">
              <button type="button" class="tree-evidence-toggle" data-target="${evidenceId}" aria-expanded="false" style="cursor:pointer;padding:3px 8px;border-radius:6px;border:1px solid var(--border);background:rgba(255,255,255,0.02);font-size:10px;color:var(--text3);font-family:var(--mono);text-transform:uppercase;letter-spacing:0.08em">Show signals (${topSignals.length})</button>
              <div id="${evidenceId}" class="tree-evidence-body" style="display:none;margin-top:8px;flex-direction:column;gap:6px">
                ${topSignals.map(signalRow).join('')}
              </div>
            </div>
          ` : `<div style="margin-top:6px;font-size:11px;color:var(--text3)">No signals in this category.</div>`}
        </div>
      `;
    }).join('');

    const riskSignals = Array.isArray(risk.topSignals) ? risk.topSignals : [];
    const riskColors = riskPalette(risk.outcome);
    const riskEvidenceId = 'factor-evidence-bearish-pressure';
    const riskCard = `
      <div style="padding:11px 13px;border-radius:11px;border:1px solid ${riskColors.border};background:${riskColors.bg}">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
          <div style="font-size:12px;font-family:var(--mono);font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:${riskColors.color}">Bearish Pressure</div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:12px;font-family:var(--mono);font-weight:700;color:${riskColors.color}">${risk.riskPressurePct ?? 0}% drag</span>
            <span style="padding:2px 6px;border-radius:999px;border:1px solid ${riskColors.border};font-size:9px;font-family:var(--mono);color:${riskColors.color}">${riskColors.chip}</span>
          </div>
        </div>
        <div style="font-size:11px;color:var(--text2);margin-top:5px;line-height:1.45">Cross-cutting summary of bearish signals. Displayed separately so it does not double-count against the pillar attribution above.</div>
        ${riskPressureBar(risk.riskPressurePct ?? 0)}
        ${riskSignals.length ? `
          <div style="margin-top:8px">
            <button type="button" class="tree-evidence-toggle" data-target="${riskEvidenceId}" aria-expanded="false" style="cursor:pointer;padding:3px 8px;border-radius:6px;border:1px solid var(--border);background:rgba(255,255,255,0.02);font-size:10px;color:var(--text3);font-family:var(--mono);text-transform:uppercase;letter-spacing:0.08em">Show bearish signals (${riskSignals.length})</button>
            <div id="${riskEvidenceId}" class="tree-evidence-body" style="display:none;margin-top:8px;flex-direction:column;gap:6px">
              ${riskSignals.map(signalRow).join('')}
            </div>
          </div>
        ` : `<div style="margin-top:6px;font-size:11px;color:var(--text3)">No bearish signals recorded.</div>`}
      </div>
    `;

    return `
      <div style="margin-top:16px;padding:12px;border-radius:12px;border:1px solid var(--border);background:rgba(255,255,255,0.02)">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px">
          <div style="font-size:13px;color:var(--cyan);font-family:var(--mono);font-weight:700;text-transform:uppercase;letter-spacing:0.1em">Factor Contribution</div>
          <span class="detail-chip">${leaf.action || rec.action} · ${leaf.confidence ?? rec.confidence}% confidence</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${pillarCards}
          ${riskCard}
        </div>
        ${leaf.summary ? `<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border);font-size:12px;color:var(--text2);line-height:1.5">${leaf.summary}</div>` : ''}
      </div>
    `;
  };

  const div2 = document.createElement('div');
  div2.className = 'section-divider fade-in';
  div2.innerHTML = `<div class="section-divider-line"></div><span class="section-divider-text">③ trade-recommendation</span><div class="section-divider-line"></div>`;
  panel.appendChild(div2);

  const rrColor = rec.riskReward >= 2 ? 'var(--green)' : rec.riskReward >= 1.5 ? 'var(--amber)' : 'var(--red)';
  const confidenceBreakdown = rec.confidenceBreakdown || null;
  const sortedSignals = [...(rec.signals || [])].sort((left, right) => {
    const leftPoints = Number(left?.points || 0);
    const rightPoints = Number(right?.points || 0);
    const leftAbs = Math.abs(leftPoints);
    const rightAbs = Math.abs(rightPoints);
    if (rightAbs !== leftAbs) return rightAbs - leftAbs;
    return rightPoints - leftPoints;
  });
  const positiveSignalPower = sortedSignals
    .filter((signal) => Number(signal?.points || 0) > 0)
    .reduce((sum, signal) => sum + Number(signal.points || 0), 0);
  const negativeSignalPower = sortedSignals
    .filter((signal) => Number(signal?.points || 0) < 0)
    .reduce((sum, signal) => sum + Math.abs(Number(signal.points || 0)), 0);
  const totalSignalPower = positiveSignalPower + negativeSignalPower;
  const positiveSignalPct = totalSignalPower > 0 ? (positiveSignalPower / totalSignalPower) * 100 : 50;
  const negativeSignalPct = totalSignalPower > 0 ? (negativeSignalPower / totalSignalPower) * 100 : 50;
  const signalDominance = positiveSignalPct >= 60
    ? 'Bullish Dominant'
    : negativeSignalPct >= 60
      ? 'Bearish Dominant'
      : 'Balanced';
  const signalDominanceColor = signalDominance === 'Bullish Dominant'
    ? 'var(--green)'
    : signalDominance === 'Bearish Dominant'
      ? 'var(--red)'
      : 'var(--amber)';
  const fmtAdj = (v) => {
    const n = Number(v || 0);
    return `${n > 0 ? '+' : ''}${n}`;
  };

  let headerHtml = '';
  if (rec.multiAgent && rec.debate) {
    const layer1 = rec.debate.layer1;
    const layer2 = rec.debate.layer2;
    const layer3 = rec.debate.layer3;
    const layer4 = rec.debate.layer4;
    const layer5 = rec.debate.layer5;
 
    const decisionAction = layer5.decision.action || 'HOLD';
    let decisionColor = '#f59e0b';
    const upperDecision = String(decisionAction).toUpperCase();
    if (upperDecision.includes('STRONG BUY')) decisionColor = '#10b981';
    else if (upperDecision.includes('BUY')) decisionColor = '#6ee7b7';
    else if (upperDecision.includes('STRONG SELL')) decisionColor = '#dc2626';
    else if (upperDecision.includes('SELL')) decisionColor = '#f87171';

    // Determine quant action to show in mismatch banner
    const quantActionStr = rec.score >= 4 ? 'BUY' : rec.score <= -4 ? 'SELL' : 'HOLD';
    let quantActionColor = '#f59e0b';
    const upperQuantAction = String(quantActionStr).toUpperCase();
    if (upperQuantAction.includes('STRONG BUY')) quantActionColor = '#10b981';
    else if (upperQuantAction.includes('BUY')) quantActionColor = '#6ee7b7';
    else if (upperQuantAction.includes('STRONG SELL')) quantActionColor = '#dc2626';
    else if (upperQuantAction.includes('SELL')) quantActionColor = '#f87171';

    const mismatchBanner = rec.quantMismatch
      ? `
        <div class="quant-alignment-banner mismatch" style="padding:12px 14px; border-radius:10px; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.25); margin-bottom:16px; display:flex; flex-direction:column; gap:6px">
          <div style="display:flex; align-items:center; gap:8px; font-weight:700; color:var(--red); font-size:12px; font-family:var(--mono)">
            <span>⚠️ QUANT DISCREPANCY DETECTED (PRESERVED MAIN QUANT ACTION)</span>
          </div>
          <div style="font-size:12px; color:var(--text2); line-height:1.45">
            <div style="margin-bottom:4px"><strong>• Quant Engine Recommendation (Main Recommendation):</strong> <span style="font-family:var(--mono); font-weight:700">${quantActionStr}</span> (Score: ${rec.score})</div>
            <div style="margin-bottom:4px"><strong>• AI Committee Advisory Suggestion:</strong> <span style="color:var(--amber); font-weight:700; font-family:var(--mono)">${layer5.decision.action}</span> (Confidence: ${layer5.decision.confidence || rec.confidence}%)</div>
            <div style="margin-top:6px; padding-top:6px; border-top:1px solid rgba(255,255,255,0.06)">
              <strong style="color:var(--text)">AI Advisory Note / Reason for Disagreement:</strong> ${rec.quantMismatchConcern || 'N/A'}
            </div>
          </div>
        </div>
      `
      : `
        <div class="quant-alignment-banner matched" style="padding:12px 14px; border-radius:10px; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.25); margin-bottom:16px; display:flex; flex-direction:column; gap:4px">
          <div style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text2)">
            <span style="color:var(--green); font-size:16px">✓</span>
            <strong style="color:var(--green); font-family:var(--mono); font-size:11px; letter-spacing:0.04em">QUANTITATIVE ALIGNMENT</strong>
          </div>
          <div style="font-size:11px; color:var(--text3); padding-left:20px">
            Quant recommendation (<span style="font-family:var(--mono)">${quantActionStr}</span>, Score: ${rec.score}) matches Multi-Agent consensus decision (<span style="font-family:var(--mono)">${rec.action}</span>).
          </div>
        </div>
      `;

    const makeEvidenceBullets = (evidenceList) => {
      if (!Array.isArray(evidenceList) || evidenceList.length === 0) return '<div style="color:var(--text3); font-style:italic">No explicit evidence reported.</div>';
      return evidenceList.map(e => `<div style="color:var(--text3); font-size:11px; line-height:1.35; margin-top:2px">• ${e}</div>`).join('');
    };

    headerHtml = `
      <!-- Multi-Agent Consensus Arena Header -->
      <div class="debate-arena-header" style="margin-bottom:16px">
        <div class="debate-arena-title" style="font-size:15px; font-weight:700; color:var(--text)">🤖 5-Layer Committee Debate Arena</div>
        <div class="debate-arena-subtitle" style="font-size:11px; color:var(--text3)">Modular roles collaborating from factual analysis to risk-adjusted final verdict</div>
      </div>

      <!-- LAYER 1: Analyst Team -->
      <div class="debate-round-header" style="margin-top:16px; margin-bottom:10px; font-size:11px; font-family:var(--mono); color:var(--text3)">
        <span class="debate-round-number" style="background:rgba(255,255,255,0.08); padding:2px 6px; border-radius:4px; margin-right:6px">LAYER 1</span>
        <span class="debate-round-title" style="text-transform:uppercase; letter-spacing:0.05em">${layer1.title}</span>
      </div>

      <div class="debate-arena-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px">
        <!-- Fundamental Analyst -->
        <div class="debate-card" style="padding:10px; border-radius:8px; border:1px solid var(--border); background:rgba(255,255,255,0.01)">
          <div style="font-size:10px; font-family:var(--mono); color:var(--cyan); font-weight:700; margin-bottom:4px">📊 FUNDAMENTAL ANALYST</div>
          <div style="font-size:12px; color:var(--text2); line-height:1.4">${layer1.fundamental.analysis}</div>
          <div style="margin-top:8px; border-top:1px solid rgba(255,255,255,0.04); padding-top:6px">
            ${makeEvidenceBullets(layer1.fundamental.evidence)}
          </div>
        </div>

        <!-- Technical Analyst -->
        <div class="debate-card" style="padding:10px; border-radius:8px; border:1px solid var(--border); background:rgba(255,255,255,0.01)">
          <div style="font-size:10px; font-family:var(--mono); color:var(--cyan); font-weight:700; margin-bottom:4px">📈 TECHNICAL ANALYST</div>
          <div style="font-size:12px; color:var(--text2); line-height:1.4">${layer1.technical.analysis}</div>
          <div style="margin-top:8px; border-top:1px solid rgba(255,255,255,0.04); padding-top:6px">
            ${makeEvidenceBullets(layer1.technical.evidence)}
          </div>
        </div>

        <!-- Sentiment Analyst -->
        <div class="debate-card" style="padding:10px; border-radius:8px; border:1px solid var(--border); background:rgba(255,255,255,0.01)">
          <div style="font-size:10px; font-family:var(--mono); color:var(--cyan); font-weight:700; margin-bottom:4px">💬 SENTIMENT ANALYST</div>
          <div style="font-size:12px; color:var(--text2); line-height:1.4">${layer1.sentiment.analysis}</div>
          <div style="margin-top:8px; border-top:1px solid rgba(255,255,255,0.04); padding-top:6px">
            ${makeEvidenceBullets(layer1.sentiment.evidence)}
          </div>
        </div>

        <!-- News Analyst -->
        <div class="debate-card" style="padding:10px; border-radius:8px; border:1px solid var(--border); background:rgba(255,255,255,0.01)">
          <div style="font-size:10px; font-family:var(--mono); color:var(--cyan); font-weight:700; margin-bottom:4px">🌍 NEWS & MACRO ANALYST</div>
          <div style="font-size:12px; color:var(--text2); line-height:1.4">${layer1.news.analysis}</div>
          <div style="margin-top:8px; border-top:1px solid rgba(255,255,255,0.04); padding-top:6px">
            ${makeEvidenceBullets(layer1.news.evidence)}
          </div>
        </div>
      </div>

      <!-- LAYER 2: Researcher Team -->
      <div class="debate-round-header" style="margin-bottom:10px; font-size:11px; font-family:var(--mono); color:var(--text3)">
        <span class="debate-round-number" style="background:rgba(255,255,255,0.08); padding:2px 6px; border-radius:4px; margin-right:6px">LAYER 2</span>
        <span class="debate-round-title" style="text-transform:uppercase; letter-spacing:0.05em">${layer2.title}</span>
      </div>

      <!-- Researcher Debate Log -->
      <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px; background:var(--bg3); padding:10px; border-radius:8px; border:1px solid var(--border)">
        <div style="font-size:10.5px; font-family:var(--mono); color:var(--cyan); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.04em">Step 1: Opening Arguments (Parallel)</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px">
          <div style="padding:6px 8px; border-radius:6px; background:var(--green-dim); border-left: 2px solid var(--green)">
            <div style="display:flex; justify-content:space-between; align-items:center">
              <span style="font-size:10px; font-family:var(--mono); color:var(--green); font-weight:700">🐂 BULL ARGUMENT</span>
              <span style="font-size:8px; font-family:var(--mono); padding:1px 4px; border-radius:3px; background:rgba(16,185,129,0.15); color:var(--green)">CONVICTION: ${layer2.plan.debateHistory?.bullConviction || 'MEDIUM'}</span>
            </div>
            <div style="font-size:11px; color:var(--text2); line-height:1.45; margin-top:2px">${layer2.plan.debateHistory?.bullArgument || 'No argument generated.'}</div>
          </div>
          <div style="padding:6px 8px; border-radius:6px; background:var(--red-dim); border-left: 2px solid var(--red)">
            <div style="display:flex; justify-content:space-between; align-items:center">
              <span style="font-size:10px; font-family:var(--mono); color:var(--red); font-weight:700">🐻 BEAR ARGUMENT</span>
              <span style="font-size:8px; font-family:var(--mono); padding:1px 4px; border-radius:3px; background:rgba(239,68,68,0.15); color:var(--red)">CONVICTION: ${layer2.plan.debateHistory?.bearConviction || 'MEDIUM'}</span>
            </div>
            <div style="font-size:11px; color:var(--text2); line-height:1.45; margin-top:2px">${layer2.plan.debateHistory?.bearArgument || 'No argument generated.'}</div>
          </div>
        </div>

        <div style="font-size:10.5px; font-family:var(--mono); color:var(--cyan); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.04em">Step 2: Rebuttals (Parallel)</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px">
          <div style="padding:6px 8px; border-radius:6px; background:var(--green-dim); border-left: 2px solid var(--green)">
            <div style="display:flex; justify-content:space-between; align-items:center">
              <span style="font-size:10px; font-family:var(--mono); color:var(--green); font-weight:700">🐂 BULL REBUTTAL</span>
              <span style="font-size:8px; font-family:var(--mono); padding:1px 4px; border-radius:3px; background:rgba(16,185,129,0.15); color:var(--green)">BULLISH</span>
            </div>
            <div style="font-size:11px; color:var(--text2); line-height:1.45; margin-top:2px">${layer2.plan.debateHistory?.bullRebuttal || 'No counter-rebuttal generated.'}</div>
          </div>
          <div style="padding:6px 8px; border-radius:6px; background:var(--red-dim); border-left: 2px solid var(--red)">
            <div style="display:flex; justify-content:space-between; align-items:center">
              <span style="font-size:10px; font-family:var(--mono); color:var(--red); font-weight:700">🐻 BEAR REBUTTAL</span>
              <span style="font-size:8px; font-family:var(--mono); padding:1px 4px; border-radius:3px; background:rgba(239,68,68,0.15); color:var(--red)">BEARISH</span>
            </div>
            <div style="font-size:11px; color:var(--text2); line-height:1.45; margin-top:2px">${layer2.plan.debateHistory?.bearRebuttal || 'No rebuttal generated.'}</div>
          </div>
        </div>
      </div>

      <!-- Synthesis Plan -->
      <div style="padding:12px; border-radius:10px; border:1px solid rgba(59,130,246,0.25); background:rgba(59,130,246,0.03); margin-bottom:16px">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
          <span style="font-size:11px; font-family:var(--mono); font-weight:700; color:var(--cyan)">🕵️ LEAD RESEARCH SUMMARY (CONSENSUS)</span>
          <div style="display:flex; gap:6px">
            <span style="padding:2px 7px; border-radius:4px; font-size:9px; font-family:var(--mono); font-weight:700; background:${layer2.plan.stance === 'BULLISH' ? 'rgba(16,185,129,0.15)' : layer2.plan.stance === 'BEARISH' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'}; color:${layer2.plan.stance === 'BULLISH' ? 'var(--green)' : layer2.plan.stance === 'BEARISH' ? 'var(--red)' : 'var(--amber)'}">STANCE: ${layer2.plan.stance || 'NEUTRAL'}</span>
            <span style="padding:2px 7px; border-radius:4px; font-size:9px; font-family:var(--mono); font-weight:700; background:rgba(245,158,11,0.15); color:var(--amber)">CONVICTION: ${layer2.plan.conviction}</span>
          </div>
        </div>
        <div style="font-size:12px; color:var(--text2); line-height:1.5">${layer2.plan.investmentPlan}</div>
        <div style="margin-top:8px; display:flex; flex-direction:column; gap:4px">
          ${(layer2.plan.reasons || []).map(r => `<div style="font-size:11px; color:var(--text3)"><span style="color:var(--cyan); margin-right:4px">✔</span>${r}</div>`).join('')}
        </div>
      </div>

      <!-- LAYER 3: Trade Execution -->
      <div class="debate-round-header" style="margin-bottom:10px; font-size:11px; font-family:var(--mono); color:var(--text3)">
        <span class="debate-round-number" style="background:rgba(255,255,255,0.08); padding:2px 6px; border-radius:4px; margin-right:6px">LAYER 3</span>
        <span class="debate-round-title" style="text-transform:uppercase; letter-spacing:0.05em">${layer3.title}</span>
      </div>

      <div style="padding:12px; border-radius:10px; border:1px solid var(--border); background:rgba(255,255,255,0.01); margin-bottom:16px; display:flex; gap:16px; flex-wrap:wrap">
        <div style="flex:1; min-width:200px">
          <div style="font-size:10px; font-family:var(--mono); color:var(--cyan); font-weight:700; margin-bottom:4px">⚡ EXECUTION STRATEGY</div>
          <div style="font-size:12px; color:var(--text2); line-height:1.45">${layer3.proposal.rationale}</div>
        </div>
        <div style="flex-shrink:0; display:flex; flex-direction:column; gap:4px; min-width:130px; padding-left:14px; border-left:1px solid var(--border)">
          <div style="font-size:10px; font-family:var(--mono); color:var(--text3)">Proposed Action</div>
          <div style="font-size:15px; font-weight:700; color:${rec.actionColor}">${layer3.proposal.action}</div>
          <div style="font-size:10px; font-family:var(--mono); color:var(--text3); margin-top:4px">Target Sizing</div>
          <div style="font-size:12px; font-weight:600; color:var(--text)">${layer3.proposal.size}</div>
        </div>
      </div>

      <!-- LAYER 4: Risk Management Team -->
      <div class="debate-round-header" style="margin-bottom:10px; font-size:11px; font-family:var(--mono); color:var(--text3); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px">
        <div>
          <span class="debate-round-number" style="background:rgba(255,255,255,0.08); padding:2px 6px; border-radius:4px; margin-right:6px">LAYER 4</span>
          <span class="debate-round-title" style="text-transform:uppercase; letter-spacing:0.05em">${layer4.title}</span>
        </div>
        ${layer4.vetoTriggered ? `<span style="padding:2px 8px; border-radius:4px; font-size:9.5px; font-family:var(--mono); font-weight:700; background:rgba(239,68,68,0.18); color:var(--red); border:1px solid rgba(239,68,68,0.3)">⚠️ RISK VETO ACTIVE (${layer4.highRiskCount}/3 HIGH)</span>` : ''}
      </div>

      <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:16px">
        <div style="padding:10px; border-radius:8px; border:1px solid rgba(239,68,68,0.18); background:rgba(239,68,68,0.02)">
          <div style="font-size:10px; font-family:var(--mono); color:var(--red); font-weight:700; margin-bottom:4px">🛡️ CONSERVATIVE RISK ANALYST</div>
          <p style="font-size:11px; color:var(--text2); margin:0; line-height:1.4">${layer4.conservative}</p>
        </div>
        <div style="padding:10px; border-radius:8px; border:1px solid rgba(16,185,129,0.18); background:rgba(16,185,129,0.02)">
          <div style="font-size:10px; font-family:var(--mono); color:var(--green); font-weight:700; margin-bottom:4px">🚀 AGGRESSIVE RISK ANALYST</div>
          <p style="font-size:11px; color:var(--text2); margin:0; line-height:1.4">${layer4.aggressive}</p>
        </div>
        <div style="padding:10px; border-radius:8px; border:1px solid rgba(245,158,11,0.18); background:rgba(245,158,11,0.02)">
          <div style="font-size:10px; font-family:var(--mono); color:var(--amber); font-weight:700; margin-bottom:4px">⚖️ NEUTRAL RISK ANALYST (CONSENSUS)</div>
          <p style="font-size:11px; color:var(--text2); margin:0; line-height:1.4">${layer4.neutral}</p>
        </div>
      </div>

      <!-- ARBITRATION SECTOR -->
      <div class="debate-flow-divider" style="display:flex; align-items:center; gap:8px; margin:20px 0 12px">
        <div class="debate-flow-line" style="flex:1; height:1px; background:var(--border)"></div>
        <div class="debate-flow-badge" style="font-size:11px; font-family:var(--mono); color:var(--cyan); letter-spacing:0.04em">⚖ LAYER 5: DECISION MANAGER VERDICT</div>
        <div class="debate-flow-line" style="flex:1; height:1px; background:var(--border)"></div>
      </div>

      <!-- Decision Agent Card -->
      <div class="debate-card decision" style="border:1px solid ${decisionColor}40; background:rgba(255,255,255,0.015); border-radius:12px; padding:12px; margin-bottom:16px">
        <div class="debate-card-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
          <div style="display:flex; align-items:center; gap:8px">
            <span class="debate-agent-icon">👑</span>
            <span class="debate-agent-name" style="font-size:12px; font-family:var(--mono); font-weight:700; color:var(--text)">${layer5.name} (Verdict)</span>
          </div>
          <span class="debate-agent-badge decision" style="padding:2px 8px; border-radius:999px; background:${decisionColor}20; color:${decisionColor}; border: 1px solid ${decisionColor}40; font-size:10px; font-family:var(--mono); font-weight:700">DECISION: ${decisionAction}</span>
        </div>
        <div class="debate-card-body">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:12px; flex-wrap:wrap">
            <div style="flex:1; min-width:240px">
              <div class="debate-verdict-title" style="color:${decisionColor}; font-size:17px; font-weight:700">${decisionAction}</div>
              <div style="color:var(--text2); font-size:12px; margin-top:2px">${rec.ticker} · ${layer5.decision.confidence || rec.confidence}% Confidence</div>
              ${rec.backtestView ? `<div style="margin-top:6px;font-size:12px;color:var(--text2)">Backtest (price+tech): <strong style="color:${rec.backtestView.action.includes('BUY') ? 'var(--green)' : rec.backtestView.action.includes('SELL') ? 'var(--red)' : 'var(--amber)'}">${rec.backtestView.action}</strong> · score ${rec.backtestView.score}</div>` : ''}
              <div style="width:180px; margin-top:6px">
                <div class="confidence-bar-wrap" style="height:6px; border-radius:999px; background:rgba(255,255,255,0.06); overflow:hidden"><div class="confidence-bar" style="height:100%; width:${layer5.decision.confidence || rec.confidence}%; background:${decisionColor}"></div></div>
              </div>
            </div>
            
            <div style="text-align:right; flex-shrink:0">
              <div style="font-size:11px;color:var(--text3);font-family:var(--mono)">Signal Score</div>
              <div style="font-size:26px;font-weight:600;font-family:var(--mono);color:${rec.score > 0 ? 'var(--green)' : rec.score < 0 ? 'var(--red)' : 'var(--amber)'}">${rec.score > 0 ? '+' : ''}${rec.score}</div>
              <div style="margin-top:8px">
                <button type="button" class="run-rec-backtest" data-ticker="${rec.ticker}" style="cursor:pointer;padding:6px 8px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.02);font-size:11px;color:var(--text3);font-family:var(--mono)">Run strategy backtest</button>
              </div>
            </div>
          </div>

          <p class="debate-analysis" style="font-weight: 500; font-size:12px; line-height:1.6; color:var(--text2); border-left: 2px solid ${decisionColor}; padding-left: 10px; margin-bottom:12px">${layer5.decision.rationale}</p>
          
          <div style="margin-top:10px; padding:10px; border-radius:8px; background:rgba(255,255,255,0.015); border:1px solid var(--border)">
            <div style="font-size:9px; font-family:var(--mono); text-transform:uppercase; color:var(--text3); margin-bottom:4px; letter-spacing:0.05em">Consensus Summary</div>
            <p style="font-size:11px; color:var(--text2); margin:0; line-height:1.5">${layer5.decision.executiveSummary}</p>
          </div>
        </div>
      </div>

      <!-- Quantitative Scoring Card -->
      <div class="quant-card-verdict" style="border:1px solid ${quantActionColor}40; background:rgba(255,255,255,0.015); border-radius:12px; padding:12px; margin-bottom:16px">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
          <div style="display:flex; align-items:center; gap:8px">
            <span style="font-size:14px">📊</span>
            <span style="font-size:12px; font-family:var(--mono); font-weight:700; color:var(--text)">Quant Engine (Verdict)</span>
          </div>
          <span style="padding:2px 8px; border-radius:999px; background:${quantActionColor}20; color:${quantActionColor}; border: 1px solid ${quantActionColor}40; font-size:10px; font-family:var(--mono); font-weight:700">QUANT ACTION: ${quantActionStr}</span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px">
          <div style="flex:1; min-width:200px">
            <div style="font-size:17px; font-weight:700; color:${quantActionColor}">${quantActionStr}</div>
            <div style="color:var(--text3); font-size:11px; margin-top:2px">Rule-based scoring computed directly from technical, fundamental, and macro weights.</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:10px; color:var(--text3); font-family:var(--mono)">Quant Score</div>
            <div style="font-size:22px; font-weight:700; font-family:var(--mono); color:${rec.score > 0 ? 'var(--green)' : rec.score < 0 ? 'var(--red)' : 'var(--amber)'}">${rec.score > 0 ? '+' : ''}${rec.score}</div>
          </div>
        </div>
      </div>

      <!-- QUANT VS MULTI-AGENT COMPARISON -->
      <div class="debate-flow-divider" style="display:flex; align-items:center; gap:8px; margin:20px 0 12px">
        <div class="debate-flow-line" style="flex:1; height:1px; background:var(--border)"></div>
        <div class="debate-flow-badge" style="font-size:11px; font-family:var(--mono); color:var(--cyan); letter-spacing:0.04em">📊 QUANT VS MULTI-AGENT COMPARISON</div>
        <div class="debate-flow-line" style="flex:1; height:1px; background:var(--border)"></div>
      </div>

      <!-- Alignment / Mismatch Banner -->
      ${mismatchBanner}
    `;
  } else {
    headerHtml = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px">
        <div>
          <div class="rec-action" style="color:${rec.actionColor}">${rec.action}</div>
          <div class="rec-confidence" style="color:var(--text2)">${rec.ticker} · ${rec.confidence}% Confidence</div>
          ${rec.backtestView ? `<div style="margin-top:6px;font-size:12px;color:var(--text2)">Backtest (price+tech): <strong style="color:${rec.backtestView.action.includes('BUY') ? 'var(--green)' : rec.backtestView.action.includes('SELL') ? 'var(--red)' : 'var(--amber)'}">${rec.backtestView.action}</strong> · score ${rec.backtestView.score}</div>` : ''}
          <div style="width:180px">
            <div class="confidence-bar-wrap"><div class="confidence-bar" style="width:${rec.confidence}%;background:${rec.actionColor}"></div></div>
          </div>
          ${confidenceBreakdown ? `
            <details style="margin-top:10px;padding:8px 10px;border-radius:8px;background:rgba(255,255,255,0.02);border:1px solid var(--border);max-width:420px">
              <summary style="font-size:10px;color:var(--text3);font-family:var(--mono);text-transform:uppercase;letter-spacing:0.08em;cursor:pointer;list-style:none">Explain confidence (${rec.confidence}%)</summary>
              <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">
                <span class="detail-chip"><span>Base:</span>${confidenceBreakdown.base ?? '—'}</span>
                <span class="detail-chip"><span>Consistency:</span>${fmtAdj(confidenceBreakdown.consistencyAdjustment)}</span>
                <span class="detail-chip"><span>Conflict:</span>${fmtAdj(confidenceBreakdown.conflictPenalty)}</span>
                <span class="detail-chip"><span>Signal count:</span>${fmtAdj(confidenceBreakdown.signalCountAdjustment)}</span>
                <span class="detail-chip"><span>Macro:</span>${fmtAdj(confidenceBreakdown.macroAdjustment)}</span>
                <span class="detail-chip"><span>Alignment:</span>${confidenceBreakdown.alignment ?? '—'}%</span>
                <span class="detail-chip"><span>Final:</span>${confidenceBreakdown.final ?? rec.confidence}</span>
              </div>
              ${rec.confidenceExplanation ? `<div style="margin-top:8px;font-size:12px;line-height:1.5;color:var(--text2)">${rec.confidenceExplanation}</div>` : ''}
            </details>
          ` : ''}
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;color:var(--text3);font-family:var(--mono)">Signal Score</div>
          <div style="font-size:28px;font-weight:600;font-family:var(--mono);color:${rec.score > 0 ? 'var(--green)' : rec.score < 0 ? 'var(--red)' : 'var(--amber)'}">${rec.score > 0 ? '+' : ''}${rec.score}</div>
          <div style="margin-top:8px">
            <button type="button" class="run-rec-backtest" data-ticker="${rec.ticker}" style="cursor:pointer;padding:6px 8px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.02);font-size:11px;color:var(--text3);font-family:var(--mono)">Run strategy backtest</button>
          </div>
        </div>
      </div>
    `;
  }

  const recCard = document.createElement('div');
  recCard.className = 'rec-card fade-in';
  recCard.style.background = `linear-gradient(135deg, var(--bg2), ${rec.actionColor}15)`;
  recCard.style.borderColor = `${rec.actionColor}40`;
  recCard.innerHTML = `
    ${headerHtml}

    <div class="price-targets">
      <div class="target-item">
        <div class="target-label">ENTRY</div>
        <div class="target-value" style="color:var(--cyan)">$${rec.entry?.toFixed(2)}</div>
      </div>
      <div class="target-item">
        <div class="target-label">STOP LOSS</div>
        <div class="target-value" style="color:var(--red)">$${rec.stopLoss?.toFixed(2)}</div>
      </div>
      <div class="target-item">
        <div class="target-label">TAKE PROFIT</div>
        <div class="target-value" style="color:var(--green)">$${rec.takeProfit?.toFixed(2)}</div>
      </div>
    </div>
    <div class="rr-badge" style="background:${rrColor}15;color:${rrColor};border:1px solid ${rrColor}30">Risk/Reward: ${rec.riskReward}:1 · ${rec.timeHorizon} term</div>
    ${rec.objectiveProfile ? `<div class="rr-badge" style="margin-top:8px;background:rgba(59,130,246,0.08);color:var(--cyan);border:1px solid rgba(59,130,246,0.2)">Recommendation Lens: ${rec.objectiveProfile.label} · ${rec.objectiveProfile.holdingPeriod}</div>` : ''}
    ${rec.macroOverlay?.available ? `<div class="rr-badge" style="margin-top:8px;background:${rec.macroOverlay.riskLevel === 'HIGH' ? 'var(--red-dim)' : rec.macroOverlay.riskLevel === 'LOW' ? 'var(--green-dim)' : 'var(--amber-dim)'};color:${rec.macroOverlay.riskLevel === 'HIGH' ? 'var(--red)' : rec.macroOverlay.riskLevel === 'LOW' ? 'var(--green)' : 'var(--amber)'};border:1px solid ${rec.macroOverlay.riskLevel === 'HIGH' ? 'rgba(239,68,68,0.35)' : rec.macroOverlay.riskLevel === 'LOW' ? 'rgba(16,185,129,0.35)' : 'rgba(245,158,11,0.35)'}">Macro Overlay: ${rec.macroOverlay.riskLevel} · ${rec.macroOverlay.sentimentLabel}${(rec.macroOverlay.dominantThemes || []).length ? ` · ${rec.macroOverlay.dominantThemes.map(t => t.theme).join(', ')}` : ''}</div>` : ''}
    ${rec.eventRegimeOverlay?.available ? `<div class="rr-badge" style="margin-top:8px;background:${rec.eventRegimeOverlay.direction === 'TAILWIND' ? 'var(--green-dim)' : rec.eventRegimeOverlay.direction === 'HEADWIND' ? 'var(--red-dim)' : 'var(--amber-dim)'};color:${rec.eventRegimeOverlay.direction === 'TAILWIND' ? 'var(--green)' : rec.eventRegimeOverlay.direction === 'HEADWIND' ? 'var(--red)' : 'var(--amber)'};border:1px solid ${rec.eventRegimeOverlay.direction === 'TAILWIND' ? 'rgba(16,185,129,0.35)' : rec.eventRegimeOverlay.direction === 'HEADWIND' ? 'rgba(239,68,68,0.35)' : 'rgba(245,158,11,0.35)'}">Event Overlay: ${rec.eventRegimeOverlay.direction || 'NEUTRAL'} · Bias ${(Number(rec.eventRegimeOverlay.netBias || 0) > 0 ? '+' : '') + Number(rec.eventRegimeOverlay.netBias || 0).toFixed(2)} · ${rec.eventRegimeOverlay.sector || 'Unknown'}</div>` : ''}

    ${rec.eventRegimeOverlay?.available ? `
      <div style="margin-top:12px;padding:10px;border-radius:8px;background:rgba(255,255,255,0.02);border:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
          <div style="font-size:11px;color:var(--text3);font-family:var(--mono);text-transform:uppercase;letter-spacing:0.08em">Event Regime Impact</div>
          <span class="detail-chip" style="color:${rec.eventRegimeOverlay.direction === 'TAILWIND' ? 'var(--green)' : rec.eventRegimeOverlay.direction === 'HEADWIND' ? 'var(--red)' : 'var(--amber)'}">${rec.eventRegimeOverlay.summary || 'Event-regime impact applied'}</span>
        </div>
        <div style="height:8px;border-radius:999px;overflow:hidden;background:rgba(255,255,255,0.05);margin-top:8px;position:relative">
          <div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:rgba(157,179,212,0.45)"></div>
          <div style="position:absolute;top:0;bottom:0;${Number(rec.eventRegimeOverlay.netBias || 0) >= 0 ? 'left:50%' : `left:calc(50% - ${Math.min(50, Math.abs(Number(rec.eventRegimeOverlay.netBias || 0)) * 20).toFixed(1)}%)`};width:${Math.min(50, Math.abs(Number(rec.eventRegimeOverlay.netBias || 0)) * 20).toFixed(1)}%;background:${Number(rec.eventRegimeOverlay.netBias || 0) >= 0 ? 'rgba(16,185,129,0.75)' : 'rgba(239,68,68,0.75)'}"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:10px;font-family:var(--mono);color:var(--text3)"><span>Headwind</span><span>Neutral</span><span>Tailwind</span></div>
        ${(rec.eventRegimeOverlay.regimes || []).length ? `<div class="signal-detail" style="margin-left:0;margin-top:8px">${rec.eventRegimeOverlay.regimes.map(regime => {
          const bizMatches = Array.isArray(regime.companyKeywordMatches) ? regime.companyKeywordMatches : [];
          const overridden = regime.companyDirectMatch && regime.sectorBased !== regime.direction;
          const chipColor = regime.companyDirectMatch ? 'var(--green)' : 'var(--text2)';
          const bizTag = regime.companyDirectMatch
            ? ` · ★ ${bizMatches.slice(0,3).join(', ')}${overridden ? ' (override)' : ''}`
            : '';
          return `<span class="detail-chip" style="color:${chipColor}">${regime.name} · ${regime.direction} · conf ${(Number(regime.confidence || 0) * 100).toFixed(0)}%${bizTag}</span>`;
        }).join('')}</div>` : ''}
      </div>
    ` : ''}

    ${rec.objectiveProfile?.focus ? `<p style="font-size:13px;line-height:1.65;color:var(--text);margin-top:12px;padding:8px 10px;border-radius:8px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.18)"><span style="font-family:var(--mono);font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:var(--cyan);font-weight:600">Objective Focus</span><br><span style="font-weight:600">${rec.objectiveProfile.focus}</span></p>` : ''}
    ${rec.objectiveProfile ? `
      <div style="margin-top:14px">
        <div style="font-size:13px;color:var(--cyan);font-family:var(--mono);font-weight:700;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.1em">Why This Lens</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <div>
            <div style="font-size:12px;color:var(--text);font-weight:600;margin-bottom:6px">Amplified in this recommendation</div>
            <div class="signal-detail" style="margin-left:0">${(rec.objectiveProfile.amplifiedSignals || []).length ? rec.objectiveProfile.amplifiedSignals.map(name => `<span class="detail-chip"><span>+</span>${name}</span>`).join('') : `<span class="detail-chip"><span>+</span>Balanced weighting</span>`}</div>
          </div>
          <div>
            <div style="font-size:12px;color:var(--text);font-weight:600;margin-bottom:6px">De-emphasized in this recommendation</div>
            <div class="signal-detail" style="margin-left:0">${(rec.objectiveProfile.deemphasizedSignals || []).length ? rec.objectiveProfile.deemphasizedSignals.map(name => `<span class="detail-chip"><span>-</span>${name}</span>`).join('') : `<span class="detail-chip"><span>-</span>No major de-emphasis</span>`}</div>
          </div>
        </div>
      </div>
    ` : ''}
    ${rec.rationale ? `<p style="font-size:13px;line-height:1.6;color:var(--text2);margin-top:14px">${rec.rationale}</p>` : ''}
    ${renderDecisionTreeHtml(rec.decisionTree)}

    <div style="margin-top:16px">
      <div style="font-size:11px;color:var(--text3);font-family:var(--mono);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.08em">Signal Breakdown</div>
      <div style="margin-bottom:10px;padding:10px;border-radius:8px;background:rgba(255,255,255,0.02);border:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;font-family:var(--mono);margin-bottom:6px;color:var(--text3)">
          <span style="color:var(--green)">Positive ${positiveSignalPower > 0 ? '+' : ''}${positiveSignalPower.toFixed(1)}</span>
          <span>Signal Tug-of-War</span>
          <span style="color:var(--red)">Negative -${negativeSignalPower.toFixed(1)}</span>
        </div>
        <div style="height:10px;border-radius:999px;overflow:hidden;display:flex;background:rgba(255,255,255,0.05)">
          <div style="width:${positiveSignalPct.toFixed(1)}%;background:rgba(16,185,129,0.75)"></div>
          <div style="width:${negativeSignalPct.toFixed(1)}%;background:rgba(239,68,68,0.75)"></div>
        </div>
        <div style="margin-top:7px;font-size:11px;font-family:var(--mono);font-weight:600;color:${signalDominanceColor}">${signalDominance}</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <!-- Positive Signals Column -->
        <div style="display:flex;flex-direction:column;gap:8px">
          <div style="font-size:10px;font-family:var(--mono);color:var(--green);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;padding-left:4px">Bullish Factors</div>
          ${sortedSignals.filter(s => Number(s.points || 0) > 0).length > 0
            ? sortedSignals.filter(s => Number(s.points || 0) > 0).map(s => `
              <div style="background:rgba(16,185,129,0.03);border:1px solid rgba(16,185,129,0.12);border-radius:10px;padding:8px">
                <div class="signal-row">
                  <span class="signal-pts pos">+${s.points}</span>
                  <span class="signal-name">${s.name}</span>
                  <span class="signal-reason">${s.reason}</span>
                </div>
                ${s.detail && s.detail.length ? `<div class="signal-detail">${s.detail.map(d => `<span class="detail-chip"><span>${d.label}:</span>${d.value}</span>`).join('')}</div>` : ''}
              </div>
            `).join('')
            : `<div style="font-size:11px;color:var(--text3);padding:10px;border:1px dashed var(--border);border-radius:10px;text-align:center">No positive signals.</div>`
          }
        </div>

        <!-- Negative Signals Column -->
        <div style="display:flex;flex-direction:column;gap:8px">
          <div style="font-size:10px;font-family:var(--mono);color:var(--red);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;padding-left:4px">Bearish Factors</div>
          ${sortedSignals.filter(s => Number(s.points || 0) < 0).length > 0
            ? sortedSignals.filter(s => Number(s.points || 0) < 0).map(s => `
              <div style="background:rgba(239,68,68,0.03);border:1px solid rgba(239,68,68,0.12);border-radius:10px;padding:8px">
                <div class="signal-row">
                  <span class="signal-pts neg">${s.points}</span>
                  <span class="signal-name">${s.name}</span>
                  <span class="signal-reason">${s.reason}</span>
                </div>
                ${s.detail && s.detail.length ? `<div class="signal-detail">${s.detail.map(d => `<span class="detail-chip"><span>${d.label}:</span>${d.value}</span>`).join('')}</div>` : ''}
              </div>
            `).join('')
            : `<div style="font-size:11px;color:var(--text3);padding:10px;border:1px dashed var(--border);border-radius:10px;text-align:center">No negative signals.</div>`
          }
        </div>
      </div>
    </div>

    ${(rec.keyRisks || []).length ? `
      <div style="margin-top:14px">
        <div style="font-size:11px;color:var(--text3);font-family:var(--mono);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.08em">Key Risks</div>
        ${rec.keyRisks.map(r => `<div class="risk-flag" style="margin-bottom:5px">⚠ ${r}</div>`).join('')}
      </div>
    ` : ''}

    <div class="disclaimer">${rec.disclaimer}</div>
  `;
  panel.appendChild(recCard);

  // Backtest button handler (runs the shared backtest pipeline and shows results in analysis panel)
  const backtestBtn = recCard.querySelector('.run-rec-backtest');
  if (backtestBtn) {
    backtestBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      const ticker = backtestBtn.getAttribute('data-ticker');
      if (!ticker) return;
      const endDate = new Date().toISOString().slice(0,10);
      const start = new Date();
      start.setFullYear(start.getFullYear() - 1);
      const startDate = start.toISOString().slice(0,10);
      if (typeof window.runBacktestPipeline === 'function') {
        window.runBacktestPipeline(ticker, startDate, endDate, 'trade-recommendation', rec.timeHorizon || 'MEDIUM');
      } else {
        // fallback: call backtest endpoint directly
        const panelMain = document.getElementById('analysis-panel');
        panelMain.innerHTML = '';
        addLoadingMsg('⟳ Running backtest...');
        fetch(`${API_BASE}/skills/trade-recommendation/backtest`, {
          method: 'POST', headers: getLlmHeaders(), body: JSON.stringify({ ticker, startDate, endDate, timeHorizon: rec.timeHorizon || 'MEDIUM' }),
        }).then(r => r.json()).then(d => {
          removeLoadingMsg();
          if (d?.error) {
            addMessage('bot', `Backtest failed: ${d.error}`);
            return;
          }
          renderBacktestReport(d.backtestReport, panelMain);
        }).catch(() => { removeLoadingMsg(); addMessage('bot', 'Backtest request failed.'); });
      }
    });
  }

  recCard.addEventListener('click', (event) => {
    const toggle = event.target.closest('.tree-evidence-toggle');
    if (!toggle) return;

    const targetId = toggle.getAttribute('data-target');
    const target = recCard.querySelector(`#${targetId}`);
    if (!target) return;

    const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
    const txt = String(toggle.textContent || '');
    toggle.textContent = isExpanded
      ? txt.replace('Hide', 'Show')
      : txt.replace('Show', 'Hide');
    target.style.display = isExpanded ? 'none' : 'flex';
  });

  // Historical Patterns card
  const hp = rec.historicalPatterns;
  if (hp && hp.instances && hp.instances.length > 0) {
    const s = hp.summary;
    const avg5Color = s.avg5d >= 0 ? 'var(--green)' : 'var(--red)';
    const avg10Color = s.avg10d >= 0 ? 'var(--green)' : 'var(--red)';
    const patternCard = document.createElement('div');
    patternCard.className = 'card fade-in';
    patternCard.innerHTML = `
      <div class="card-header">
        <span class="card-title">Historical Pattern Analogs</span>
        <span style="font-size:10px;font-family:var(--mono);padding:2px 7px;border-radius:4px;background:rgba(59,130,246,0.08);color:var(--cyan);border:1px solid rgba(59,130,246,0.15)">${hp.pattern}</span>
      </div>
      <p style="font-size:12px;color:var(--text3);margin-bottom:12px">
        Found <strong style="color:var(--text)">${s.count}</strong> past instances matching current RSI zone + MA50 position over the last <strong style="color:var(--text)">${hp.lookbackDays}</strong> trading days.
      </p>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px">
        <div class="pattern-stat">
          <span class="pattern-stat-label">Avg 5d Return</span>
          <span class="pattern-stat-value" style="color:${avg5Color}">${s.avg5d >= 0 ? '+' : ''}${s.avg5d}%</span>
        </div>
        <div class="pattern-stat">
          <span class="pattern-stat-label">5d Win Rate</span>
          <span class="pattern-stat-value" style="color:var(--cyan)">${s.winRate5d}</span>
        </div>
        <div class="pattern-stat">
          <span class="pattern-stat-label">Avg 10d Return</span>
          <span class="pattern-stat-value" style="color:${avg10Color}">${s.avg10d >= 0 ? '+' : ''}${s.avg10d}%</span>
        </div>
        <div class="pattern-stat">
          <span class="pattern-stat-label">10d Win Rate</span>
          <span class="pattern-stat-value" style="color:var(--cyan)">${s.winRate10d}</span>
        </div>
      </div>
      <div style="font-size:10px;color:var(--text3);font-family:var(--mono);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">Recent Matches (most recent ${hp.instances.length})</div>
      <div class="analog-row" style="font-size:10px;color:var(--text3);border-bottom:1px solid var(--border);padding-bottom:4px;margin-bottom:2px">
        <span>Date</span><span>Entry</span><span class="analog-ret">+5d Return</span><span class="analog-ret">+10d Return</span>
      </div>
      ${hp.instances.map(inst => `
        <div class="analog-row">
          <span class="analog-date">${inst.date}</span>
          <span style="color:var(--text2)">$${inst.entryPrice}</span>
          <span class="analog-ret ${inst.return5d >= 0 ? 'pos' : 'neg'}">${inst.return5d >= 0 ? '+' : ''}${inst.return5d}%</span>
          <span class="analog-ret ${inst.return10d >= 0 ? 'pos' : 'neg'}">${inst.return10d >= 0 ? '+' : ''}${inst.return10d}%</span>
        </div>
      `).join('')}
      <p style="font-size:10px;color:var(--text3);margin-top:10px">⚠ Past patterns are not predictive. Sample size may be small — treat as context, not signal.</p>
    `;
    panel.appendChild(patternCard);
  }

  panel.scrollTop = 0;
}

window.renderRecommendation = renderRecommendation;
