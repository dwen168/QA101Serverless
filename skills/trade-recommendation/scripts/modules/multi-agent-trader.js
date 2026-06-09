const { parseJsonResponse } = require('../../../../backend/lib/utils');

async function runTradeAgent({ ticker, analystReports, researcherPlan, basePriceLevels, llm }) {
  const traderSystemPrompt = `You are the Trade Execution Agent.
Your task is to compile the Analyst reports and the Researcher Team's Investment Plan into a concrete Trade Proposal.
The Researcher Team has decided the overall stance for this trade is "${researcherPlan.stance || 'neutral'}".
You MUST align your Action with this stance:
- If stance is "bullish", Action must be BUY or STRONG BUY.
- If stance is "bearish", Action must be SELL or STRONG SELL.
- If stance is "neutral", Action must be HOLD.

Determine the specific Action (must be one of: STRONG BUY, BUY, HOLD, SELL, STRONG SELL), target Position Size (e.g., Full Position, Half Position, No Position), and formulate precise entry, stopLoss, and takeProfit price levels.
You may use the quantitative base price levels provided, but you can adjust them slightly if the technical levels or fundamental margins of safety warrant adjustments.
Return your response in JSON format ONLY:
{
  "action": "BUY", // STRONG BUY, BUY, HOLD, SELL, STRONG SELL
  "size": "Half Position", // Sizing recommendation
  "entry": 100.0,
  "exit": 115.0, // Target take profit price
  "stopLoss": 92.0, // Risk invalidation stop loss price
  "rationale": "2-3 sentences explaining the trade setup, price levels justification, and position sizing."
}`;

  const inputContext = `Ticker: ${ticker}
QUANTITATIVE BASE PRICE LEVELS:
- Entry: $${basePriceLevels.entry || 'N/A'}
- Take Profit (Exit): $${basePriceLevels.takeProfit || 'N/A'}
- Stop Loss: $${basePriceLevels.stopLoss || 'N/A'}

RESEARCHER INVESTMENT PLAN:
- Stance: ${researcherPlan.stance}
- Conviction: ${researcherPlan.conviction}
- Summary: ${researcherPlan.investmentPlan}
- Reasons: ${JSON.stringify(researcherPlan.reasons)}

ANALYST OVERVIEWS:
- Technical Summary: ${analystReports.technical.analysis}
- Fundamental Summary: ${analystReports.fundamental.analysis}
- Sentiment Summary: ${analystReports.sentiment.analysis}
- News/Macro Summary: ${analystReports.news.analysis}`;

  try {
    const res = await llm(traderSystemPrompt, inputContext);
    return parseJsonResponse(res, {
      action: researcherPlan.stance === 'bullish' ? 'BUY' : (researcherPlan.stance === 'bearish' ? 'SELL' : 'HOLD'),
      size: 'Half Position',
      entry: basePriceLevels.entry,
      exit: basePriceLevels.takeProfit,
      stopLoss: basePriceLevels.stopLoss,
      rationale: `Trade execution proposal based on researcher plan with default quantitative price levels.`
    });
  } catch (err) {
    console.warn('[Trade Agent] Failed:', err.message);
    return {
      action: researcherPlan.stance === 'bullish' ? 'BUY' : (researcherPlan.stance === 'bearish' ? 'SELL' : 'HOLD'),
      size: 'No Position',
      entry: basePriceLevels.entry,
      exit: basePriceLevels.takeProfit,
      stopLoss: basePriceLevels.stopLoss,
      rationale: `Fallback trade proposal. Reverted to aligned stance action due to execution synthesis failure.`
    };
  }
}

module.exports = {
  runTradeAgent
};
