/**
 * SIGNAL FILTER - Advanced filtering to prevent overtrading
 * Implements:
 * - Minimum agreement threshold (3+ signals for NORMAL mode)
 * - Signal cooldown to prevent rapid-fire trades
 * - Volatility checks
 * - Trend alignment requirements
 * - Signal momentum validation
 */

const logger = require('../logger/logger');
const config = require('../config');

class SignalFilter {
  constructor() {
    this.lastSignalTime = {};
    this.lastSignalDirection = {};
    this.signalCooldownMs = (config.SIGNAL_COOLDOWN_MS || 30) * 1000; // Default 30 seconds
    this.minSignalsRequired = {
      NORMAL: 3, // Require 3+ signals in NORMAL mode
      AGGRESSIVE: 2, // Require 2+ signals in AGGRESSIVE
      SUPER: 2,
      MEGA: 2,
    };
  }

  /**
   * Filter and validate a trading signal
   * @param {object} signal - Strategy signal output
   * @param {string} aggressiveMode - Trading mode (NORMAL, AGGRESSIVE, etc)
   * @param {number} currentBalance - Current account balance
   * @param {object} indicators - Current indicators
   * @returns {object} Filtered signal with validation results
   */
  filterSignal(signal, aggressiveMode = 'NORMAL', currentBalance = 0, indicators = {}) {
    const mode = String(aggressiveMode || 'NORMAL').toUpperCase();
    const validationResults = {};
    const detailedReasons = [];

    // 1. Check if signal is WAIT
    if (signal.signal === 'WAIT') {
      logger.debug(`🔴 Signal is WAIT - Reason: ${(signal.reasons || ['Unknown']).join(', ')}`);
      return {
        ...signal,
        filtered: true,
        reason: 'NO_SIGNAL',
        validationResults,
        detailedReasons,
      };
    }

    // 2. Check minimum signals agreement
    const minRequired = this.minSignalsRequired[mode] || this.minSignalsRequired.NORMAL;
    if ((signal.agreedSignals || 0) < minRequired) {
      detailedReasons.push(
        `Not enough signal agreement: ${signal.agreedSignals} < ${minRequired} (mode: ${mode})`
      );
      validationResults.minSignals = {
        passed: false,
        required: minRequired,
        actual: signal.agreedSignals || 0,
      };
      logger.debug(
        `🔴 Signal filtered [MIN_SIGNALS]: Need ${minRequired}, got ${signal.agreedSignals}`
      );
      return {
        ...signal,
        filtered: true,
        reason: 'INSUFFICIENT_SIGNAL_AGREEMENT',
        validationResults,
        detailedReasons,
      };
    }
    validationResults.minSignals = { passed: true };

    // 3. Check signal cooldown (prevent rapid consecutive trades in same direction)
    const lastTradeTime = this.lastSignalTime[signal.signal] || 0;
    const timeSinceLastSignal = Date.now() - lastTradeTime;

    if (timeSinceLastSignal < this.signalCooldownMs) {
      const remainingMs = this.signalCooldownMs - timeSinceLastSignal;
      detailedReasons.push(
        `Signal cooldown active: ${remainingMs}ms remaining (${(remainingMs / 1000).toFixed(1)}s)`
      );
      validationResults.cooldown = {
        passed: false,
        remainingMs: remainingMs,
      };
      logger.debug(
        `🔴 Signal filtered [COOLDOWN]: ${signal.signal} needs ${Math.ceil(remainingMs / 1000)}s more`
      );
      return {
        ...signal,
        filtered: true,
        reason: 'SIGNAL_COOLDOWN',
        validationResults,
        detailedReasons,
      };
    }
    validationResults.cooldown = { passed: true };

    // 4. Check signal strength/confidence
    const minConfidence = signal.minConfidence || 65;
    if ((signal.confidence || 0) < minConfidence) {
      detailedReasons.push(`Confidence too low: ${signal.confidence}% < ${minConfidence}%`);
      validationResults.confidence = {
        passed: false,
        required: minConfidence,
        actual: signal.confidence || 0,
      };
      logger.debug(`🔴 Signal filtered [CONFIDENCE]: ${signal.confidence}% < ${minConfidence}%`);
      return {
        ...signal,
        filtered: true,
        reason: 'LOW_CONFIDENCE',
        validationResults,
        detailedReasons,
      };
    }
    validationResults.confidence = { passed: true };

    // 5. Check trend strength
    const trend = signal.trend || 'UNKNOWN';
    const isValidTrend = ['UP', 'STRONG_UP', 'DOWN', 'STRONG_DOWN'].includes(trend);
    if (!isValidTrend && mode === 'NORMAL') {
      detailedReasons.push(`No clear trend: ${trend}`);
      validationResults.trend = {
        passed: false,
        reason: 'NO_CLEAR_TREND',
        trend: trend,
      };
      logger.debug(`🔴 Signal filtered [TREND]: Unclear trend (${trend})`);
      return {
        ...signal,
        filtered: true,
        reason: 'NO_CLEAR_TREND',
        validationResults,
        detailedReasons,
      };
    }
    validationResults.trend = { passed: true, trend };

    // 6. Check volatility (from ATR)
    const atrPct = parseFloat(signal.atrPct || '0');
    if (atrPct > 0.05 && mode === 'NORMAL') {
      // Skip if too volatile in NORMAL mode
      detailedReasons.push(`Volatility too high: ${(atrPct * 100).toFixed(2)}% > 5%`);
      validationResults.volatility = {
        passed: false,
        reason: 'HIGH_VOLATILITY',
        atrPct: atrPct.toFixed(4),
      };
      logger.debug(`🔴 Signal filtered [VOLATILITY]: Too high (${(atrPct * 100).toFixed(2)}%)`);
      return {
        ...signal,
        filtered: true,
        reason: 'HIGH_VOLATILITY',
        validationResults,
        detailedReasons,
      };
    }
    if (atrPct < 0.002 && mode === 'NORMAL') {
      // Skip if too low volatility (no movement)
      detailedReasons.push(`Volatility too low: ${(atrPct * 100).toFixed(2)}% < 0.2%`);
      validationResults.volatility = {
        passed: false,
        reason: 'TOO_LOW_VOLATILITY',
        atrPct: atrPct.toFixed(4),
      };
      logger.debug(`🔴 Signal filtered [VOLATILITY]: Too low (${(atrPct * 100).toFixed(2)}%)`);
      return {
        ...signal,
        filtered: true,
        reason: 'TOO_LOW_VOLATILITY',
        validationResults,
        detailedReasons,
      };
    }
    validationResults.volatility = { passed: true, atrPct: atrPct.toFixed(4) };

    // 7. Check ADX for trend strength
    const adx = indicators.adx || 0;
    if (adx < 15 && mode === 'NORMAL') {
      detailedReasons.push(`Trend too weak: ADX ${adx.toFixed(2)} < 15`);
      validationResults.adx = {
        passed: false,
        reason: 'WEAK_TREND_STRENGTH',
        adx: adx.toFixed(2),
      };
      logger.debug(`🔴 Signal filtered [ADX]: Weak trend (${adx.toFixed(2)})`);
      return {
        ...signal,
        filtered: true,
        reason: 'WEAK_TREND_STRENGTH',
        validationResults,
        detailedReasons,
      };
    }
    validationResults.adx = { passed: true, adx: adx.toFixed(2) };

    // ✅ ALL FILTERS PASSED - Signal is valid
    logger.info(
      `✅ SIGNAL PASSED ALL FILTERS: ${signal.signal} (${signal.confidence}% | ${signal.agreedSignals} signals) | Reasons: ${signal.reasons.join(', ')}`
    );

    // Update last signal time
    this.lastSignalTime[signal.signal] = Date.now();
    this.lastSignalDirection[signal.signal] = signal.signal;

    return {
      ...signal,
      filtered: false,
      validationResults,
      detailedReasons: ['All validations passed'],
      timestamp: Date.now(),
    };
  }

  /**
   * Reset cooldowns (useful for manual trades or testing)
   */
  resetCooldowns() {
    this.lastSignalTime = {};
    this.lastSignalDirection = {};
    logger.info('🔄 Signal cooldowns reset');
  }

  /**
   * Get cooldown status for a direction
   */
  getCooldownStatus(direction) {
    const lastTime = this.lastSignalTime[direction] || 0;
    const elapsed = Date.now() - lastTime;
    return {
      direction,
      lastSignalTime: new Date(lastTime).toISOString(),
      elapsedMs: elapsed,
      remainingMs: Math.max(0, this.signalCooldownMs - elapsed),
      ready: elapsed >= this.signalCooldownMs,
    };
  }

  /**
   * Set cooldown duration (in seconds)
   */
  setCooldownDuration(seconds) {
    this.signalCooldownMs = Math.max(5, seconds) * 1000;
    logger.info(`⏱️  Signal cooldown updated to ${seconds}s`);
  }
}

module.exports = new SignalFilter();
