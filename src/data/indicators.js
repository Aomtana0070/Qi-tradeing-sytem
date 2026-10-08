/**
 * TECHNICAL INDICATORS ENGINE
 * Calculates RSI, MACD, Bollinger Bands, EMA, trend detection
 * All calculations validated with minimum data requirements
 */

const { RSI, MACD, BollingerBands, EMA } = require('technicalindicators');
const config = require('../config');
const logger = require('../logger/logger');

/**
 * Calculate RSI (Relative Strength Index)
 * @param {array} closes - close prices
 * @param {number} period - RSI period (default 14)
 * @returns {object} {value, signal, strength}
 */
function calculateRSI(closes, period = config.RSI_PERIOD) {
  try {
    if (!closes || closes.length < period + 1) {
      return null;
    }

    const rsi = RSI.calculate({
      values: closes,
      period: period,
    });

    if (!rsi || rsi.length === 0) return null;

    const rsiValue = rsi[rsi.length - 1];

    let signal = 'NEUTRAL';
    let strength = 50;

    if (rsiValue < config.RSI_OVERSOLD) {
      signal = 'BUY_STRONG';
      strength = Math.round(100 - (rsiValue / config.RSI_OVERSOLD) * 100);
    } else if (rsiValue > config.RSI_OVERBOUGHT) {
      signal = 'SELL_STRONG';
      strength = Math.round(
        ((rsiValue - config.RSI_OVERBOUGHT) / (100 - config.RSI_OVERBOUGHT)) * 100
      );
    } else if (rsiValue < config.RSI_OVERSOLD + 10) {
      signal = 'BUY_WEAK';
      strength = 60;
    } else if (rsiValue > config.RSI_OVERBOUGHT - 10) {
      signal = 'SELL_WEAK';
      strength = 60;
    }

    return {
      value: parseFloat(rsiValue.toFixed(2)),
      signal,
      strength: Math.min(100, Math.max(0, strength)),
    };
  } catch (error) {
    logger.debug('Error calculating RSI', error.message);
    return null;
  }
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 * @param {array} closes - close prices
 * @returns {object} {macd, signal, histogram, crossover}
 */
function calculateMACD(closes) {
  try {
    if (!closes || closes.length < config.MACD_SLOW + 10) {
      return null;
    }

    const macd = MACD.calculate({
      values: closes,
      fastPeriod: config.MACD_FAST,
      slowPeriod: config.MACD_SLOW,
      signalPeriod: config.MACD_SIGNAL,
    });

    if (!macd || macd.length < 2) return null;

    const current = macd[macd.length - 1];
    const previous = macd[macd.length - 2];

    let crossover = 'NONE';
    let strength = 50;

    // Detect crossover
    if (current.MACD > current.signal && previous.MACD <= previous.signal) {
      crossover = 'BULLISH';
      strength = Math.min(100, Math.abs(current.histogram) * 50);
    } else if (current.MACD < current.signal && previous.MACD >= previous.signal) {
      crossover = 'BEARISH';
      strength = Math.min(100, Math.abs(current.histogram) * 50);
    } else if (current.MACD > current.signal) {
      crossover = 'BULLISH_CONTINUATION';
      strength = Math.min(100, Math.abs(current.histogram) * 25);
    } else if (current.MACD < current.signal) {
      crossover = 'BEARISH_CONTINUATION';
      strength = Math.min(100, Math.abs(current.histogram) * 25);
    }

    return {
      macd: parseFloat(current.MACD.toFixed(6)),
      signal: parseFloat(current.signal.toFixed(6)),
      histogram: parseFloat(current.histogram.toFixed(6)),
      crossover,
      strength: Math.round(strength),
    };
  } catch (error) {
    logger.debug('Error calculating MACD', error.message);
    return null;
  }
}

/**
 * Calculate Bollinger Bands
 * @param {array} closes - close prices
 * @param {number} period - period (default 20)
 * @param {number} stdDev - standard deviations (default 2)
 * @returns {object} {upper, middle, lower, position, squeeze}
 */
function calculateBollingerBands(closes, period = config.BB_PERIOD, stdDev = config.BB_STD_DEV) {
  try {
    if (!closes || closes.length < period) {
      return null;
    }

    const bb = BollingerBands.calculate({
      values: closes,
      period: period,
      stdDev: stdDev,
    });

    if (!bb || bb.length === 0) return null;

    const current = bb[bb.length - 1];
    const currentPrice = closes[closes.length - 1];

    let position = 'INSIDE';
    let strength = 50;

    if (currentPrice >= current.upper) {
      position = 'ABOVE_UPPER';
      strength = 80;
    } else if (currentPrice <= current.lower) {
      position = 'BELOW_LOWER';
      strength = 80;
    } else if (currentPrice > current.middle) {
      position = 'ABOVE_MIDDLE';
      strength = 60;
    } else if (currentPrice < current.middle) {
      position = 'BELOW_MIDDLE';
      strength = 60;
    }

    const bandwidth = current.upper - current.lower;
    const squeeze = bandwidth < current.middle * 0.02; // squeeze if bandwidth < 2% of middle

    return {
      upper: parseFloat(current.upper.toFixed(6)),
      middle: parseFloat(current.middle.toFixed(6)),
      lower: parseFloat(current.lower.toFixed(6)),
      position,
      squeeze,
      strength: Math.round(strength),
    };
  } catch (error) {
    logger.debug('Error calculating Bollinger Bands', error.message);
    return null;
  }
}

/**
 * Calculate EMA (Exponential Moving Average)
 * @param {array} closes - close prices
 * @param {number} period - period
 * @returns {number} EMA value
 */
function calculateEMA(closes, period) {
  try {
    if (!closes || closes.length < period) {
      return null;
    }

    const ema = EMA.calculate({
      values: closes,
      period: period,
    });

    if (!ema || ema.length === 0) return null;
    return parseFloat(ema[ema.length - 1].toFixed(6));
  } catch (error) {
    logger.debug('Error calculating EMA', error.message);
    return null;
  }
}

/**
 * Detect overall trend
 * @param {array} closes - close prices
 * @param {number} fastPeriod - fast EMA (default 50)
 * @param {number} slowPeriod - slow EMA (default 200)
 * @returns {object} {trend, strength}
 */
function detectTrend(closes, fastPeriod = config.EMA_FAST, slowPeriod = config.EMA_SLOW) {
  try {
    if (!closes || closes.length < slowPeriod + 10) {
      return { trend: 'UNKNOWN', strength: 0 };
    }

    const emaFast = calculateEMA(closes, fastPeriod);
    const emaSlow = calculateEMA(closes, slowPeriod);

    if (!emaFast || !emaSlow) {
      return { trend: 'UNKNOWN', strength: 0 };
    }

    const currentPrice = closes[closes.length - 1];
    let trend = 'SIDEWAYS';
    let strength = 50;

    if (emaFast > emaSlow) {
      if (currentPrice > emaFast) {
        trend = 'STRONG_UPTREND';
        strength = 90;
      } else if (currentPrice > emaSlow) {
        trend = 'UPTREND';
        strength = 70;
      } else {
        trend = 'WEAK_UPTREND';
        strength = 50;
      }
    } else if (emaFast < emaSlow) {
      if (currentPrice < emaFast) {
        trend = 'STRONG_DOWNTREND';
        strength = 90;
      } else if (currentPrice < emaSlow) {
        trend = 'DOWNTREND';
        strength = 70;
      } else {
        trend = 'WEAK_DOWNTREND';
        strength = 50;
      }
    }

    return {
      trend,
      strength,
      emaFast: emaFast,
      emaSlow: emaSlow,
      currentPrice: parseFloat(currentPrice.toFixed(6)),
    };
  } catch (error) {
    logger.debug('Error detecting trend', error.message);
    return { trend: 'UNKNOWN', strength: 0 };
  }
}

/**
 * Return the minimum number of candles needed for any indicator calculation.
 * RSI needs period + 1, Bollinger Bands needs BB period, MACD needs slow + signal + 1.
 */
function getMinimumIndicatorCandles() {
  return Math.max(
    config.RSI_PERIOD + 1,
    config.BB_PERIOD,
    config.MACD_SLOW + config.MACD_SIGNAL + 1
  );
}

/**
 * Calculate all indicators at once
 * @param {array} closes - close prices
 * @returns {object} all indicator values
 */
function calculateAll(closes) {
  if (!closes || closes.length < config.RSI_PERIOD + 1) {
    return null;
  }

  return {
    rsi: calculateRSI(closes),
    macd: calculateMACD(closes),
    bollingerBands: calculateBollingerBands(closes),
    trend: detectTrend(closes),
    timestamp: Date.now(),
    minRequiredCandles: getMinimumIndicatorCandles(),
  };
}

module.exports = {
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateEMA,
  detectTrend,
  calculateAll,
};
