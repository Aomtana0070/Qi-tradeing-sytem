const config = require('../config');

class VolatilityFilter {
  // candles: [{open, high, low, close}]
  calculateATR(candles, period = 14) {
    if (!Array.isArray(candles) || candles.length < period + 1) return 0;
    const trs = [];
    for (let i = 1; i < candles.length; i++) {
      const prev = candles[i - 1];
      const cur = candles[i];
      const tr = Math.max(
        cur.high - cur.low,
        Math.abs(cur.high - prev.close),
        Math.abs(cur.low - prev.close)
      );
      trs.push(tr);
    }
    const slice = trs.slice(-period);
    const atr = slice.reduce((a, b) => a + b, 0) / slice.length;
    return atr;
  }

  getStatus(candles) {
    if (!candles || candles.length === 0) return { allowed: true, reason: 'no data' };

    // respect runtime toggle to disable volatility filtering
    if (config.VOLATILITY_FILTER_ENABLED === false) {
      return { allowed: true, reason: 'volatility filter disabled' };
    }
    const atr = this.calculateATR(candles, 14);
    const currentPrice = candles[candles.length - 1].close || 0;
    if (!currentPrice || currentPrice === 0) return { allowed: true, reason: 'no price' };
    const atrPct = atr / currentPrice; // fraction

    // use configurable thresholds from config with sensible defaults
    const minPct = config.VOLATILITY_MIN_ATR_PCT;
    const maxPct = config.VOLATILITY_MAX_ATR_PCT;
    const sizeThreshold = config.VOLATILITY_SIZE_MULTIPLIER_THRESHOLD;

    if (atrPct < minPct) return { allowed: false, reason: 'Market too quiet', atr, atrPct };
    if (atrPct > maxPct) return { allowed: false, reason: 'Market too volatile', atr, atrPct };

    const sizeMultiplier = atrPct > sizeThreshold ? 0.5 : 1.0;
    return { allowed: true, sizeMultiplier, atr, atrPct };
  }
}

module.exports = VolatilityFilter;
