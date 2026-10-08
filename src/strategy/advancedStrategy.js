/**
 * ADVANCED STRATEGY ENGINE
 * RSI + MACD + BB + Stochastic + EMA trend + patterns + S/R consensus
 */

const { RSI, MACD, BollingerBands, EMA, ADX, ATR, Stochastic } = require('technicalindicators');
const config = require('../config');
const logger = require('../logger/logger');

class AdvancedStrategy {
  analyze(candles, aggressiveMode = 'NORMAL') {
    if (!candles || candles.length < 30) {
      return {
        signal: 'WAIT',
        confidence: 0,
        reasons: ['Insufficient candles'],
      };
    }

    const closes = candles.map((c) => c.close);
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const current = closes[closes.length - 1];

    const rsi = this.getRSI(closes);
    const macd = this.getMACD(closes);
    const bb = this.getBB(closes);
    const ema20 = this.getEMA(closes, 20);
    const ema50 = this.getEMA(closes, config.EMA_FAST);
    const ema200 = this.getEMA(closes, config.EMA_SLOW);
    const stoch = this.getStochastic(highs, lows, closes);
    const atr = this.getATR(highs, lows, closes);
    const adx = this.getADX(highs, lows, closes);
    const pattern = this.detectPattern(candles.slice(-5));
    const sr = this.getSupportResistance(candles.slice(-50));
    const trend = this.getTrend(current, ema20, ema50, ema200);

    const signals = [];

    if (rsi !== null && rsi < config.RSI_OVERSOLD && trend !== 'STRONG_DOWN') {
      signals.push({ dir: 'CALL', score: 85, src: 'RSI_OVERSOLD' });
    } else if (rsi !== null && rsi > config.RSI_OVERBOUGHT && trend !== 'STRONG_UP') {
      signals.push({ dir: 'PUT', score: 85, src: 'RSI_OVERBOUGHT' });
    }

    if (macd && macd.histogram > 0 && macd.prevHistogram <= 0) {
      signals.push({ dir: 'CALL', score: 80, src: 'MACD_CROSS_UP' });
    } else if (macd && macd.histogram < 0 && macd.prevHistogram >= 0) {
      signals.push({ dir: 'PUT', score: 80, src: 'MACD_CROSS_DOWN' });
    }

    if (bb && current <= bb.lower && rsi !== null && rsi < 40) {
      signals.push({ dir: 'CALL', score: 75, src: 'BB_LOWER_TOUCH' });
    } else if (bb && current >= bb.upper && rsi !== null && rsi > 60) {
      signals.push({ dir: 'PUT', score: 75, src: 'BB_UPPER_TOUCH' });
    }

    if (stoch && stoch.k < 20 && stoch.d < 20 && stoch.k > stoch.d) {
      signals.push({ dir: 'CALL', score: 70, src: 'STOCH_OVERSOLD' });
    } else if (stoch && stoch.k > 80 && stoch.d > 80 && stoch.k < stoch.d) {
      signals.push({ dir: 'PUT', score: 70, src: 'STOCH_OVERBOUGHT' });
    }

    const trendAligned = (dir) =>
      (dir === 'CALL' && current > ema50) || (dir === 'PUT' && current < ema50);

    if (pattern && signals.length > 0) {
      const lastDir = signals[signals.length - 1].dir;
      if (pattern.signal === lastDir) {
        signals.push({ dir: lastDir, score: 70, src: `PATTERN_${pattern.name}` });
      }
    }

    const srBonus = this.getSRBonus(current, sr, signals);
    if (srBonus) signals.push(srBonus);

    const consensus = this.buildConsensus(signals, trend, trendAligned, adx, atr, current);

    const minConfidence = this.getMinConfidence(aggressiveMode);

    return {
      ...consensus,
      indicators: {
        rsi,
        macd,
        bb,
        ema20,
        ema50,
        ema200,
        stoch,
        atr,
        adx,
        trend,
        pattern: pattern?.name || null,
        sr,
        current,
      },
      minConfidence,
      timestamp: Date.now(),
    };
  }

  getMinConfidence(aggressiveMode) {
    const mode = String(aggressiveMode || 'NORMAL').toUpperCase();
    const map = {
      NORMAL: config.MIN_SIGNAL_STRENGTH || 65,
      AGGRESSIVE: Math.max(55, (config.MIN_SIGNAL_STRENGTH || 65) - 10),
      SUPER: Math.max(50, (config.MIN_SIGNAL_STRENGTH || 65) - 15),
      MEGA: Math.max(45, (config.MIN_SIGNAL_STRENGTH || 65) - 20),
    };
    return map[mode] || map.NORMAL;
  }

