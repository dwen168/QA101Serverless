const fs = require('fs');
let src = fs.readFileSync('skills/trade-recommendation/scripts/index.js', 'utf8');
// Normalise to LF for replacements, will restore CRLF at the end
const hasCRLF = src.includes('\r\n');
if (hasCRLF) src = src.replace(/\r\n/g, '\n');

// 1. Update add() signature + add fmt helper
src = src.replace(
  `  const add = (name, points, reason) => {
    signals.push({ name, points, reason });
    score += points;
  };

  // Get dynamic weights from calibration file
  const w = (key) => getSignalWeight(key);`,
  `  const add = (name, points, reason, details = null) => {
    signals.push({ name, points, reason, details });
    score += points;
  };

  const w = (key) => getSignalWeight(key);
  const fmt = (n, dec = 2) => (n != null && !Number.isNaN(Number(n))) ? parseFloat(n).toFixed(dec) : '—';`
);

// 2. Trend MA50 details
src = src.replace(
  `  // Trend signals
  if (marketData.price > marketData.ma50) {
    add('Price > MA50', w('trend_ma50_bullish'), 'Bullish trend confirmation');
  } else {
    add('Price < MA50', w('trend_ma50_bearish'), 'Bearish trend - price below medium-term average');
  }

  if (marketData.price > marketData.ma200) {
    add('Price > MA200', w('trend_ma200_bullish'), 'Long-term uptrend intact');
  } else {
    add('Price < MA200', w('trend_ma200_bearish'), 'Long-term downtrend');
  }`,
  `  // Trend signals
  if (marketData.price > marketData.ma50) {
    const devMA50 = ((marketData.price / marketData.ma50 - 1) * 100).toFixed(2);
    add('Price > MA50', w('trend_ma50_bullish'), 'Bullish trend confirmation',
      { price: '$' + fmt(marketData.price), MA50: '$' + fmt(marketData.ma50), deviation: '+' + devMA50 + '%' });
  } else {
    const devMA50 = ((marketData.price / marketData.ma50 - 1) * 100).toFixed(2);
    add('Price < MA50', w('trend_ma50_bearish'), 'Bearish trend - price below medium-term average',
      { price: '$' + fmt(marketData.price), MA50: '$' + fmt(marketData.ma50), deviation: devMA50 + '%' });
  }

  if (marketData.price > marketData.ma200) {
    const devMA200 = ((marketData.price / marketData.ma200 - 1) * 100).toFixed(2);
    add('Price > MA200', w('trend_ma200_bullish'), 'Long-term uptrend intact',
      { price: '$' + fmt(marketData.price), MA200: '$' + fmt(marketData.ma200), deviation: '+' + devMA200 + '%' });
  } else {
    const devMA200 = ((marketData.price / marketData.ma200 - 1) * 100).toFixed(2);
    add('Price < MA200', w('trend_ma200_bearish'), 'Long-term downtrend',
      { price: '$' + fmt(marketData.price), MA200: '$' + fmt(marketData.ma200), deviation: devMA200 + '%' });
  }`
);

// 3. RSI signals details
src = src.replace(
  `  // RSI signals
  if (marketData.rsi > 70) {
    add('RSI Overbought', w('rsi_overbought'), \`RSI \${marketData.rsi} > 70 - overextended\`);
  } else if (marketData.rsi < 30) {
    add('RSI Oversold', w('rsi_oversold'), \`RSI \${marketData.rsi} < 30 - contrarian buy signal\`);
  } else if (marketData.rsi >= 45 && marketData.rsi <= 65) {
    add('RSI Healthy', w('rsi_healthy'), \`RSI \${marketData.rsi} in bullish healthy zone\`);
  }`,
  `  // RSI signals
  if (marketData.rsi > 70) {
    add('RSI Overbought', w('rsi_overbought'), \`RSI \${marketData.rsi} > 70 - overextended\`,
      { RSI: marketData.rsi, zone: 'Overbought (>70)' });
  } else if (marketData.rsi < 30) {
    add('RSI Oversold', w('rsi_oversold'), \`RSI \${marketData.rsi} < 30 - contrarian buy signal\`,
      { RSI: marketData.rsi, zone: 'Oversold (<30)' });
  } else if (marketData.rsi >= 45 && marketData.rsi <= 65) {
    add('RSI Healthy', w('rsi_healthy'), \`RSI \${marketData.rsi} in bullish healthy zone\`,
      { RSI: marketData.rsi, zone: 'Healthy (45–65)' });
  }`
);

