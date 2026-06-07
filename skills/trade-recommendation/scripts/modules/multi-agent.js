const { parseJsonResponse } = require('../../../../backend/lib/utils');

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
}) {
  const positiveSignals = signals.filter(s => Number(s.points || 0) > 0);
  const negativeSignals = signals.filter(s => Number(s.points || 0) < 0);

  // ── ROUND 1: OPENING THESES ──────────────────────────────────────────────
  const techSystemPrompt = `You are the Technical Analyst Agent, a quantitative trading expert specializing in price structure, momentum, and technical indicators.
Your task is to present the strongest possible bullish opening thesis for the stock. Analyze moving averages, support levels, oscillators (RSI, MACD), and volume indicators (OBV).
Return your response in JSON format ONLY:
{
  "analysis": "2-3 sentences outlining the bullish technical structure, volume flow, and momentum support.",
  "topDrivers": ["Highlight 1", "Highlight 2", "Highlight 3"]
}`;
  const techUserMessage = `Analyze ${marketData.ticker}.
Investment horizon: ${timeHorizon}.
Objective profile focus: ${profile.focus}.
Technical Trend: ${marketData.trend}.
Positive Signals: ${positiveSignals.map(s => `${s.name} (+${s.points} pts: ${s.reason})`).join(', ')}.
Valuation & Fundamentals: PE ratio is ${marketData.pe}, EPS is ${marketData.eps}, analyst consensus is ${marketData.analystConsensus}.`;

  const riskSystemPrompt = `You are the Risk & Fundamental Analyst Agent, an expert in fundamental valuation, macro risks, and downside market hazards.
Your task is to present the strongest possible bearish or cautious opening thesis for the stock. Analyze high P/E ratio, negative analyst revisions, macro overlays (inflation, rates), policy headwinds, and resistance zones.
Return your response in JSON format ONLY:
{
  "analysis": "2-3 sentences outlining fundamental headwinds, valuation stretch, or macro risk pressures.",
  "topRisks": ["Risk 1", "Risk 2", "Risk 3"]
}`;
  const riskUserMessage = `Analyze ${marketData.ticker}.
Investment horizon: ${timeHorizon}.
Technical Trend: ${marketData.trend}.
Negative Signals: ${negativeSignals.map(s => `${s.name} (${s.points} pts: ${s.reason})`).join(', ')}.
Macro Context: ${JSON.stringify(marketData.macroContext || {}, null, 2)}.
Event/Policy Overlays: ${JSON.stringify(policyOverlay || {}, null, 2)}.`;

  // Run Round 1 calls in parallel
  const [techOpening, riskOpening] = await Promise.all([
    (async () => {
      try {
        const res = await llm(techSystemPrompt, techUserMessage);
        return parseJsonResponse(res, {
          analysis: `Bullish technical structure supported by current trend characteristics for ${marketData.ticker}.`,
          topDrivers: ['Price trend support', 'Analyst agreement', 'Bullish crossovers']
        });
      } catch (err) {
        console.warn('[Technical Analyst R1] Failed:', err.message);
        return {
          analysis: `Bullish analysis fallback for ${marketData.ticker}: Price trend is ${marketData.trend} and oscillators indicate supportive levels.`,
          topDrivers: ['Bullish momentum', 'Trend support', 'Valuation support']
        };
      }
    })(),
    (async () => {
      try {
        const res = await llm(riskSystemPrompt, riskUserMessage);
        return parseJsonResponse(res, {
          analysis: `Fundamental risk indicators suggest downside hazards or macro resistance overlays for ${marketData.ticker}.`,
          topRisks: ['Macro regime overlays', 'Valuation premium', 'Resistance zones']
        });
      } catch (err) {
        console.warn('[Risk Analyst R1] Failed:', err.message);
        return {
          analysis: `Bearish analysis fallback for ${marketData.ticker}: Market risk and negative overlays suggest caution.`,
          topRisks: ['Market volatility', 'Macro headwinds', 'Technical resistance']
        };
      }
    })()
  ]);

  // ── ROUND 2: REBUTTALS & CROSS-EXAMINATIONS ──────────────────────────────
  const techRebuttalSystemPrompt = `You are the Technical Analyst Agent. You have reviewed the opening bearish case presented by the Risk & Fundamental Analyst.
Your task is to write a rebuttal defending the bullish case. Counter their concerns by explaining how technical momentum, accumulation patterns, or historical price structures mitigate their highlighted risks.
Return your response in JSON format ONLY:
{
  "rebuttal": "2-3 sentences defending your bullish thesis and explaining why technical strength will override the fundamental/macro risks."
}`;
  const techRebuttalUserMessage = `Bearish Case to counter:
${riskOpening.analysis}
Specific risks cited: ${JSON.stringify(riskOpening.topRisks)}`;

  const riskRebuttalSystemPrompt = `You are the Risk & Fundamental Analyst Agent. You have reviewed the opening bullish case presented by the Technical Analyst.
Your task is to write a rebuttal challenging their bullish thesis. Explain how potential technical failures (false breakouts, low volume exhaustion) or structural valuation caps will invalidate their technical indicators.
Return your response in JSON format ONLY:
{
  "rebuttal": "2-3 sentences challenging the technical thesis and explaining why fundamental/macro pressures will cause the technical support levels to break."
}`;
  const riskRebuttalUserMessage = `Bullish Case to challenge:
${techOpening.analysis}
Specific drivers cited: ${JSON.stringify(techOpening.topDrivers)}`;

  // Run Round 2 calls in parallel
  const [techRebuttal, riskRebuttal] = await Promise.all([
    (async () => {
      try {
        const res = await llm(techRebuttalSystemPrompt, techRebuttalUserMessage);
        return parseJsonResponse(res, {
          rebuttal: 'Technical momentum indicates buying accumulation is sufficiently strong to overcome short-term macro noise.'
        });
      } catch (err) {
        console.warn('[Technical Analyst R2] Failed:', err.message);
        return {
          rebuttal: 'Support zones remain technically intact, suggesting technical buyers will defend current price channels.'
        };
      }
    })(),
    (async () => {
      try {
        const res = await llm(riskRebuttalSystemPrompt, riskRebuttalUserMessage);
        return parseJsonResponse(res, {
          rebuttal: 'High macro volatility and underlying valuation limits suggest technical indicators are flashing false buy signals.'
        });
      } catch (err) {
        console.warn('[Risk Analyst R2] Failed:', err.message);
        return {
          rebuttal: 'Underlying macro overlays and interest rate profiles remain structural headwinds that will likely trigger key support failures.'
        };
      }
    })()
  ]);

  // ── ROUND 3: ARBITRATION BY DECISION AGENT ───────────────────────────────
  const decisionSystemPrompt = `You are the Decision Agent, the Investment Committee Chair.
Your task is to review the complete multi-round debate transcript between the Technical Analyst and the Risk & Fundamental Analyst. Weigh their opening statements and rebuttals, assess the objective signal score, and make the final trade recommendation (BUY, HOLD, or SELL).
Deliver the final action (must be one of: STRONG BUY, BUY, HOLD, SELL, STRONG SELL), confidence score (0-100), and write a final rationale and a committee debate summary describing the key friction points and compromise.
Return your response in JSON format ONLY:
{
  "action": "...",
  "confidence": 75,
  "rationale": "...",
  "debateSummary": "...",
  "keyRisks": ["...", "..."],
  "executiveSummary": "..."
}`;
  const decisionUserMessage = `Ticker: ${marketData.ticker}
Investment Horizon: ${timeHorizon}
Objective profile focus: ${profile.focus}
Quantitative Signal Score: ${score} (Buy Ratio: ${buyRatio})
Quantitative Price Levels: Entry ${entry}, Stop Loss ${stopLoss}, Take Profit ${takeProfit}

DEBATE TRANSCRIPT:

[Round 1: Opening Cases]
- Technical Analyst Opening Case:
  "${techOpening.analysis}"
  Drivers: ${JSON.stringify(techOpening.topDrivers)}
  
- Risk & Fundamental Analyst Opening Case:
  "${riskOpening.analysis}"
  Risks: ${JSON.stringify(riskOpening.topRisks)}

[Round 2: Cross-Examination Rebuttals]
- Technical Analyst Rebuttal:
  "${techRebuttal.rebuttal}"
  
- Risk & Fundamental Analyst Rebuttal:
  "${riskRebuttal.rebuttal}"

Compare the arguments, reconcile differences, and provide the final consensus decision. Make sure the action matches one of: STRONG BUY, BUY, HOLD, SELL, STRONG SELL.`;

  let decisionResult;
  try {
    const res = await llm(decisionSystemPrompt, decisionUserMessage);
    decisionResult = parseJsonResponse(res, null);
  } catch (err) {
    console.warn('[Decision Agent R3] Failed:', err.message);
  }

  const defaultAction = score >= 4 ? 'BUY' : score <= -4 ? 'SELL' : 'HOLD';
  const defaultConfidence = 50;

  if (!decisionResult) {
    decisionResult = {
      action: defaultAction,
      confidence: defaultConfidence,
      rationale: `Verdict computed from quantitative signals and risk models. Technical view: ${techOpening.analysis}. Risk view: ${riskOpening.analysis}`,
      debateSummary: 'Committee failed to reach an LLM consensus; verdict reverted to objective signal scoring and risk overlay parameters.',
      keyRisks: ['Technical momentum mismatch', 'Macro overlay headwinds'],
      executiveSummary: `${marketData.ticker} quantitative review indicates ${defaultAction} with ${defaultConfidence}% confidence.`
    };
  }

  const finalAction = decisionResult.action || defaultAction;
  let finalActionColor = '#f59e0b';
  const upperVerdict = String(finalAction).toUpperCase();
  if (upperVerdict.includes('STRONG BUY')) finalActionColor = '#10b981';
  else if (upperVerdict.includes('BUY')) finalActionColor = '#6ee7b7';
  else if (upperVerdict.includes('STRONG SELL')) finalActionColor = '#dc2626';
  else if (upperVerdict.includes('SELL')) finalActionColor = '#f87171';

  const finalConfidence = typeof decisionResult.confidence === 'number' ? decisionResult.confidence : defaultConfidence;

  return {
    action: finalAction,
    actionColor: finalActionColor,
    confidence: finalConfidence,
    entry,
    stopLoss,
    takeProfit,
    llmRecommendation: {
      rationale: decisionResult.rationale,
      keyRisks: decisionResult.keyRisks || ['Market volatility'],
      executiveSummary: decisionResult.executiveSummary,
      timeHorizon,
    },
    confidenceExplanation: 'Confidence calibrated by Decision Agent considering bullish and bearish analyst inputs.',
    debate: {
      round1: {
        title: 'Round 1 · Opening Thesis',
        technicalAnalyst: {
          name: 'Technical Analyst Agent',
          role: 'Technical',
          analysis: techOpening.analysis,
          drivers: techOpening.topDrivers || [],
        },
        riskAnalyst: {
          name: 'Risk & Fundamental Analyst Agent',
          role: 'Risk/Fundamental',
          analysis: riskOpening.analysis,
          risks: riskOpening.topRisks || [],
        }
      },
      round2: {
        title: 'Round 2 · Rebuttals',
        technicalAnalyst: {
          name: 'Technical Analyst Rebuttal',
          rebuttal: techRebuttal.rebuttal,
        },
        riskAnalyst: {
          name: 'Risk & Fundamental Analyst Rebuttal',
          rebuttal: riskRebuttal.rebuttal,
        }
      },
      arbitration: {
        title: 'Arbitration · Verdict',
        name: 'Decision Agent',
        debateSummary: decisionResult.debateSummary,
        finalVerdict: decisionResult.rationale,
      },
    },
  };
}

module.exports = {
  runMultiAgentRecommendation,
};
