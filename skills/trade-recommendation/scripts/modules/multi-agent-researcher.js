const { parseJsonResponse } = require('../../../../backend/lib/utils');

async function runResearcherTeam({ ticker, analystReports, timeHorizon, profile, llm }) {
  const analystReportsText = `ANALYST REPORTS FOR ${ticker || 'Stock'}:
  
1. [Fundamental Analyst Report]:
- Analysis: ${analystReports.fundamental.analysis}
- Evidence: ${JSON.stringify(analystReports.fundamental.evidence)}

2. [Sentiment Analyst Report]:
- Analysis: ${analystReports.sentiment.analysis}
- Evidence: ${JSON.stringify(analystReports.sentiment.evidence)}

3. [News Analyst Report]:
- Analysis: ${analystReports.news.analysis}
- Evidence: ${JSON.stringify(analystReports.news.evidence)}

4. [Technical Analyst Report]:
- Analysis: ${analystReports.technical.analysis}
- Evidence: ${JSON.stringify(analystReports.technical.evidence)}

Investment Profile: Focus is ${profile?.focus || 'General'}, Horizon is ${timeHorizon || 'MEDIUM'}.`;

  // ──── STEP 1: Bull Researcher Argument ───────────────────────────────────
  console.log(`[Researcher] Step 1: Generating Bull Argument...`);
  const bullSystemPrompt = `You are the Bull Researcher Agent.
Your task is to review the Analyst Team reports and build the strongest possible bullish argument for ${ticker}.
Focus on price indicators above MAs, positive sentiment, earnings surprises, low PE, high ROE, or macro policy tailwinds.
Return your response in JSON format ONLY:
{
  "bullArgument": "Strongest 2-3 sentence bullish argument backed by specific evidence."
}`;

  let bullArgumentText = '';
  try {
    const res = await llm(bullSystemPrompt, analystReportsText);
    const parsed = parseJsonResponse(res, { bullArgument: 'Bullish factors support price consolidation.' });
    bullArgumentText = parsed.bullArgument;
  } catch (err) {
    console.warn('[Bull Researcher] Step 1 Failed:', err.message);
    bullArgumentText = 'Bullish argument fallback: Technical momentum remains positive and supports entry.';
  }

  // ──── STEP 2: Bear Researcher Rebuttal ───────────────────────────────────
  console.log(`[Researcher] Step 2: Generating Bear Rebuttal...`);
  const bearSystemPrompt = `You are the Bear Researcher Agent.
Your task is to review the Analyst Team reports and the Bull Researcher's Argument, and build the strongest possible bearish rebuttal.
Counter their points by focusing on overhead technical resistance, high valuation multiples, negative insider activity, policy headwinds, or high VIX/macro risks.
Return your response in JSON format ONLY:
{
  "bearRebuttal": "Strongest 2-3 sentence bearish rebuttal countering the bull case with evidence."
}`;
  const bearUserMessage = `Bull Argument to counter:
"${bullArgumentText}"

Analyst Reports Data:
${analystReportsText}`;

  let bearRebuttalText = '';
  try {
    const res = await llm(bearSystemPrompt, bearUserMessage);
    const parsed = parseJsonResponse(res, { bearRebuttal: 'Bearish pressures and overhead resistance cap upside.' });
    bearRebuttalText = parsed.bearRebuttal;
  } catch (err) {
    console.warn('[Bear Researcher] Step 2 Failed:', err.message);
    bearRebuttalText = 'Bearish rebuttal fallback: Fundamental valuation stretch and macro headwinds create risk.';
  }

  // ──── STEP 3: Bull Researcher Rebuttal ───────────────────────────────────
  console.log(`[Researcher] Step 3: Generating Bull Rebuttal...`);
  const bullRebuttalSystemPrompt = `You are the Bull Researcher Agent.
You have reviewed the Bear Researcher's Rebuttal. Your task is to defend the bullish case by writing a counter-rebuttal.
Explain how technical accumulation patterns, earnings surprises, or long-term growth trends mitigate the risks highlighted by the Bear Researcher.
Return your response in JSON format ONLY:
{
  "bullRebuttal": "2-3 sentences defending the bullish thesis and countering the bear points."
}`;
  const bullRebuttalUserMessage = `Bear Rebuttal to counter:
"${bearRebuttalText}"

Analyst Reports Data:
${analystReportsText}`;

  let bullRebuttalText = '';
  try {
    const res = await llm(bullRebuttalSystemPrompt, bullRebuttalUserMessage);
    const parsed = parseJsonResponse(res, { bullRebuttal: 'Bullish momentum is expected to absorb selling pressure.' });
    bullRebuttalText = parsed.bullRebuttal;
  } catch (err) {
    console.warn('[Bull Researcher] Step 3 Failed:', err.message);
    bullRebuttalText = 'Bullish rebuttal fallback: Support levels are historically strong enough to hold price channels.';
  }

  // ──── STEP 4: Lead Researcher Summary & Synthesis ────────────────────────
  console.log(`[Researcher] Step 4: Generating Final Plan Synthesis...`);
  const summarySystemPrompt = `You are the Lead Investment Researcher.
Your task is to review the complete debate between the Bull Researcher and the Bear Researcher, synthesize their arguments, and output the final Investment Plan.
Outline the key compromise, decide on a final objective conviction level (HIGH, MEDIUM, or LOW), and list the core reasons based on evidence.
Return your response in JSON format ONLY:
{
  "investmentPlan": "A synthesized 3-4 sentence investment plan weighing opposing factors and proposing the final tactical angle.",
  "conviction": "MEDIUM", // Must be HIGH, MEDIUM, or LOW
  "reasons": ["Core reason 1", "Core reason 2", "Core reason 3"]
}`;

  const summaryUserMessage = `DEBATE TRANSCRIPT FOR ${ticker}:
1. [Bull Argument]:
"${bullArgumentText}"

2. [Bear Rebuttal]:
"${bearRebuttalText}"

3. [Bull Rebuttal]:
"${bullRebuttalText}"

Objective Analyst Reports:
${analystReportsText}`;

  try {
    const res = await llm(summarySystemPrompt, summaryUserMessage);
    const finalPlan = parseJsonResponse(res, {
      investmentPlan: `Synthesized research plan: Technical momentum conflicts with fundamental valuation profiles for ${ticker}.`,
      conviction: 'MEDIUM',
      reasons: ['Opposing technical and fundamental indicators', 'Macro regime volatility pressures']
    });

    // Embed the debate history so the frontend can render it
    finalPlan.debateHistory = {
      bullArgument: bullArgumentText,
      bearRebuttal: bearRebuttalText,
      bullRebuttal: bullRebuttalText
    };

    return finalPlan;
  } catch (err) {
    console.warn('[Lead Researcher] Step 4 Failed:', err.message);
    return {
      investmentPlan: `Fallback investment plan for ${ticker} balancing trend lines and macro conditions.`,
      conviction: 'MEDIUM',
      reasons: ['Technical support parameters hold', 'Fundamental risks balanced'],
      debateHistory: {
        bullArgument: bullArgumentText,
        bearRebuttal: bearRebuttalText,
        bullRebuttal: bullRebuttalText
      }
    };
  }
}

module.exports = {
  runResearcherTeam
};
