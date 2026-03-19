const axios = require('axios');
const { AsyncLocalStorage } = require('async_hooks');
const config = require('./config');

const llmRequestContext = new AsyncLocalStorage();

function normalizeProvider(provider) {
  return provider === 'ollama' ? 'ollama' : 'deepseek';
}

function normalizeModel(model) {
  const trimmed = String(model || '').trim();
  return trimmed || null;
}

function runWithLlmContext(overrides, callback) {
  const provider = overrides?.provider ? normalizeProvider(String(overrides.provider).toLowerCase()) : null;
  const model = normalizeModel(overrides?.model);
  return llmRequestContext.run({ provider, model }, callback);
}

function getResolvedLlmConfig() {
  const context = llmRequestContext.getStore();
  const provider = context?.provider || normalizeProvider(config.llmProvider);
  const model = context?.model || (provider === 'ollama' ? config.ollamaModel : config.deepseekModel);
  return { provider, model };
}

function getActiveProvider() {
  return getResolvedLlmConfig().provider;
}

function getActiveModel(provider = getActiveProvider()) {
  const resolved = getResolvedLlmConfig();
  if (provider === resolved.provider) {
    return resolved.model;
  }
  return provider === 'ollama' ? config.ollamaModel : config.deepseekModel;
}

function getMessages(systemPrompt, userMessage, messages) {
  const systemMessage = { role: 'system', content: systemPrompt };

  if (Array.isArray(messages)) {
    return [systemMessage, ...messages.map((entry) => ({ role: entry.role, content: entry.content }))];
  }

  return [systemMessage, { role: 'user', content: userMessage }];
}

function formatProviderError(provider, error) {
  const detail = error.response?.data?.error?.message
    || error.response?.data?.message
    || error.code
    || error.message;

  if (error.code === 'ECONNABORTED') {
    return `${provider} request timed out after ${config.llmTimeoutMs}ms. You can retry or reduce prompt size.`;
  }

  if (provider === 'ollama' && error.code === 'ECONNREFUSED') {
    return 'Ollama is not reachable. Start Ollama and ensure OLLAMA_BASE_URL points to the running instance.';
  }

  return `${provider} request failed: ${detail}`;
}

async function callDeepSeekApi(messages, temperature, maxTokens, model) {
  if (!config.deepseekApiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }

  const response = await axios.post(
    `${config.deepseekBaseUrl}/chat/completions`,
    {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    },
    {
      headers: {
        Authorization: `Bearer ${config.deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: config.llmTimeoutMs,
    }
  );

  const content = response.data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('DeepSeek response did not include message content');
  }

  return content;
}

async function callOllamaApi(messages, temperature, maxTokens, model) {
  const response = await axios.post(
    `${config.ollamaBaseUrl}/api/chat`,
    {
      model,
      messages,
      stream: false,
      options: {
        temperature,
        num_predict: maxTokens,
      },
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: config.llmTimeoutMs,
    }
  );

  const content = response.data?.message?.content;
  if (!content) {
    throw new Error('Ollama response did not include message content');
  }

  return content;
}

async function callLlm({ systemPrompt, userMessage, messages, temperature = 0.3, maxTokens = 2000 }) {
  const { provider, model } = getResolvedLlmConfig();
  const resolvedMessages = getMessages(systemPrompt, userMessage, messages);

  try {
    if (provider === 'ollama') {
      return await callOllamaApi(resolvedMessages, temperature, maxTokens, model);
    }

    return await callDeepSeekApi(resolvedMessages, temperature, maxTokens, model);
  } catch (error) {
    throw new Error(formatProviderError(provider, error));
  }
}

async function callDeepSeek(systemPrompt, userMessage, temperature = 0.3, maxTokens = 2000) {
  return callLlm({ systemPrompt, userMessage, temperature, maxTokens });
}

module.exports = {
  callLlm,
  callDeepSeek,
  getActiveProvider,
  getActiveModel,
  normalizeProvider,
  runWithLlmContext,
};
