/**
 * BOLLINGER BANDS STRATEGY
 * Generates BUY/PUT/WAIT signals based on price position relative to bands
 * Price touches Lower Band = potential reversal up = CALL
 * Price touches Upper Band = potential reversal down = PUT
 */

module.exports = {
  name: 'BOLLINGER_BANDS_STRATEGY',

  /**
   * Analyze candles and generate Bollinger Bands signal
   * @param {array} closePrices - array of close prices
   * @param {object} bbData - pre-calculated Bollinger Bands data from indicators
   * @param {object} rsiData - RSI data for confirmation
   * @returns {object} {signal: 'CALL'|'PUT'|'WAIT', confidence: 0-100, reason: string}
   */
  analyze(closePrices, bbData, rsiData) {
    if (!bbData) {
      return {
        signal: 'WAIT',
        confidence: 0,
        reason: 'Insufficient data for Bollinger Bands calculation',
      };
    }

    const { upper, lower, position, squeeze, strength } = bbData;
    const currentPrice = closePrices[closePrices.length - 1];

    /**
     * Bollinger Bands Logic:
     * - Price at Lower Band = Oversold potential = CALL (mean reversion)
     * - Price at Upper Band = Overbought potential = PUT (mean reversion)
     * - Squeeze (narrow bands) = potential breakout coming
     * - Price inside bands = WAIT
     */

    if (position === 'BELOW_LOWER') {
      // Price touches lower band (oversold)
      // Confirm with RSI if available
      let confidence = strength + 20;

      if (rsiData && rsiData.signal === 'BUY_STRONG') {
        confidence = Math.min(100, confidence + 20); // RSI confirms
      }

      return {
        signal: 'CALL',
        confidence: confidence,
        reason: `Price ${currentPrice.toFixed(6)} at Lower Band ${lower.toFixed(6)} (Mean Reversion BUY)`,
      };
    } else if (position === 'ABOVE_UPPER') {
      // Price touches upper band (overbought)
      // Confirm with RSI if available
      let confidence = strength + 20;

      if (rsiData && rsiData.signal === 'SELL_STRONG') {
        confidence = Math.min(100, confidence + 20); // RSI confirms
      }

      return {
        signal: 'PUT',
        confidence: confidence,
        reason: `Price ${currentPrice.toFixed(6)} at Upper Band ${upper.toFixed(6)} (Mean Reversion SELL)`,
      };
    } else if (squeeze) {
      // Squeeze detected - bands are very tight
      // Indicates low volatility and potential breakout
      return {
        signal: 'WAIT',
        confidence: 60,
        reason: 'Bollinger Bands Squeeze - Low volatility. Breakout coming.',
      };
    } else if (position === 'BELOW_MIDDLE') {
      // Price below middle band = mild bearish
      return {
        signal: 'WAIT',
        confidence: 40,
        reason: 'Price below middle band (mild support level)',
      };
    } else if (position === 'ABOVE_MIDDLE') {
      // Price above middle band = mild bullish
      return {
        signal: 'WAIT',
        confidence: 40,
        reason: 'Price above middle band (mild resistance level)',
      };
    } else {
      return {
        signal: 'WAIT',
        confidence: 30,
        reason: 'Price inside Bollinger Bands - No signal',
      };
    }
  },
};
