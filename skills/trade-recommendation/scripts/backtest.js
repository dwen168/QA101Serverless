const { runBacktest } = require('../../backtesting/scripts');

/**
 * Wrapper to run the backtest using the trade-recommendation strategy.
 * Keeps the recommendation skill intact while exposing a dedicated backtest submodule.
 */
async function runRecommendationBacktest(params = {}, dependencies = {}) {
  const runParams = Object.assign({}, params, { strategyName: 'trade-recommendation' });
  return runBacktest(runParams, dependencies);
}

module.exports = {
  runRecommendationBacktest,
};
