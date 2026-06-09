const { parseJsonResponse } = require('../../../../backend/lib/utils');

async function runDecisionManager({
  ticker,
  analystReports,
  researcherPlan,
  tradeProposal,
  riskManagementResult,
  quantAction,
  llm
}) {
  const decisionSystemPrompt = `You are the Decision Manager (Investment Committee Chair).
Your task is to review the entire 5-layer investment committee progress and deliver the final trade verdict.
Inputs include:
- Analyst reports (Fundamental, Sentiment, News, Technical)
- Researcher Investment Plan
- Original Trade Proposal
- Risk Management Committee debate and risk-adjusted proposal

Verify the final action (must be one of: STRONG BUY, BUY, HOLD, SELL, STRONG SELL), confidence score (0-100), key risks, rationale, and final execution price targets (entry, exit/takeProfit, stopLoss).

Return your response in JSON format ONLY:
{
  "action": "BUY", // Must be one of: STRONG BUY, BUY, HOLD, SELL, STRONG SELL
  "confidence": 75,
  "entry": 100.0,
  "exit": 115.0,
  "stopLoss": 93.0,
  "rationale": "3-4 sentences synthesizing the entire committee argument and finalizing the price levels justification.",
  "executiveSummary": "1-sentence plain English summary.",
  "keyRisks": ["Risk 1", "Risk 2", "Risk 3"]
}`;

  const inputContext = `Ticker: ${ticker}

LAYER 1 ANALYSTS:
- Tech: ${analystReports.technical.analysis}
- Fund: ${analystReports.fundamental.analysis}
- Sent: ${analystReports.sentiment.analysis}
- News: ${analystReports.news.analysis}

LAYER 2 RESEARCH PLAN:
- Conviction: ${researcherPlan.conviction}
- Summary: ${researcherPlan.investmentPlan}

LAYER 3 TRADE PROPOSAL:
- Action: ${tradeProposal.action}
- Size: ${tradeProposal.size}
- Entry: $${tradeProposal.entry}, Exit: $${tradeProposal.exit}, Stop Loss: $${tradeProposal.stopLoss}

LAYER 4 RISK DEBATE & ADJUSTED PROPOSAL:
- Aggressive: ${riskManagementResult.aggressiveRisk}
- Conservative: ${riskManagementResult.conservativeRisk}
- Neutral: ${riskManagementResult.neutralRisk}
- Risk-Adjusted Proposal: ${JSON.stringify(riskManagementResult.riskAdjustedProposal)}`;

  const defaultAction = quantAction || 'HOLD';

  try {
    const res = await llm(decisionSystemPrompt, inputContext);
    const parsed = parseJsonResponse(res, {
      action: defaultAction,
      confidence: 70,
      entry: riskManagementResult.riskAdjustedProposal.entry,
      exit: riskManagementResult.riskAdjustedProposal.exit,
      stopLoss: riskManagementResult.riskAdjustedProposal.stopLoss,
      rationale: `Final recommendation compiled by Decision Manager.`,
      executiveSummary: `${ticker} - Recommendation compiled by Decision Manager.`,
      keyRisks: ['Market volatility']
    });

    // Enforce string cleaning for mismatch comparison
    const finalActionStr = String(parsed.action || defaultAction).toUpperCase().trim();
    const quantActionStr = String(quantAction || 'HOLD').toUpperCase().trim();

    // Check mismatch post-hoc in JS code
    const quantMismatch = finalActionStr !== quantActionStr;
    parsed.quantMismatch = quantMismatch;
    parsed.quantMismatchConcern = '';

    if (quantMismatch) {
      console.log(`[Decision Manager] Quant mismatch detected (AI: ${finalActionStr} vs Quant: ${quantActionStr}). Generating discrepancy explanation...`);
      const explanationPrompt = `You are a financial committee reconciler. 
The quantitative scoring engine recommended "${quantActionStr}", but the AI Decision Manager decided on "${finalActionStr}".
Based on the committee rationale: "${parsed.rationale}", write a 1-2 sentence explanation of why the committee chose to diverge from the quantitative recommendation (what factors or risks the committee prioritized that the quant engine ignored).
Do not mention prompt configurations, simply state the investment reasoning.`;
      
      try {
        const explanationRes = await llm(explanationPrompt, `Committee Rationale: ${parsed.rationale}`);
        parsed.quantMismatchConcern = String(explanationRes || '').replace(/^"|"$/g, '').trim();
      } catch (err) {
        console.warn('[Decision Manager] Failed to generate mismatch explanation:', err.message);
        parsed.quantMismatchConcern = `AI Decision Manager deviated from quantitative recommendation based on qualitative analyst debate.`;
      }
    }

    return parsed;
  } catch (err) {
    console.warn('[Decision Manager] Failed:', err.message);
    return {
      action: defaultAction,
      confidence: 50,
      entry: riskManagementResult.riskAdjustedProposal.entry,
      exit: riskManagementResult.riskAdjustedProposal.exit,
      stopLoss: riskManagementResult.riskAdjustedProposal.stopLoss,
      rationale: `Fallback decision due to manager process failure. Quant action is ${quantAction}.`,
      executiveSummary: `${ticker} fallback recommendation.`,
      keyRisks: ['Decision latency risk'],
      quantMismatch: false,
      quantMismatchConcern: ''
    };
  }
}

module.exports = {
  runDecisionManager
};
