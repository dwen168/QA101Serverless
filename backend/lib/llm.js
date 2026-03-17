const axios = require('axios');
const config = require('./config');

async function callDeepSeek(systemPrompt, userMessage, temperature = 0.3, maxTokens = 2000) {
  if (!config.deepseekApiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }

  const response = await axios.post(
    `${config.deepseekBaseUrl}/chat/completions`,
    {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature,
      max_tokens: maxTokens,
      stream: false,
    },
    {
      headers: {
        Authorization: `Bearer ${config.deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data.choices[0].message.content;
}

module.exports = {
  callDeepSeek,
};
