const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');

const { runMarketIntelligence } = require('./lib/skills/market-intelligence');
const { runEdaVisualAnalysis } = require('./lib/skills/eda-visual-analysis');
const { runTradeRecommendation } = require('./lib/skills/trade-recommendation');
const { runFullAnalysis } = require('./lib/pipeline');

const server = new McpServer({
  name: 'quantbot',
  version: '1.0.0',
});

function asToolResult(payload) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

function asToolError(error) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ error: error.message }, null, 2),
      },
    ],
    isError: true,
  };
}

server.tool(
  'market_intelligence',
  'Collect price trends, sentiment, analyst consensus, and market context for a stock ticker.',
  {
    ticker: z.string().describe('Stock ticker symbol, for example AAPL or NVDA.'),
  },
  async ({ ticker }) => {
    try {
      return asToolResult(await runMarketIntelligence({ ticker }));
    } catch (error) {
      return asToolError(error);
    }
  }
);

server.tool(
  'eda_visual_analysis',
  'Generate chart-ready exploratory analysis from market intelligence output.',
  {
    marketData: z.object({}).passthrough().describe('The marketData object returned by market_intelligence.'),
  },
  async ({ marketData }) => {
    try {
      return asToolResult(await runEdaVisualAnalysis({ marketData }));
    } catch (error) {
      return asToolError(error);
    }
  }
);

server.tool(
  'trade_recommendation',
  'Score market signals and return a buy, hold, or sell recommendation.',
  {
    marketData: z.object({}).passthrough().describe('The marketData object returned by market_intelligence.'),
    edaInsights: z.object({}).passthrough().optional().describe('Optional edaInsights object returned by eda_visual_analysis.'),
  },
  async ({ marketData, edaInsights }) => {
    try {
      return asToolResult(await runTradeRecommendation({ marketData, edaInsights }));
    } catch (error) {
      return asToolError(error);
    }
  }
);

server.tool(
  'full_stock_analysis',
  'Run the full QuantBot pipeline: market intelligence, EDA, and trade recommendation.',
  {
    ticker: z.string().describe('Stock ticker symbol, for example AAPL or NVDA.'),
  },
  async ({ ticker }) => {
    try {
      return asToolResult(await runFullAnalysis({ ticker }));
    } catch (error) {
      return asToolError(error);
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write('QuantBot MCP server ready on stdio\n');
}

main().catch((error) => {
  process.stderr.write(`QuantBot MCP server failed: ${error.stack || error.message}\n`);
  process.exit(1);
});