  buildConsensus(signals, trend, trendAligned, adx, atr, price) {
    if (signals.length === 0) {
      return { signal: 'WAIT', confidence: 0, reasons: ['No signals'] };
    }

    const callSignals = signals.filter((s) => s.dir === 'CALL');
    const putSignals = signals.filter((s) => s.dir === 'PUT');

    const dominant =
      callSignals.length >= putSignals.length
        ? { dir: 'CALL', signals: callSignals }
        : { dir: 'PUT', signals: putSignals };

    if (dominant.signals.length < config.MIN_STRATEGIES_AGREE) {
      return { signal: 'WAIT', confidence: 0, reasons: ['Not enough agreement'] };
    }

    if (!trendAligned(dominant.dir) && (trend === 'STRONG_UP' || trend === 'STRONG_DOWN')) {
      return { signal: 'WAIT', confidence: 0, reasons: ['Against strong trend'] };
    }

    let confidence =
      dominant.signals.reduce((sum, s) => sum + s.score, 0) / dominant.signals.length;

    if (adx && adx > 25) confidence = Math.min(100, confidence + 5);
    if (adx && adx < 15) confidence = Math.max(0, confidence - 10);

    const atrPct = atr ? (atr / price) * 100 : 0;
    if (atrPct > 0.02) confidence = Math.max(0, confidence - 10);
    if (atrPct < 0.003) confidence = Math.max(0, confidence - 15);

    const result = {
      signal: dominant.dir,
      confidence: Math.round(confidence),
      agreedSignals: dominant.signals.length,
      totalSignals: signals.length,
      trend,
      atrPct: atrPct.toFixed(4),
      reasons: dominant.signals.map((s) => s.src),
    };

    if (result.signal !== 'WAIT') {
      logger.debug(
        `🎯 ADVANCED: ${result.signal} (${result.confidence}% | ${result.agreedSignals} signals)`
      );
    }

    return result;
  }

  getRSI(closes, period = config.RSI_PERIOD) {
    if (closes.length < period + 1) return null;
    const result = RSI.calculate({ values: closes, period });
    return result[result.length - 1];
  }

  getMACD(closes) {
    if (closes.length < 26) return null;
    const result = MACD.calculate({
      values: closes,
      fastPeriod: config.MACD_FAST,
      slowPeriod: config.MACD_SLOW,
      signalPeriod: config.MACD_SIGNAL,
    });
    if (result.length < 2) return null;
    const last = result[result.length - 1];
    const prev = result[result.length - 2];
    return { ...last, prevHistogram: prev.histogram };
  }

  getBB(closes, period = config.BB_PERIOD) {
    if (closes.length < period) return null;
    const result = BollingerBands.calculate({
      values: closes,
      period,
      stdDev: config.BB_STD_DEV,
    });
    return result[result.length - 1];
  }

  getEMA(closes, period) {
    if (closes.length < period) return null;
    const result = EMA.calculate({ values: closes, period });
    return result[result.length - 1];
  }

  getStochastic(highs, lows, closes) {
    try {
      const result = Stochastic.calculate({
        high: highs,
        low: lows,
        close: closes,
        period: 14,
        signalPeriod: 3,
      });
      return result[result.length - 1];
    } catch {
      return null;
    }
  }

  getATR(highs, lows, closes, period = 14) {
    try {
      const result = ATR.calculate({ high: highs, low: lows, close: closes, period });
      return result[result.length - 1];
    } catch {
      return null;
    }
  }

  getADX(highs, lows, closes, period = 14) {
    try {
      const result = ADX.calculate({ high: highs, low: lows, close: closes, period });
      const last = result[result.length - 1];
      return last ? last.adx : null;
    } catch {
      return null;
    }
  }

  getTrend(price, ema20, ema50, ema200) {
    if (!ema50 || !ema200) return 'UNKNOWN';
    if (price > ema20 && ema20 > ema50 && ema50 > ema200) return 'STRONG_UP';
    if (price > ema50 && ema50 > ema200) return 'UP';
    if (price < ema20 && ema20 < ema50 && ema50 < ema200) return 'STRONG_DOWN';
    if (price < ema50 && ema50 < ema200) return 'DOWN';
    return 'SIDEWAYS';
  }

  detectPattern(candles5) {
    if (candles5.length < 2) return null;
    const prev = candles5[candles5.length - 2];
    const curr = candles5[candles5.length - 1];
    const currBody = Math.abs(curr.close - curr.open);

    if (
      prev.close < prev.open &&
      curr.close > curr.open &&
      curr.open < prev.close &&
      curr.close > prev.open
    ) {
      return { name: 'BULLISH_ENGULFING', signal: 'CALL' };
    }

    if (
      prev.close > prev.open &&
      curr.close < curr.open &&
      curr.open > prev.close &&
      curr.close < prev.open
    ) {
      return { name: 'BEARISH_ENGULFING', signal: 'PUT' };
    }

    const lowerShadow = Math.min(curr.open, curr.close) - curr.low;
    if (lowerShadow >= currBody * 2 && curr.close > curr.open) {
      return { name: 'HAMMER', signal: 'CALL' };
    }

    const upperShadow = curr.high - Math.max(curr.open, curr.close);
    if (upperShadow >= currBody * 2 && curr.close < curr.open) {
      return { name: 'SHOOTING_STAR', signal: 'PUT' };
    }

    return null;
  }

  getSupportResistance(candles50) {
    const highs = candles50.map((c) => c.high);
    const lows = candles50.map((c) => c.low);
    return {
      resistance: Math.max(...highs.slice(-20)),
      support: Math.min(...lows.slice(-20)),
    };
  }

  getSRBonus(price, sr, signals) {
    if (!sr || signals.length === 0) return null;
    const lastDir = signals[signals.length - 1].dir;
    const nearSupport = Math.abs(price - sr.support) / price < 0.001;
    const nearResistance = Math.abs(price - sr.resistance) / price < 0.001;
    if (nearSupport && lastDir === 'CALL') {
      return { dir: 'CALL', score: 75, src: 'NEAR_SUPPORT' };
    }
    if (nearResistance && lastDir === 'PUT') {
      return { dir: 'PUT', score: 75, src: 'NEAR_RESISTANCE' };
    }
    return null;
  }
}

module.exports = new AdvancedStrategy();
