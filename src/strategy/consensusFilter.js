/**
 * CONSENSUS FILTER
 * Master strategy coordinator
 * Only trades when multiple strategies agree
 * Prevents false signals and improves win rate
 */

const rsiStrategy = require('./rsiStrategy');
const macdStrategy = require('./macdStrategy');
const bollingerStrategy = require('./bollingerStrategy');
const config = require('../config');
const logger = require('../logger/logger');

class ConsensusFilter {
  /**
   * Analyze all strategies and generate consensus signal
   * @param {array} closePrices - array of close prices
   * @param {object} indicators - {rsi, macd, bollingerBands, trend}
   * @returns {object} {signal: 'CALL'|'PUT'|'WAIT', confidence, agreedStrategies, reasons}
   */
  static analyze(closePrices, indicators, aggressiveMode = 'NORMAL') {
    const mode =
      typeof aggressiveMode === 'string'
        ? aggressiveMode.toUpperCase()
        : aggressiveMode
          ? 'AGGRESSIVE'
          : 'NORMAL';
    const minRequiredCandles = Math.max(config.MIN_CANDLES_FOR_ANALYSIS, config.RSI_PERIOD + 1);
    if (!closePrices || closePrices.length < minRequiredCandles || !indicators) {
      return {
        signal: 'WAIT',
        confidence: 0,
        agreedStrategies: 0,
        totalStrategies: 3,
        reasons: ['Insufficient data or indicators not calculated'],
      };
    }

    // Get individual strategy signals
    const rsiSignal = rsiStrategy.analyze(closePrices, indicators.rsi);
    const macdSignal = macdStrategy.analyze(closePrices, indicators.macd);
    const bbSignal = bollingerStrategy.analyze(
      closePrices,
      indicators.bollingerBands,
      indicators.rsi
    );

    logger.debug('📊 Strategy Signals:', {
      RSI: `${rsiSignal.signal} (${rsiSignal.confidence}%)`,
      MACD: `${macdSignal.signal} (${macdSignal.confidence}%)`,
      Bollinger: `${bbSignal.signal} (${bbSignal.confidence}%)`,
    });

    // Count agreements
    const callVotes = [
      rsiSignal.signal === 'CALL' ? rsiSignal.confidence : 0,
      macdSignal.signal === 'CALL' ? macdSignal.confidence : 0,
      bbSignal.signal === 'CALL' ? bbSignal.confidence : 0,
    ].filter((c) => c > 0);

    const putVotes = [
      rsiSignal.signal === 'PUT' ? rsiSignal.confidence : 0,
      macdSignal.signal === 'PUT' ? macdSignal.confidence : 0,
      bbSignal.signal === 'PUT' ? bbSignal.confidence : 0,
    ].filter((c) => c > 0);

    // Determine consensus
    let finalSignal = 'WAIT';
    let confidence = 0;
    let agreedStrategies = 0;
    const reasons = [];

    const callCount = callVotes.length;
    const putCount = putVotes.length;
    const callSum = callVotes.reduce((a, b) => a + b, 0);
    const putSum = putVotes.reduce((a, b) => a + b, 0);

    const thresholds = {
      NORMAL: {
        minStrategies: config.MIN_STRATEGIES_AGREE,
        minConfidence: config.MIN_SIGNAL_STRENGTH,
      },
      AGGRESSIVE: {
        minStrategies: 1,
        minConfidence: Math.max(55, config.MIN_SIGNAL_STRENGTH - 15),
      },
      SUPER: {
        minStrategies: 1,
        minConfidence: Math.max(50, config.MIN_SIGNAL_STRENGTH - 25),
      },
      MEGA: {
        minStrategies: 1,
        minConfidence: Math.max(45, config.MIN_SIGNAL_STRENGTH - 35),
      },
    };

    const settings = thresholds[mode] || thresholds.NORMAL;
    const minStrategies = settings.minStrategies;
    const minConfidence = settings.minConfidence;

    if (callCount >= minStrategies && callSum > putSum) {
      finalSignal = 'CALL';
      confidence = Math.round(callSum / callCount);
      agreedStrategies = callCount;
      reasons.push(rsiSignal.reason, macdSignal.reason, bbSignal.reason);
    } else if (putCount >= minStrategies && putSum > callSum) {
      finalSignal = 'PUT';
      confidence = Math.round(putSum / putCount);
      agreedStrategies = putCount;
      reasons.push(rsiSignal.reason, macdSignal.reason, bbSignal.reason);
    } else {
      finalSignal = 'WAIT';
      confidence = Math.max(
        Math.round(callSum / Math.max(1, callCount)),
        Math.round(putSum / Math.max(1, putCount))
      );
      reasons.push(
        `Call votes: ${callCount}/${minStrategies}`,
        `Put votes: ${putCount}/${minStrategies}`
      );
    }

    // Filter by minimum signal strength
    if (finalSignal !== 'WAIT' && confidence < minConfidence) {
      logger.debug(`⚠️  Signal confidence (${confidence}%) below minimum (${minConfidence}%)`);
      finalSignal = 'WAIT';
    }

    const result = {
      signal: finalSignal,
      confidence: confidence,
      agreedStrategies: agreedStrategies,
      totalStrategies: 3,
      reasons: reasons,
      timestamp: Date.now(),
    };

    // Log result
    if (finalSignal !== 'WAIT') {
      logger.info(
        `🎯 CONSENSUS: ${finalSignal} (${confidence}% confidence, ${agreedStrategies}/3 strategies agree)`
      );
    }

    return result;
  }

  /**
   * Get strategy details for reporting
   */
  static getStrategyDetails(rsiSignal, macdSignal, bbSignal) {
    return {
      RSI: rsiSignal,
      MACD: macdSignal,
      BollingerBands: bbSignal,
    };
  }
}

module.exports = ConsensusFilter;
