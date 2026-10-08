/**
 * MACD STRATEGY
 * Generates BUY/PUT/WAIT signals based on MACD Crossover
 * MACD > Signal Line = Bullish = CALL
 * MACD < Signal Line = Bearish = PUT
 */

module.exports = {
  name: 'MACD_STRATEGY',

  /**
   * Analyze candles and generate MACD signal
   * @param {array} closePrices - array of close prices
   * @param {object} macdData - pre-calculated MACD data from indicators
   * @returns {object} {signal: 'CALL'|'PUT'|'WAIT', confidence: 0-100, reason: string}
   */
  analyze(closePrices, macdData) {
    if (!macdData) {
      return {
        signal: 'WAIT',
        confidence: 0,
        reason: 'Insufficient data for MACD calculation',
      };
    }

    const { macd, signal, histogram, crossover, strength } = macdData;

    /**
     * MACD Logic:
     * - Histogram > 0 && MACD > Signal = Bullish = CALL
     * - Histogram < 0 && MACD < Signal = Bearish = PUT
     * - Crossover events = strong signals
     * - Histogram converging = weakening signal
     */

    if (crossover === 'BULLISH') {
      // Golden Cross: MACD crosses above Signal Line
      return {
        signal: 'CALL',
        confidence: Math.min(100, strength + 30), // very strong signal
        reason: `MACD Golden Cross (${macd.toFixed(6)} > ${signal.toFixed(6)})`,
      };
    } else if (crossover === 'BEARISH') {
      // Death Cross: MACD crosses below Signal Line
      return {
        signal: 'PUT',
        confidence: Math.min(100, strength + 30), // very strong signal
        reason: `MACD Death Cross (${macd.toFixed(6)} < ${signal.toFixed(6)})`,
      };
    } else if (crossover === 'BULLISH_CONTINUATION') {
      // MACD above Signal, maintaining bullish momentum
      return {
        signal: 'CALL',
        confidence: Math.round(strength * 0.7),
        reason: `MACD Bullish Continuation (histogram: ${histogram.toFixed(6)})`,
      };
    } else if (crossover === 'BEARISH_CONTINUATION') {
      // MACD below Signal, maintaining bearish momentum
      return {
        signal: 'PUT',
        confidence: Math.round(strength * 0.7),
        reason: `MACD Bearish Continuation (histogram: ${histogram.toFixed(6)})`,
      };
    } else {
      return {
        signal: 'WAIT',
        confidence: strength,
        reason: 'MACD no clear crossover signal',
      };
    }
  },
};
