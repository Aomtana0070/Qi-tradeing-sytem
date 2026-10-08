/**
 * RSI STRATEGY
 * Generates BUY/PUT/WAIT signals based on Relative Strength Index
 * RSI < 30 (oversold) → potential BUY
 * RSI > 70 (overbought) → potential SELL/PUT
 */

const config = require('../config');

module.exports = {
  name: 'RSI_STRATEGY',

  /**
   * Analyze candles and generate RSI signal
   * @param {array} closePrices - array of close prices
   * @param {object} rsiData - pre-calculated RSI data from indicators
   * @returns {object} {signal: 'CALL'|'PUT'|'WAIT', confidence: 0-100, reason: string}
   */
  analyze(closePrices, rsiData) {
    if (!rsiData) {
      return {
        signal: 'WAIT',
        confidence: 0,
        reason: 'Insufficient data for RSI calculation',
      };
    }

    const { value, signal: rsiSignal, strength } = rsiData;

    /**
     * RSI Logic:
     * - RSI < 30 (Oversold) = Potential reversal UP = CALL (bullish)
     * - RSI > 70 (Overbought) = Potential reversal DOWN = PUT (bearish)
     * - 30-70 = Neutral zone = WAIT
     */

    if (rsiSignal === 'BUY_STRONG') {
      // Strong oversold → strong buySignal
      return {
        signal: 'CALL',
        confidence: Math.min(100, strength + 20), // boost confidence
        reason: `RSI ${value.toFixed(2)} < ${config.RSI_OVERSOLD} (Strong Oversold)`,
      };
    } else if (rsiSignal === 'BUY_WEAK') {
      return {
        signal: 'CALL',
        confidence: strength,
        reason: `RSI ${value.toFixed(2)} near Oversold (${config.RSI_OVERSOLD})`,
      };
    } else if (rsiSignal === 'SELL_STRONG') {
      return {
        signal: 'PUT',
        confidence: Math.min(100, strength + 20), // boost confidence
        reason: `RSI ${value.toFixed(2)} > ${config.RSI_OVERBOUGHT} (Strong Overbought)`,
      };
    } else if (rsiSignal === 'SELL_WEAK') {
      return {
        signal: 'PUT',
        confidence: strength,
        reason: `RSI ${value.toFixed(2)} near Overbought (${config.RSI_OVERBOUGHT})`,
      };
    } else {
      return {
        signal: 'WAIT',
        confidence: strength,
        reason: `RSI ${value.toFixed(2)} in neutral zone`,
      };
    }
  },
};
