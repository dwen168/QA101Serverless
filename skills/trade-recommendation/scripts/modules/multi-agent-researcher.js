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

  // ──── STEP 1: Parallel Bull and Bear Researcher Arguments ──────────────────────────────
  console.log(`[Researcher] Step 1: Generating Bull and Bear Arguments in parallel...`);
  const bullSystemPrompt = `You are the Bull Researcher Agent.
Your task is to review the Analyst Team reports and build an evidence-driven bullish argument for ${ticker}.
Focus on price indicators above MAs, positive sentiment, earnings surprises, low PE, high ROE, or macro policy tailwinds.
Return your response in JSON format ONLY:
{
  "argument": "Evidence-driven 2-3 sentence bullish argument backed by specific evidence.",
  "conviction": "MEDIUM" // Must be HIGH, MEDIUM, or LOW
}`;

  const bearSystemPrompt = `You are the Bear Researcher Agent.
Your task is to review the Analyst Team reports and build an evidence-driven bearish argument for ${ticker}.
Focus on overhead technical resistance, high valuation multiples, negative insider activity, policy headwinds, or high VIX/macro risks.
Return your response in JSON format ONLY:
{
  "argument": "Evidence-driven 2-3 sentence bearish argument backed by specific evidence.",
  "conviction": "MEDIUM" // Must be HIGH, MEDIUM, or LOW
}`;

  let bullArgumentText = '';
  let bullConviction = 'MEDIUM';
  let bearArgumentText = '';
  let bearConviction = 'MEDIUM';

  await Promise.all([
    (async () => {
      try {
        const res = await llm(bullSystemPrompt, analystReportsText);
        const parsed = parseJsonResponse(res, { argument: 'Bullish factors support price consolidation.', conviction: 'MEDIUM' });
        bullArgumentText = parsed.argument || parsed.bullArgument || '';
        bullConviction = parsed.conviction || 'MEDIUM';
      } catch (err) {
        console.warn('[Bull Researcher] Step 1 Failed:', err.message);
        bullArgumentText = 'Bullish argument fallback: Technical momentum remains positive and supports entry.';
        bullConviction = 'MEDIUM';
      }
    })(),
    (async () => {
      try {
        const res = await llm(bearSystemPrompt, analystReportsText);
        const parsed = parseJsonResponse(res, { argument: 'Bearish pressures and overhead resistance cap upside.', conviction: 'MEDIUM' });
        bearArgumentText = parsed.argument || parsed.bearArgument || '';
        bearConviction = parsed.conviction || 'MEDIUM';
      } catch (err) {
        console.warn('[Bear Researcher] Step 1 Failed:', err.message);
        bearArgumentText = 'Bearish argument fallback: Fundamental valuation stretch and macro headwinds create risk.';
        bearConviction = 'MEDIUM';
      }
    })()
  ]);

  // ──── STEP 2: Parallel Bull and Bear Researcher Rebuttals ─────────────────────────────
  console.log(`[Researcher] Step 2: Generating Bull and Bear Rebuttals in parallel...`);
  const bullRebuttalSystemPrompt = `You are the Bull Researcher Agent.
You have reviewed the Bear Researcher's Argument. Your task is to defend the bullish case by writing an evidence-driven counter-rebuttal.
Explain how technical accumulation patterns, earnings surprises, or long-term growth trends mitigate the risks highlighted by the Bear Researcher.
Return your response in JSON format ONLY:
{
  "rebuttal": "Evidence-driven 2-3 sentences defending the bullish thesis and countering the bear points."
}`;
  const bullRebuttalUserMessage = `Bear Argument to counter:
"${bearArgumentText}"

Analyst Reports Data:
${analystReportsText}`;

  const bearRebuttalSystemPrompt = `You are the Bear Researcher Agent.
You have reviewed the Bull Researcher's Argument. Your task is to counter the bullish case by writing an evidence-driven rebuttal.
Explain how overhead technical resistance, high valuation multiples, negative insider activity, policy headwinds, or high VIX/macro risks outweigh the arguments highlighted by the Bull Researcher.
Return your response in JSON format ONLY:
{
  "rebuttal": "Evidence-driven 2-3 sentences countering the bull points with evidence."
}`;
  const bearRebuttalUserMessage = `Bull Argument to counter:
"${bullArgumentText}"

Analyst Reports Data:
${analystReportsText}`;

  let bullRebuttalText = '';
  let bearRebuttalText = '';

  await Promise.all([
    (async () => {
      try {
        const res = await llm(bullRebuttalSystemPrompt, bullRebuttalUserMessage);
        const parsed = parseJsonResponse(res, { rebuttal: 'Bullish momentum is expected to absorb selling pressure.' });
        bullRebuttalText = parsed.rebuttal || parsed.bullRebuttal || '';
      } catch (err) {
        console.warn('[Bull Researcher] Step 2 Failed:', err.message);
        bullRebuttalText = 'Bullish rebuttal fallback: Support levels are historically strong enough to hold price channels.';
      }
    })(),
    (async () => {
      try {
        const res = await llm(bearRebuttalSystemPrompt, bearRebuttalUserMessage);
        const parsed = parseJsonResponse(res, { rebuttal: 'Bearish pressures and overhead resistance cap upside.' });
        bearRebuttalText = parsed.rebuttal || parsed.bearRebuttal || '';
      } catch (err) {
        console.warn('[Bear Researcher] Step 2 Failed:', err.message);
        bearRebuttalText = 'Bearish rebuttal fallback: Fundamental valuation stretch and macro headwinds create risk.';
      }
    })()
  ]);

  // ──── STEP 3: Lead Researcher Summary & Synthesis ────────────────────────
  console.log(`[Researcher] Step 3: Generating Final Plan Synthesis...`);
  const summarySystemPrompt = `You are the Lead Investment Researcher.
Your task is to review the complete debate between the Bull Researcher and the Bear Researcher, synthesize their arguments, and output the final evidence-driven Investment Plan.
Outline the key compromise, decide on a final objective conviction level (HIGH, MEDIUM, or LOW), determine the overall stance (BULLISH, BEARISH, or NEUTRAL), and list the core reasons based on evidence.
Return your response in JSON format ONLY:
{
  "investmentPlan": "A synthesized 3-4 sentence investment plan weighing opposing factors and proposing the final tactical angle.",
  "conviction": "MEDIUM", // Must be HIGH, MEDIUM, or LOW
  "stance": "NEUTRAL", // Must be BULLISH, BEARISH, or NEUTRAL
  "reasons": ["Core reason 1", "Core reason 2", "Core reason 3"]
}`;

  const summaryUserMessage = `DEBATE TRANSCRIPT FOR ${ticker}:
1. [Bull Argument]:
"${bullArgumentText}" (Conviction: ${bullConviction})

2. [Bear Argument]:
"${bearArgumentText}" (Conviction: ${bearConviction})

3. [Bull Rebuttal]:
"${bullRebuttalText}"

4. [Bear Rebuttal]:
"${bearRebuttalText}"

Objective Analyst Reports:
${analystReportsText}`;

  try {
    const res = await llm(summarySystemPrompt, summaryUserMessage);
    const finalPlan = parseJsonResponse(res, {
      investmentPlan: `Synthesized research plan: Technical momentum conflicts with fundamental valuation profiles for ${ticker}.`,
      conviction: 'MEDIUM',
      stance: 'NEUTRAL',
      reasons: ['Opposing technical and fundamental indicators', 'Macro regime volatility pressures']
    });

    // Normalize stance to lowercase
    let finalStance = String(finalPlan.stance || 'neutral').toLowerCase().trim();
    if (finalStance === 'neural') finalStance = 'neutral';
    finalPlan.stance = finalStance;

    // Embed the debate history so the frontend can render it
    finalPlan.debateHistory = {
      bullArgument: bullArgumentText,
      bullConviction: bullConviction,
      bearArgument: bearArgumentText,
      bearConviction: bearConviction,
      bullRebuttal: bullRebuttalText,
      bearRebuttal: bearRebuttalText
    };

    return finalPlan;
  } catch (err) {
    console.warn('[Lead Researcher] Step 3 Failed:', err.message);
    return {
      investmentPlan: `Fallback investment plan for ${ticker} balancing trend lines and macro conditions.`,
      conviction: 'MEDIUM',
      stance: 'neutral',
      reasons: ['Technical support parameters hold', 'Fundamental risks balanced'],
      debateHistory: {
        bullArgument: bullArgumentText,
        bullConviction: bullConviction,
        bearArgument: bearArgumentText,
        bearConviction: bearConviction,
        bullRebuttal: bullRebuttalText,
        bearRebuttal: bearRebuttalText
      }
    };
  }
}

module.exports = {
  runResearcherTeam
};
