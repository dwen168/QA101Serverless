function parseJsonResponse(rawText, fallbackValue) {
  try {
    const cleaned = String(rawText || '').replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return fallbackValue;
  }
}

function normalizeTicker(ticker) {
  if (typeof ticker !== 'string') {
    throw new Error('ticker is required');
  }

  const cleanTicker = ticker.toUpperCase().trim();

  if (!/^[A-Z]{1,5}$/.test(cleanTicker)) {
    throw new Error('ticker must be 1-5 uppercase letters');
  }

  return cleanTicker;
}

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${name} is required`);
  }
}

function computeMovingAverage(data, period) {
  return data.map((_, index) => {
    if (index < period - 1) {
      return null;
    }

    const window = data.slice(index - period + 1, index + 1);
    const average = window.reduce((sum, item) => sum + item, 0) / period;
    return parseFloat(average.toFixed(2));
  });
}

module.exports = {
  computeMovingAverage,
  normalizeTicker,
  parseJsonResponse,
  requireObject,
};