// 4. Sentiment signals details
src = src.replace(
  `  // Sentiment signals
  if (marketData.sentimentScore > 0.3) {
    add('Positive Sentiment', w('sentiment_bullish'), \`Sentiment score \${marketData.sentimentScore} - bullish\`);
  } else if (marketData.sentimentScore < -0.3) {
    add('Negative Sentiment', w('sentiment_bearish'), \`Sentiment score \${marketData.sentimentScore} - bearish\`);
  }`,
  `  // Sentiment signals
  if (marketData.sentimentScore > 0.3) {
    add('Positive Sentiment', w('sentiment_bullish'), \`Sentiment score \${marketData.sentimentScore} - bullish\`,
      { score: marketData.sentimentScore, label: marketData.sentimentLabel, headlines: marketData.news?.length ?? 0 });
  } else if (marketData.sentimentScore < -0.3) {
    add('Negative Sentiment', w('sentiment_bearish'), \`Sentiment score \${marketData.sentimentScore} - bearish\`,
      { score: marketData.sentimentScore, label: marketData.sentimentLabel, headlines: marketData.news?.length ?? 0 });
  }`
);

// 5. Analyst signals details
src = src.replace(
  `  if (buyRatio > 0.6) {
    add('Strong Analyst Buy', w('analyst_strong_buy'), \`\${(buyRatio * 100).toFixed(0)}% analysts rate Buy/Strong Buy\`);
  } else if (buyRatio < 0.3) {
    add('Weak Analyst Support', w('analyst_weak_support'), \`Only \${(buyRatio * 100).toFixed(0)}% analysts rate Buy\`);
  }

  if (consensus.upside > 10) {
    add('Analyst Upside', w('analyst_upside'), \`\${consensus.upside}% upside to mean price target\`);
  } else if (consensus.upside < -5) {
    add('Downside Risk', w('analyst_downside'), \`Analysts see \${Math.abs(consensus.upside)}% downside\`);
  }`,
  `  if (buyRatio > 0.6) {
    add('Strong Analyst Buy', w('analyst_strong_buy'), \`\${(buyRatio * 100).toFixed(0)}% analysts rate Buy/Strong Buy\`,
      { buyPct: (buyRatio * 100).toFixed(0) + '%', targetMean: '$' + fmt(consensus.targetMean), upside: consensus.upside + '%', ratings: totalRatings });
  } else if (buyRatio < 0.3) {
    add('Weak Analyst Support', w('analyst_weak_support'), \`Only \${(buyRatio * 100).toFixed(0)}% analysts rate Buy\`,
      { buyPct: (buyRatio * 100).toFixed(0) + '%', targetMean: '$' + fmt(consensus.targetMean), upside: consensus.upside + '%', ratings: totalRatings });
  }

  if (consensus.upside > 10) {
    add('Analyst Upside', w('analyst_upside'), \`\${consensus.upside}% upside to mean price target\`,
      { upside: '+' + consensus.upside + '%', targetMean: '$' + fmt(consensus.targetMean), high: '$' + fmt(consensus.targetHigh), low: '$' + fmt(consensus.targetLow) });
  } else if (consensus.upside < -5) {
    add('Downside Risk', w('analyst_downside'), \`Analysts see \${Math.abs(consensus.upside)}% downside\`,
      { downside: consensus.upside + '%', targetMean: '$' + fmt(consensus.targetMean), high: '$' + fmt(consensus.targetHigh), low: '$' + fmt(consensus.targetLow) });
  }`
);

