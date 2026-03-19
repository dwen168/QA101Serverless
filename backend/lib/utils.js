function parseJsonResponse(rawText, fallbackValue) {
  const source = String(rawText || '').trim();
  if (!source) return fallbackValue;

  const tryParse = (value) => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  try {
    const cleaned = source.replace(/```json|```/gi, '').trim();
    const direct = tryParse(cleaned);
    if (direct !== null) return direct;

    const objectStart = cleaned.indexOf('{');
    const objectEnd = cleaned.lastIndexOf('}');
    if (objectStart !== -1 && objectEnd > objectStart) {
      const objectJson = cleaned.slice(objectStart, objectEnd + 1);
      const objectParsed = tryParse(objectJson);
      if (objectParsed !== null) return objectParsed;
    }

    const arrayStart = cleaned.indexOf('[');
    const arrayEnd = cleaned.lastIndexOf(']');
    if (arrayStart !== -1 && arrayEnd > arrayStart) {
      const arrayJson = cleaned.slice(arrayStart, arrayEnd + 1);
      const arrayParsed = tryParse(arrayJson);
      if (arrayParsed !== null) return arrayParsed;
    }

    return fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function normalizeTicker(ticker) {
  if (typeof ticker !== 'string') {
    throw new Error('ticker is required');
  }

  const cleanTicker = ticker.toUpperCase().trim();

  // Allow international tickers: US (1-5 letters), or exchange-suffixed (e.g. CBA.AX, 7203.T, HSBA.L)
  if (!/^[A-Z0-9]{1,6}(\.[A-Z]{1,3})?$/.test(cleanTicker)) {
    throw new Error('Invalid ticker format');
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
