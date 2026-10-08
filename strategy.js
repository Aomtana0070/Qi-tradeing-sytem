/**
 * Trading Strategy Logic
 * Determines BUY/SELL signals based on technical indicators
 */

const indicators = require('./indicators');

/**
 * วิเคราะห์ RSI Strategy
 * @param {Number} rsi - ค่า RSI
 * @returns {String} 'BUY' | 'SELL' | 'HOLD'
 */
function analyzeRSI(rsi) {
  if (!rsi) return 'HOLD';

  const overbought = parseInt(process.env.RSI_OVERBOUGHT) || 70;
  const oversold = parseInt(process.env.RSI_OVERSOLD) || 30;

  if (rsi > overbought) return 'SELL'; // Overbought signal
  if (rsi < oversold) return 'BUY'; // Oversold signal
  return 'HOLD';
}

/**
 * วิเคราะห์ MACD Strategy
 * @param {Object} macd - { macd, signal, histogram }
 * @returns {String} 'BUY' | 'SELL' | 'HOLD'
 */
function analyzeMACD(macd) {
  if (!macd) return 'HOLD';

  // MACD Crossover
  if (macd.histogram > 0 && macd.macd > macd.signal) return 'BUY';
  if (macd.histogram < 0 && macd.macd < macd.signal) return 'SELL';
  return 'HOLD';
}

/**
 * วิเคราะห์ Bollinger Bands Strategy
 * @param {Object} bb - { upper, middle, lower }
 * @param {Number} currentPrice - ราคาปัจจุบัน
 * @returns {String} 'BUY' | 'SELL' | 'HOLD'
 */
function analyzeBollingerBands(bb, currentPrice) {
  if (!bb) return 'HOLD';

  // Price touches lower band = BUY
  if (currentPrice <= bb.lower) return 'BUY';
  // Price touches upper band = SELL
  if (currentPrice >= bb.upper) return 'SELL';
  return 'HOLD';
}

/**
 * วิเคราะห์ EMA Crossover Strategy
 * @param {Number} emaShort - EMA สั้น
 * @param {Number} emaLong - EMA ยาว
 * @returns {String} 'BUY' | 'SELL' | 'HOLD'
 */
function analyzeEMACrossover(emaShort, emaLong) {
  if (!emaShort || !emaLong) return 'HOLD';

  if (emaShort > emaLong) return 'BUY'; // Golden Cross
  if (emaShort < emaLong) return 'SELL'; // Death Cross
  return 'HOLD';
}

/**
 * Composite Strategy - รวมทุก indicator
 * @param {Array} closes - ราคาปิด
 * @param {Number} currentPrice - ราคาปัจจุบัน
 * @returns {Object} { signal, confidence, indicators }
 */
function generateSignal(closes, currentPrice) {
  try {
    // ❌ ต้องการข้อมูลอย่างน้อย 30 candles
    if (!closes || closes.length < 30) {
      return { signal: 'HOLD', confidence: 0, reason: 'Not enough candles' };
    }

    const signals = indicators.getAllSignals(closes);

    // ❌ ถ้า indicator ใดคำนวณไม่ได้ → HOLD
    if (!signals.rsi || !signals.macd || !signals.bollingerBands) {
      return { signal: 'HOLD', confidence: 0, reason: 'Indicators not ready' };
    }

    const rsiSignal = analyzeRSI(signals.rsi);
    const macdSignal = analyzeMACD(signals.macd);
    const bbSignal = analyzeBollingerBands(signals.bollingerBands, currentPrice);
    const emaSignal = analyzeEMACrossover(signals.emaShort, signals.emaLong);

    let buyCount = 0,
      sellCount = 0;
    [rsiSignal, macdSignal, bbSignal, emaSignal].forEach((s) => {
      if (s === 'BUY') buyCount++;
      if (s === 'SELL') sellCount++;
    });

    // ✅ ต้องการ 3/4 เห็นด้วย (เพิ่มจาก 2 → 3)
    const MIN_AGREE = 3;
    // ✅ ต้องการ confidence ≥ 70% (เพิ่มจาก 50 → 70)
    const MIN_CONFIDENCE = 70;

    let finalSignal = 'HOLD';
    let confidence = 0;

    if (buyCount >= MIN_AGREE) {
      finalSignal = 'BUY';
      confidence = (buyCount / 4) * 100;
    } else if (sellCount >= MIN_AGREE) {
      finalSignal = 'SELL';
      confidence = (sellCount / 4) * 100;
    }

    // ✅ ถ้า confidence ไม่ถึง → HOLD
    if (confidence < MIN_CONFIDENCE) {
      finalSignal = 'HOLD';
    }

    // ✅ RSI filter: ห้ามเทรดตอน RSI อยู่กลาง 40-60
    if (finalSignal !== 'HOLD') {
      if (signals.rsi >= 40 && signals.rsi <= 60) {
        return { signal: 'HOLD', confidence: 0, reason: 'RSI in neutral zone (40-60)' };
      }
    }

    // ✅ Trend filter: ห้ามสวนเทรนด์
    if (finalSignal === 'BUY' && signals.emaShort < signals.emaLong)
      return { signal: 'HOLD', confidence: 0, reason: 'BUY signal against downtrend' };
    if (finalSignal === 'SELL' && signals.emaShort > signals.emaLong)
      return { signal: 'HOLD', confidence: 0, reason: 'SELL signal against uptrend' };

    return {
      signal: finalSignal,
      confidence: confidence.toFixed(2),
      reason: finalSignal !== 'HOLD' ? `${buyCount || sellCount}/4 agree` : 'No consensus',
      indicators: {
        rsi: { value: signals.rsi?.toFixed(2), signal: rsiSignal },
        macd: { signal: macdSignal },
        bollingerBands: { signal: bbSignal },
        ema: { signal: emaSignal },
      },
    };
  } catch (error) {
    console.error('Error generating signal:', error.message);
    return { signal: 'HOLD', confidence: 0, reason: error.message };
  }
}
/**
 * ตรวจสอบ Risk Management
 * @param {Number} currentPrice - ราคาปัจจุบัน
 * @param {Number} entryPrice - ราคาเข้าหนึ่ง
 * @returns {Boolean} true ถ้าผ่านตรวจสอบ
 */
function checkRiskManagement(currentPrice, entryPrice) {
  const stopLossPercent = parseFloat(process.env.STOP_LOSS_PERCENT) || 5;
  const maxLoss = (entryPrice * stopLossPercent) / 100;
  const loss = entryPrice - currentPrice;

  if (loss > maxLoss) {
    console.warn(`Stop Loss triggered! Loss: ${loss.toFixed(2)}`);
    return false;
  }
  return true;
}

module.exports = {
  analyzeRSI,
  analyzeMACD,
  analyzeBollingerBands,
  analyzeEMACrossover,
  generateSignal,
  checkRiskManagement,
};
