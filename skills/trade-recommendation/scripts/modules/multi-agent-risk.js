const { parseJsonResponse } = require('../../../../backend/lib/utils');

async function runRiskManagementTeam({ ticker, analystReports, researcherPlan, tradeProposal, llm }) {
  const riskSystemPrompt = `You are the Risk Management Team Committee.
Your task is to conduct a risk review of the proposed trade and produce a Risk-Adjusted Trade Proposal.
You must simulate the perspectives of three distinct risk analysts:
1. "Aggressive Risk Analyst" (focuses on return optimization, willing to take larger drawdowns for high conviction setups, validates profit target room).
2. "Conservative Risk Analyst" (focuses strictly on downside risk, drawdown exposure, macro tail risks, volatility levels, and validation of stop-loss tight defense).
3. "Neutral Risk Analyst" (moderates and summarizes the compromise and alignment between return vs risk).

Produce a debate transcript representing their perspectives, and output the final "riskAdjustedProposal" which can modify the action, position size, entry, exit, or stop-loss level of the original proposal if necessary.
Return your response in JSON format ONLY:
{
  "aggressiveRisk": "Aggressive Analyst's assessment of profit potential, catalysts, and why the risk is worth taking.",
  "conservativeRisk": "Conservative Analyst's warning about downside risks, chart vulnerabilities, and stop loss tightening recommendations.",
  "neutralRisk": "Neutral Analyst's summary of the debate, reconciling the two perspectives.",
  "riskAdjustedProposal": {
    "action": "BUY", // STRONG BUY, BUY, HOLD, SELL, STRONG SELL
    "size": "Half Position", // Adjusted position size
    "entry": 100.0,
    "exit": 115.0,
    "stopLoss": 93.0 // Can be adjusted (e.g. tighter stop loss)
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
- Conviction: ${researcherPlan.conviction}
- Summary: ${researcherPlan.investmentPlan}

ANALYSTS KEY EVIDENCE:
- Technical Evidence: ${JSON.stringify(analystReports.technical.evidence)}
- Fundamental Evidence: ${JSON.stringify(analystReports.fundamental.evidence)}
- Sentiment Evidence: ${JSON.stringify(analystReports.sentiment.evidence)}
- News/Macro Evidence: ${JSON.stringify(analystReports.news.evidence)}`;

  try {
    const res = await llm(riskSystemPrompt, inputContext);
    return parseJsonResponse(res, {
      aggressiveRisk: "Aggressive Analyst sees upside potential with robust support levels.",
      conservativeRisk: "Conservative Analyst cautions about macro headwinds and recommends tight stop-loss.",
      neutralRisk: "Neutral Analyst recommends proceeding with the proposed position size and a slightly tightened stop-loss.",
      riskAdjustedProposal: {
        action: tradeProposal.action,
        size: tradeProposal.size,
        entry: tradeProposal.entry,
        exit: tradeProposal.exit,
        stopLoss: tradeProposal.stopLoss
      }
    });
  } catch (err) {
    console.warn('[Risk Management Team] Failed:', err.message);
    return {
      aggressiveRisk: "Aggressive Analyst fallback risk review.",
      conservativeRisk: "Conservative Analyst fallback risk review.",
      neutralRisk: "Neutral Analyst fallback risk review.",
      riskAdjustedProposal: {
        action: tradeProposal.action,
        size: tradeProposal.size,
        entry: tradeProposal.entry,
        exit: tradeProposal.exit,
        stopLoss: tradeProposal.stopLoss
      }
    };
  }
}

module.exports = {
  runRiskManagementTeam
};
