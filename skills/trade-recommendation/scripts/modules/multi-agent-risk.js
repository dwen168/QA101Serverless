const { parseJsonResponse } = require('../../../../backend/lib/utils');

async function runRiskManagementTeam({ ticker, analystReports, researcherPlan, tradeProposal, llm }) {
  const aggressiveSystemPrompt = `You are the Aggressive Risk Analyst on the Risk Management Committee.
Your role focuses on return optimization. You are willing to take larger drawdowns for high conviction setups.
Review the proposed trade and produce a risk assessment. Adjust entry, exit, or stop-loss if needed to maximize profit potential.
Also determine a risk rating for this trade (HIGH, MEDIUM, or LOW).
Return your response in JSON format ONLY:
{
  "riskReview": "Aggressive Analyst's assessment of profit potential, catalysts, and why the risk is worth taking.",
  "riskRating": "LOW", // HIGH, MEDIUM, or LOW
  "proposedAdjustments": {
    "action": "BUY", // STRONG BUY, BUY, HOLD, SELL, STRONG SELL
    "size": "Full Position",
    "entry": 100.0,
    "exit": 120.0,
    "stopLoss": 90.0
  }
}`;

  const conservativeSystemPrompt = `You are the Conservative Risk Analyst on the Risk Management Committee.
Your role focuses strictly on downside risk, drawdown exposure, macro tail risks, volatility levels, and validation of stop-loss tight defense.
Review the proposed trade and produce a risk assessment. Adjust entry, exit, or stop-loss if needed to tighten risk defense.
Also determine a risk rating for this trade (HIGH, MEDIUM, or LOW).
Return your response in JSON format ONLY:
{
  "riskReview": "Conservative Analyst's warning about downside risks, chart vulnerabilities, and stop loss tightening recommendations.",
  "riskRating": "HIGH", // HIGH, MEDIUM, or LOW
  "proposedAdjustments": {
    "action": "BUY", // STRONG BUY, BUY, HOLD, SELL, STRONG SELL
    "size": "Quarter Position",
    "entry": 98.0,
    "exit": 110.0,
    "stopLoss": 95.0
  }
}`;

  const neutralSystemPrompt = `You are the Neutral Risk Analyst on the Risk Management Committee.
Your role is to balance return potential against downside risks objectively.
Review the proposed trade and produce an unbiased risk assessment. Adjust entry, exit, or stop-loss if needed.
Also determine a risk rating for this trade (HIGH, MEDIUM, or LOW).
Return your response in JSON format ONLY:
{
  "riskReview": "Neutral Analyst's objective assessment reconciling return potential and downside risks.",
  "riskRating": "MEDIUM", // HIGH, MEDIUM, or LOW
  "proposedAdjustments": {
    "action": "BUY", // STRONG BUY, BUY, HOLD, SELL, STRONG SELL
    "size": "Half Position",
    "entry": 100.0,
    "exit": 115.0,
    "stopLoss": 93.0
  }
}`;

  const inputContext = `Ticker: ${ticker}
PROPOSED TRADE FROM EXECUTION AGENT:
- Action: ${tradeProposal.action}
- Size: ${tradeProposal.size}
- Entry: $${tradeProposal.entry}
- Exit (Take Profit): $${tradeProposal.exit}
- Stop Loss: $${tradeProposal.stopLoss}
- Rationale: ${tradeProposal.rationale}

RESEARCH PLAN:
- Stance: ${researcherPlan.stance}
- Conviction: ${researcherPlan.conviction}
- Summary: ${researcherPlan.investmentPlan}

ANALYSTS KEY EVIDENCE:
- Technical Evidence: ${JSON.stringify(analystReports.technical.evidence)}
- Fundamental Evidence: ${JSON.stringify(analystReports.fundamental.evidence)}
- Sentiment Evidence: ${JSON.stringify(analystReports.sentiment.evidence)}
- News/Macro Evidence: ${JSON.stringify(analystReports.news.evidence)}`;

  let aggressiveResult = { riskReview: 'Aggressive Analyst fallback.', riskRating: 'LOW', proposedAdjustments: { ...tradeProposal } };
  let conservativeResult = { riskReview: 'Conservative Analyst fallback.', riskRating: 'HIGH', proposedAdjustments: { ...tradeProposal } };
  let neutralResult = { riskReview: 'Neutral Analyst fallback.', riskRating: 'MEDIUM', proposedAdjustments: { ...tradeProposal } };

  console.log(`[Risk Management Team] Running 3 risk analyst reviews in parallel...`);
  await Promise.all([
    (async () => {
      try {
        const res = await llm(aggressiveSystemPrompt, inputContext);
        aggressiveResult = parseJsonResponse(res, {
          riskReview: 'Aggressive Analyst sees upside potential with robust support levels.',
          riskRating: 'LOW',
          proposedAdjustments: { ...tradeProposal }
        });
      } catch (err) {
        console.warn('[Risk Team - Aggressive] Failed:', err.message);
      }
    })(),
    (async () => {
      try {
        const res = await llm(conservativeSystemPrompt, inputContext);
        conservativeResult = parseJsonResponse(res, {
          riskReview: 'Conservative Analyst cautions about macro headwinds and recommends tight stop-loss.',
          riskRating: 'HIGH',
          proposedAdjustments: { ...tradeProposal }
        });
      } catch (err) {
        console.warn('[Risk Team - Conservative] Failed:', err.message);
      }
    })(),
    (async () => {
      try {
        const res = await llm(neutralSystemPrompt, inputContext);
        neutralResult = parseJsonResponse(res, {
          riskReview: 'Neutral Analyst recommends proceeding with balanced limits.',
          riskRating: 'MEDIUM',
          proposedAdjustments: { ...tradeProposal }
        });
      } catch (err) {
        console.warn('[Risk Team - Neutral] Failed:', err.message);
      }
    })()
  ]);

  // Aggregate adjusted proposals using programmatic financial rules
  const aggregatedProposal = {
    action: neutralResult.proposedAdjustments?.action || tradeProposal.action,
    size: neutralResult.proposedAdjustments?.size || tradeProposal.size,
    entry: neutralResult.proposedAdjustments?.entry || tradeProposal.entry,
    exit: neutralResult.proposedAdjustments?.exit || tradeProposal.exit,
    stopLoss: neutralResult.proposedAdjustments?.stopLoss || tradeProposal.stopLoss
  };

  const isBuy = ['BUY', 'STRONG BUY'].includes(aggregatedProposal.action);
  const isSell = ['SELL', 'STRONG SELL'].includes(aggregatedProposal.action);

  const entries = [
    aggressiveResult.proposedAdjustments?.entry,
    conservativeResult.proposedAdjustments?.entry,
    neutralResult.proposedAdjustments?.entry
  ].filter(v => typeof v === 'number' && !isNaN(v));
  if (entries.length > 0) {
    aggregatedProposal.entry = entries.reduce((sum, val) => sum + val, 0) / entries.length;
  }

  const exits = [
    aggressiveResult.proposedAdjustments?.exit,
    conservativeResult.proposedAdjustments?.exit,
    neutralResult.proposedAdjustments?.exit
  ].filter(v => typeof v === 'number' && !isNaN(v));
  if (exits.length > 0) {
    // Buy exits: take conservative min (lower target room is safer)
    // Sell exits: take conservative max (higher targets is safer for shorts)
    aggregatedProposal.exit = isBuy ? Math.min(...exits) : (isSell ? Math.max(...exits) : exits[0]);
  }

  const stopLosses = [
    aggressiveResult.proposedAdjustments?.stopLoss,
    conservativeResult.proposedAdjustments?.stopLoss,
    neutralResult.proposedAdjustments?.stopLoss
  ].filter(v => typeof v === 'number' && !isNaN(v));
  if (stopLosses.length > 0) {
    // Buy stopLoss: take highest stop loss (tightest downside risk protection)
    // Sell stopLoss: take lowest stop loss (tightest upside risk protection)
    aggregatedProposal.stopLoss = isBuy ? Math.max(...stopLosses) : (isSell ? Math.min(...stopLosses) : stopLosses[0]);
  }

  // Count HIGH risk ratings (2/3 veto)
  let highRiskCount = 0;
  if (String(aggressiveResult.riskRating).toUpperCase() === 'HIGH') highRiskCount++;
  if (String(conservativeResult.riskRating).toUpperCase() === 'HIGH') highRiskCount++;
  if (String(neutralResult.riskRating).toUpperCase() === 'HIGH') highRiskCount++;

  let vetoTriggered = false;
  if (highRiskCount >= 2) {
    vetoTriggered = true;
    console.log(`[Risk Management Team] VETO triggered (${highRiskCount}/3 HIGH risk ratings). Enforcing downgrade.`);
    if (aggregatedProposal.action === 'STRONG BUY') aggregatedProposal.action = 'BUY';
    else if (aggregatedProposal.action === 'BUY') aggregatedProposal.action = 'HOLD';
    else if (aggregatedProposal.action === 'STRONG SELL') aggregatedProposal.action = 'SELL';
    else if (aggregatedProposal.action === 'SELL') aggregatedProposal.action = 'HOLD';
    
    aggregatedProposal.size = 'Quarter Position';
  }

  aggregatedProposal.vetoTriggered = vetoTriggered;

  return {
    aggressiveRisk: aggressiveResult.riskReview,
    conservativeRisk: conservativeResult.riskReview,
    neutralRisk: neutralResult.riskReview,
    riskAdjustedProposal: aggregatedProposal,
    vetoTriggered,
    highRiskCount
  };
}

module.exports = {
  runRiskManagementTeam
};
