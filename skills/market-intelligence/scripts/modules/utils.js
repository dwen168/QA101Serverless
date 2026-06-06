const config = require('../../../../backend/lib/config');

const REAL_DATA_TIMEOUT_MS = config.realDataTimeoutMs;
const ENRICHMENT_TIMEOUT_MS = Math.min(5000, REAL_DATA_TIMEOUT_MS);

function safeNumber(value, fallback = 0) {
  if (value && typeof value === 'object' && 'raw' in value) {
    return safeNumber(value.raw, fallback);
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function safeString(value, fallback = '') {
  if (value && typeof value === 'object') {
    return String(value.fmt || value.raw || JSON.stringify(value));
  }
  return value != null ? String(value) : fallback;
}

function average(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function dedupeArticlesByTitle(articles) {
  const seen = new Set();
  return (articles || []).filter((article) => {
    const key = String(article?.title || '').trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function hoursAgoFromDate(value) {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 0;
  return Math.max(0, Math.round((Date.now() - timestamp) / 3600000));
}

function normalizeHostname(hostname) {
  return String(hostname || '').toLowerCase().replace(/^www\./, '').trim();
}

function hostnameToSourceLabel(hostname, fallbackSource = 'Unknown') {
  const host = normalizeHostname(hostname);
  if (!host) return fallbackSource;
  if (host.includes('fool.com')) return 'The Motley Fool';
  if (host.includes('reuters.com')) return 'Reuters';
  if (host.includes('bloomberg.com')) return 'Bloomberg';
  if (host.includes('wsj.com')) return 'WSJ';
  if (host.includes('cnbc.com')) return 'CNBC';
  if (host.includes('finance.yahoo.com') || host === 'yahoo.com' || host.endsWith('.yahoo.com')) return 'Yahoo Finance';
  if (host.includes('marketwatch.com')) return 'MarketWatch';
  return host;
}

async function resolveArticleSourceLabel(articleUrl, fallbackSource = 'Unknown') {
  const rawUrl = String(articleUrl || '').trim();
  if (!rawUrl) return fallbackSource;

  try {
    const urlObj = new URL(rawUrl);
    const host = normalizeHostname(urlObj.hostname);
    if (host && host !== 'finnhub.io' && host !== 'news.google.com') {
      return hostnameToSourceLabel(host, fallbackSource);
    }
  } catch {
    // ignore
  }

  // If it's a Finnhub or Google redirect, we just trust the fallbackSource 
  // rather than performing expensive network round-trips to resolve it.
  return fallbackSource;
}

function normalizeArticleKey(title) {
  return String(title || '').trim().toLowerCase();
}

function normalizeConfidence(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parseFloat(clamp(parsed, 0, 1).toFixed(2)) : null;
}

function sanitizeShortText(value, maxLength = 160) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

async function withTimeout(promise, timeoutMs, label = 'operation') {
  let timer = null;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function cleanCompanyName(name) {
  if (!name || typeof name !== 'string') return '';
  let clean = name.trim().toLowerCase();
  clean = clean.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');
  const suffixes = [
    'corporation', 'corp', 'incorporated', 'inc', 'company', 'co', 
    'limited', 'ltd', 'group', 'plc', 's a', 'sa', 'ag', 'gmbh', 
    'holding', 'holdings', 'trust', 'fund', 'etf'
  ];
  suffixes.forEach(suffix => {
    const regex = new RegExp(`\\b${suffix}\\b`, 'g');
    clean = clean.replace(regex, '');
  });
  clean = clean.replace(/\s+/g, ' ').trim();
  return clean;
}

function calculateTimeDecayedSentiment(articles, lambda = 0.2) {
  const news = Array.isArray(articles) ? articles.filter(Boolean) : [];
  if (news.length === 0) return 0;
  
  let weightedSum = 0;
  let weightTotal = 0;
  
  news.forEach(article => {
    const daysAgo = (safeNumber(article.hoursAgo, 0)) / 24;
    const weight = Math.exp(-lambda * daysAgo);
    weightedSum += (safeNumber(article.sentiment, 0)) * weight;
    weightTotal += weight;
    article.influenceWeight = parseFloat((weight * 100).toFixed(1));
  });
  
  return weightTotal > 0 
    ? parseFloat((weightedSum / weightTotal).toFixed(2)) 
    : 0;
}

module.exports = {
  REAL_DATA_TIMEOUT_MS,
  ENRICHMENT_TIMEOUT_MS,
  safeNumber,
  safeString,
  clamp,
  average,
  dedupeArticlesByTitle,
  hoursAgoFromDate,
  normalizeHostname,
  hostnameToSourceLabel,
  resolveArticleSourceLabel,
  normalizeArticleKey,
  normalizeConfidence,
  sanitizeShortText,
  withTimeout,
  cleanCompanyName,
  calculateTimeDecayedSentiment,
};