// 6. Momentum details
src = src.replace(
  `  // Daily momentum signals
  if (marketData.changePercent > 1.5) {
    add('Strong Daily Momentum', w('momentum_strong_up'), \`Up \${marketData.changePercent.toFixed(1)}% today\`);
  } else if (marketData.changePercent < -2) {
    add('Bearish Day', w('momentum_strong_down'), \`Down \${Math.abs(marketData.changePercent).toFixed(1)}% today\`);
  }`,
  `  // Daily momentum signals
  if (marketData.changePercent > 1.5) {
    add('Strong Daily Momentum', w('momentum_strong_up'), \`Up \${marketData.changePercent.toFixed(1)}% today\`,
      { change: '+' + fmt(marketData.changePercent) + '%', price: '$' + fmt(marketData.price), prevClose: '$' + fmt(marketData.prevClose) });
  } else if (marketData.changePercent < -2) {
    add('Bearish Day', w('momentum_strong_down'), \`Down \${Math.abs(marketData.changePercent).toFixed(1)}% today\`,
      { change: fmt(marketData.changePercent) + '%', price: '$' + fmt(marketData.price), prevClose: '$' + fmt(marketData.prevClose) });
  }`
);

// 7. MACD details
src = src.replace(
  `      if (ti.macd.signal === 'BULLISH') {
        add('MACD Bullish', w('macd_bullish'), \`MACD above signal line - momentum positive\`);
      } else if (ti.macd.signal === 'BEARISH') {
        add('MACD Bearish', w('macd_bearish'), \`MACD below signal line - momentum negative\`);
      }`,
  `      if (ti.macd.signal === 'BULLISH') {
        add('MACD Bullish', w('macd_bullish'), \`MACD above signal line - momentum positive\`,
          { MACD: fmt(ti.macd.macdLine, 4), signal: fmt(ti.macd.signalLine, 4), histogram: (ti.macd.histogram >= 0 ? '+' : '') + fmt(ti.macd.histogram, 4) });
      } else if (ti.macd.signal === 'BEARISH') {
        add('MACD Bearish', w('macd_bearish'), \`MACD below signal line - momentum negative\`,
          { MACD: fmt(ti.macd.macdLine, 4), signal: fmt(ti.macd.signalLine, 4), histogram: fmt(ti.macd.histogram, 4) });
      }`
);

// 8. Bollinger Bands details
src = src.replace(
  `      if (ti.bollingerBands.signal === 'OVERBOUGHT') {
        add('BB Overbought', w('bb_overbought'), \`Price at upper Bollinger Band - pullback risk\`);
      } else if (ti.bollingerBands.signal === 'OVERSOLD') {
        add('BB Oversold', w('bb_oversold'), \`Price at lower Bollinger Band - bounce opportunity\`);
      }`,
  `      const bb = ti.bollingerBands;
      const bbDetails = { upper: '$' + fmt(bb.upperBand), middle: '$' + fmt(bb.middleBand), lower: '$' + fmt(bb.lowerBand), '%B': fmt(bb.bbPosition, 3) };
      if (bb.signal === 'OVERBOUGHT') {
        add('BB Overbought', w('bb_overbought'), \`Price at upper Bollinger Band - pullback risk\`, bbDetails);
      } else if (bb.signal === 'OVERSOLD') {
        add('BB Oversold', w('bb_oversold'), \`Price at lower Bollinger Band - bounce opportunity\`, bbDetails);
      }`
);

