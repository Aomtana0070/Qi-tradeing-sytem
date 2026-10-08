/**
 * Technical Indicators for Trading Bot
 * Calculates RSI, MACD, Bollinger Bands, and EMA
 */

const { RSI, MACD, BollingerBands, EMA } = require('technicalindicators');

/**
 * ຄຳນວນ RSI (Relative Strength Index)
 * @param {Array} closes - ราคาปิด
 * @param {Number} period - คาบการคำนวณ (default: 14)
 * @returns {Number} ค่า RSI
 */
function calculateRSI(closes, period = 14) {
  try {
    if (closes.length < period) {
      console.warn(`Not enough data for RSI calculation. Need ${period}, got ${closes.length}`);
      return null;
    }
    
    const rsi = RSI.calculate({
      values: closes,
      period: period
    });
    
    return rsi.length > 0 ? rsi[rsi.length - 1] : null;
  } catch (error) {
    console.error('Error calculating RSI:', error.message);
    return null;
  }
}

/**
 * ຄຳນວນ MACD (Moving Average Convergence Divergence)
 * @param {Array} closes - ราคาปิด
 * @returns {Object} { macd, signal, histogram }
 */
function calculateMACD(closes) {
  try {
    if (closes.length < 26) {
      console.warn('Not enough data for MACD calculation. Need 26+');
      return null;
    }
    
    const macd = MACD.calculate({
      values: closes,
      fastPeriod: parseInt(process.env.MACD_FAST) || 12,
      slowPeriod: parseInt(process.env.MACD_SLOW) || 26,
      signalPeriod: parseInt(process.env.MACD_SIGNAL) || 9
    });
    
    if (macd.length > 0) {
      const latest = macd[macd.length - 1];
      return {
        macd: latest.MACD,
        signal: latest.signal,
        histogram: latest.histogram
      };
    }
    return null;
  } catch (error) {
    console.error('Error calculating MACD:', error.message);
    return null;
  }
}

/**
 * ຄຳນວນ Bollinger Bands
 * @param {Array} closes - ราคาปิด
 * @param {Number} period - คาบการคำนวณ (default: 20)
 * @returns {Object} { upper, middle, lower }
 */
function calculateBollingerBands(closes, period = 20) {
  try {
    if (closes.length < period) {
      console.warn(`Not enough data for Bollinger Bands. Need ${period}`);
      return null;
    }
    
    const bb = BollingerBands.calculate({
      values: closes,
      period: period,
      stdDev: 2
    });
    
    if (bb.length > 0) {
      const latest = bb[bb.length - 1];
      return {
        upper: latest.upper,
        middle: latest.middle,
        lower: latest.lower
      };
    }
    return null;
  } catch (error) {
    console.error('Error calculating Bollinger Bands:', error.message);
    return null;
  }
}

/**
 * ຄຳນວນ EMA (Exponential Moving Average)
 * @param {Array} closes - ราคาปิด
 * @param {Number} period - คาบการคำนวณ
 * @returns {Number} ค่า EMA
 */
function calculateEMA(closes, period = 12) {
  try {
    if (closes.length < period) {
      console.warn(`Not enough data for EMA. Need ${period}`);
      return null;
    }
    
    const ema = EMA.calculate({
      values: closes,
      period: period
    });
    
    return ema.length > 0 ? ema[ema.length - 1] : null;
  } catch (error) {
    console.error('Error calculating EMA:', error.message);
    return null;
  }
}

/**
 * อ่านสัญญาณทั้งหมด
 */
function getAllSignals(closes) {
  return {
    rsi: calculateRSI(closes),
    macd: calculateMACD(closes),
    bollingerBands: calculateBollingerBands(closes),
    emaShort: calculateEMA(closes, parseInt(process.env.EMA_SHORT) || 12),
    emaLong: calculateEMA(closes, parseInt(process.env.EMA_LONG) || 26)
  };
}

module.exports = {
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateEMA,
  getAllSignals
};
