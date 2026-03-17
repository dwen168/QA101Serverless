const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

module.exports = {
  port: Number(process.env.PORT || 3001),
  deepseekApiKey: process.env.DEEPSEEK_API_KEY,
  deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
  alphaVantageApiKey: process.env.ALPHA_VANTAGE_API_KEY || 'demo',
};
