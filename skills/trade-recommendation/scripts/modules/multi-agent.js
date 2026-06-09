const { runAnalystTeam } = require('./multi-agent-analyst');
const { runResearcherTeam } = require('./multi-agent-researcher');
const { runTradeAgent } = require('./multi-agent-trader');
const { runRiskManagementTeam } = require('./multi-agent-risk');
const { runDecisionManager } = require('./multi-agent-decision');

async function runMultiAgentRecommendation({
  marketData,
  timeHorizon,
  profile,
  signals,
  score,
  buyRatio,
  policyOverlay,
  eventRegimeOverlay,
  entry,
  stopLoss,
  takeProfit,
  riskReward,
  llm,
  quantAction, // Passed from index.js
}) {
  const ticker = marketData.ticker || 'Stock';

  // 1. Layer 1: Analyst Team (Parallel execution)
  console.log(`[Multi-Agent] Running Layer 1: Analyst Team for ${ticker}...`);
  const analystReports = await runAnalystTeam({
    marketData,
    policyOverlay,
    eventRegimeOverlay,
    llm
  });

  // 2. Layer 2: Researcher Team
  console.log(`[Multi-Agent] Running Layer 2: Researcher Team for ${ticker}...`);
  const researcherPlan = await runResearcherTeam({
    ticker,
    analystReports,
    timeHorizon,
    profile,
    llm
  });

  // 3. Layer 3: Trade Agent
  console.log(`[Multi-Agent] Running Layer 3: Trade Agent for ${ticker}...`);
  const basePriceLevels = { entry, stopLoss, takeProfit };
  const tradeProposal = await runTradeAgent({
    ticker,
    analystReports,
    researcherPlan,
    basePriceLevels,
    llm
  });

  // 4. Layer 4: Risk Management Team
  console.log(`[Multi-Agent] Running Layer 4: Risk Management Team for ${ticker}...`);
  const riskManagementResult = await runRiskManagementTeam({
    ticker,
    analystReports,
    researcherPlan,
    tradeProposal,
    llm
  });

  // 5. Layer 5: Decision Manager
  console.log(`[Multi-Agent] Running Layer 5: Decision Manager for ${ticker}...`);
  const decisionResult = await runDecisionManager({
    ticker,
    analystReports,
    researcherPlan,
    tradeProposal,
    riskManagementResult,
    quantAction,
    llm
  });

  // Determine action color for frontend display
  const finalAction = decisionResult.action || quantAction || 'HOLD';
  let finalActionColor = '#f59e0b';
  const upperVerdict = String(finalAction).toUpperCase();
  if (upperVerdict.includes('STRONG BUY')) finalActionColor = '#10b981';
  else if (upperVerdict.includes('BUY')) finalActionColor = '#6ee7b7';
  else if (upperVerdict.includes('STRONG SELL')) finalActionColor = '#dc2626';
  else if (upperVerdict.includes('SELL')) finalActionColor = '#f87171';

  return {
    action: finalAction,
    actionColor: finalActionColor,
    confidence: typeof decisionResult.confidence === 'number' ? decisionResult.confidence : 50,
    entry: typeof decisionResult.entry === 'number' ? decisionResult.entry : entry,
    stopLoss: typeof decisionResult.stopLoss === 'number' ? decisionResult.stopLoss : stopLoss,
    takeProfit: typeof decisionResult.exit === 'number' ? decisionResult.exit : takeProfit,
    llmRecommendation: {
      rationale: decisionResult.rationale,
      keyRisks: decisionResult.keyRisks || ['Market volatility'],
      executiveSummary: decisionResult.executiveSummary,
      timeHorizon,
      quantMismatch: !!decisionResult.quantMismatch,
      quantMismatchConcern: decisionResult.quantMismatchConcern || ''
    },
    confidenceExplanation: 'Confidence calibrated by Committee Decision Manager.',
    debate: {
      layer1: {
        title: 'Layer 1 · Analyst Team',
        fundamental: analystReports.fundamental,
        sentiment: analystReports.sentiment,
        news: analystReports.news,
        technical: analystReports.technical
      },
      layer2: {
        title: 'Layer 2 · Researcher Team',
        plan: researcherPlan
      },
      layer3: {
        title: 'Layer 3 · Trade Execution',
        proposal: tradeProposal
      },
      layer4: {
        title: 'Layer 4 · Risk Management Committee',
        aggressive: riskManagementResult.aggressiveRisk,
        conservative: riskManagementResult.conservativeRisk,
        neutral: riskManagementResult.neutralRisk,
        adjusted: riskManagementResult.riskAdjustedProposal
      },
      layer5: {
        title: 'Layer 5 · Decision Manager Verdict',
        name: 'Decision Manager',
        decision: decisionResult
      }
    }
  };
}

module.exports = {
  runMultiAgentRecommendation,
};
