/**
 * CANDLE STORE
 * Maintains a rolling buffer of candlestick data for strategy analysis
 * Automatically manages data size and provides OHLCV data
 */

const config = require('../config');
const logger = require('../logger/logger');

class CandleStore {
  constructor() {
    this.candles = [];
    this.maxSize = config.CANDLE_BUFFER_SIZE;
    this.lastCandle = null;
    this.lastCandleKey = null;
    this.isReady = false;
  }

  /**
   * Stable key for one candle period (prevents duplicate processing on every tick).
   */
  getCandleKey(candle) {
    if (candle.candleId != null) return String(candle.candleId);
    const ts = candle.timestamp || Date.now();
    const periodMs = Math.max(1000, (config.CANDLE_DURATION || 60) * 1000);
    return String(Math.floor(ts / periodMs));
  }

  /**
   * Add or update candle. Returns true only when a NEW closed candle was appended.
   * @param {object} candle - {timestamp, open, high, low, close, volume, candleId?}
   * @returns {boolean}
   */
  addCandle(candle) {
    if (!candle || !candle.close) {
      logger.warn('Invalid candle data received');
      return false;
    }

    const open = Number(candle.open);
    const high = Number(candle.high);
    const low = Number(candle.low);
    const close = Number(candle.close);
    const volume = Number(candle.volume) || 0;

    if (!Number.isFinite(close)) {
      logger.warn('Invalid candle close price received', { close: candle.close });
      return false;
    }

    const key = this.getCandleKey(candle);
    const row = {
      timestamp: candle.timestamp || Date.now(),
      open: Number.isFinite(open) ? open : close,
      high: Number.isFinite(high) ? high : close,
      low: Number.isFinite(low) ? low : close,
      close,
      volume,
      candleId: candle.candleId,
    };

    // Same period: update in place (live tick) — do not re-run strategy
    if (this.lastCandleKey === key && this.candles.length > 0) {
      const idx = this.candles.length - 1;
      this.candles[idx] = { ...this.candles[idx], ...row };
      this.lastCandle = this.candles[idx];
      return false;
    }

    this.lastCandleKey = key;
    this.candles.push(row);

    if (this.candles.length > this.maxSize) {
      this.candles.shift();
    }

    this.lastCandle = this.candles[this.candles.length - 1];

    // Mark as ready once we have enough data for the first indicator to calculate
    const minRequiredCandles = Math.max(config.MIN_CANDLES_FOR_ANALYSIS, config.RSI_PERIOD + 1);
    if (!this.isReady && this.candles.length >= minRequiredCandles) {
      this.isReady = true;
      logger.success(`📊 Candle store ready (${this.candles.length} candles)`, {
        oldest: new Date(this.candles[0].timestamp).toLocaleTimeString(),
        latest: new Date(this.lastCandle.timestamp).toLocaleTimeString(),
      });
    }

    return true;
  }

  /**
   * Bulk-load candles for warmup without treating each as a new close event.
   */
  seedCandles(candleList) {
    this.clear();
    candleList.forEach((c) => {
      const key = this.getCandleKey(c);
      this.lastCandleKey = key;
      this.candles.push({
        timestamp: c.timestamp || Date.now(),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume || 0,
        candleId: c.candleId,
      });
    });
    if (this.candles.length > this.maxSize) {
      this.candles = this.candles.slice(-this.maxSize);
    }
    this.lastCandle = this.candles[this.candles.length - 1] || null;
    const minRequired = Math.max(config.MIN_CANDLES_FOR_ANALYSIS, config.RSI_PERIOD + 1);
    this.isReady = this.candles.length >= minRequired;
  }

  /**
   * Get all close prices (most recent first)
   * @returns {array} close prices in chronological order
   */
  getClosePrices(count = null) {
    const prices = this.candles.map((c) => c.close);
    if (count && prices.length > count) {
      return prices.slice(-count);
    }
    return prices;
  }

  /**
   * Get OHLCV data
   * @returns {array} candles
   */
  getCandles(count = null) {
    if (count && this.candles.length > count) {
      return this.candles.slice(-count);
    }
    return this.candles;
  }

  /**
   * Get latest candle
   */
  getLatestCandle() {
    return this.lastCandle;
  }

  /**
   * Get price range (high - low) for last N candles
   */
  getPriceRange(count = 14) {
    if (this.candles.length < count) return 0;
    const recentCandles = this.candles.slice(-count);
    const high = Math.max(...recentCandles.map((c) => c.high));
    const low = Math.min(...recentCandles.map((c) => c.low));
    return high - low;
  }

  /**
   * Get average volume
   */
  getAverageVolume(count = 14) {
    if (this.candles.length < count) return 0;
    const recentCandles = this.candles.slice(-count);
    const sum = recentCandles.reduce((total, c) => total + c.volume, 0);
    return sum / count;
  }

  /**
   * Clear all candles
   */
  clear() {
    this.candles = [];
    this.lastCandle = null;
    this.lastCandleKey = null;
    this.isReady = false;
    logger.info('📊 Candle store cleared');
  }

  /**
   * Get store statistics
   */
  getStats() {
    if (this.candles.length === 0) return null;

    const closes = this.getClosePrices();
    const opens = this.candles.map((c) => c.open);
    const highs = this.candles.map((c) => c.high);
    const lows = this.candles.map((c) => c.low);

    return {
      count: this.candles.length,
      isReady: this.isReady,
      currentPrice: closes[closes.length - 1],
      dayHigh: Math.max(...highs),
      dayLow: Math.min(...lows),
      dayOpen: opens[0],
      dayChange: ((closes[closes.length - 1] - opens[0]) / opens[0]) * 100,
      volumeSum: this.candles.reduce((sum, c) => sum + c.volume, 0),
    };
  }
}

module.exports = CandleStore;