// 9. KDJ details
src = src.replace(
  `      if (ti.kdj.signal === 'OVERSOLD') {
        add('KDJ Oversold', w('kdj_oversold'), \`KDJ < 20 - contrarian buy signal\`);
      } else if (ti.kdj.signal === 'OVERBOUGHT') {
        add('KDJ Overbought', w('kdj_overbought'), \`KDJ > 80 - potential pullback\`);
      }`,
  `      const kdjDetails = { K: fmt(ti.kdj.k, 1), D: fmt(ti.kdj.d, 1), J: fmt(ti.kdj.j, 1) };
      if (ti.kdj.signal === 'OVERSOLD') {
        add('KDJ Oversold', w('kdj_oversold'), \`KDJ < 20 - contrarian buy signal\`, kdjDetails);
      } else if (ti.kdj.signal === 'OVERBOUGHT') {
        add('KDJ Overbought', w('kdj_overbought'), \`KDJ > 80 - potential pullback\`, kdjDetails);
      }`
);

// 10. OBV details
src = src.replace(
  `      if (ti.obv.signal === 'BULLISH') {
        add('OBV Rising', w('obv_bullish'), \`OBV trends higher - volume confirms uptrend\`);
      } else if (ti.obv.signal === 'BEARISH') {
        add('OBV Falling', w('obv_bearish'), \`OBV trends lower - volume confirms downtrend\`);
      }`,
  `      const obvDetails = { OBV: Number(ti.obv.obv).toLocaleString('en-US'), trend: ti.obv.obvTrend, vsMA14: ti.obv.obv > ti.obv.obvMA14 ? 'Above OBV-MA14' : 'Below OBV-MA14' };
      if (ti.obv.signal === 'BULLISH') {
        add('OBV Rising', w('obv_bullish'), \`OBV trends higher - volume confirms uptrend\`, obvDetails);
      } else if (ti.obv.signal === 'BEARISH') {
        add('OBV Falling', w('obv_bearish'), \`OBV trends lower - volume confirms downtrend\`, obvDetails);
      }`
);

// 11. VWAP details
src = src.replace(
  `      if (ti.vwap.signal === 'ABOVE_VWAP') {
        add('Price > VWAP', w('vwap_above'), \`Price above VWAP - bullish positioning\`);
      } else if (ti.vwap.signal === 'BELOW_VWAP') {
        add('Price < VWAP', w('vwap_below'), \`Price below VWAP - bearish positioning\`);
      }`,
  `      const vdev = ti.vwap.priceDiffPercent;
      const vwapDetails = { price: '$' + fmt(marketData.price), VWAP: '$' + fmt(ti.vwap.vwap), deviation: (vdev >= 0 ? '+' : '') + fmt(vdev) + '%' };
      if (ti.vwap.signal === 'ABOVE_VWAP') {
        add('Price > VWAP', w('vwap_above'), \`Price above VWAP - bullish positioning\`, vwapDetails);
      } else if (ti.vwap.signal === 'BELOW_VWAP') {
        add('Price < VWAP', w('vwap_below'), \`Price below VWAP - bearish positioning\`, vwapDetails);
      }`
);

if (hasCRLF) src = src.replace(/\n/g, '\r\n');
fs.writeFileSync('skills/trade-recommendation/scripts/index.js', src);

// Verify

// Verify
const result = fs.readFileSync('skills/trade-recommendation/scripts/index.js', 'utf8');
const checks = [
  ['fmt helper', result.includes('const fmt = ')],
  ['MA50 details', result.includes("deviation: '+' + devMA50")],
  ['MA200 details', result.includes("deviation: '+' + devMA200")],
  ['RSI details', result.includes("zone: 'Overbought (>70)'")],
  ['Sentiment details', result.includes('headlines: marketData.news?.length')],
  ['Analyst details', result.includes('ratings: totalRatings')],
  ['MACD details', result.includes('MACD: fmt(ti.macd.macdLine')],
  ['BB details', result.includes('bbDetails')],
  ['KDJ details', result.includes('kdjDetails')],
  ['OBV details', result.includes('obvDetails')],
  ['VWAP details', result.includes('vwapDetails')],
];
checks.forEach(([label, ok]) => console.log(ok ? `✓ ${label}` : `✗ ${label}`));
