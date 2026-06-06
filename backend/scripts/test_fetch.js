const path = require('path');
const config = require('../lib/config');

const { runFullAnalysis } = require('../lib/pipeline');

async function test() {
  console.log("Starting Full Analysis Pipeline Verification (with RBA CSV check)...\n");
  
  // Test CBA.AX in Mock Mode
  console.log("--- Testing CBA.AX Full Analysis (MOCK Mode) ---");
  const cbaResult = await runFullAnalysis({ ticker: 'CBA.AX', timeHorizon: 'MEDIUM', mode: 'mock' });
  console.log(`Ticker: ${cbaResult.ticker}`);
  console.log(`Data Source: ${cbaResult.marketIntelligence.dataSource}`);
  
  console.log("\nMacro Context:");
  console.log(JSON.stringify(cbaResult.marketIntelligence.marketData.macroContext, null, 2));

  console.log("\nScoring Signals:");
  console.log(JSON.stringify(cbaResult.tradeRecommendation.recommendation.signals, null, 2));
  
  console.log("\nMacro Anchors:");
  console.log(JSON.stringify(cbaResult.marketIntelligence.marketData.macroAnchors, null, 2));

  // Test CBA.AX in Live Mode (expected to throw under sandboxed environment)
  console.log("\n--- Testing CBA.AX Full Analysis (LIVE Mode) ---");
  try {
    await runFullAnalysis({ ticker: 'CBA.AX', timeHorizon: 'MEDIUM', mode: 'live' });
    console.log("Live Mode fetched successfully!");
  } catch (err) {
    console.log(`Live Mode failed as expected: ${err.message}`);
  }
}

test().catch(console.error);
