/**
 * RISK MANAGER
 * 🛡️  THE MOST CRITICAL MODULE - Enforces ALL safety rules
 * Position sizing, loss limits, consecutive loss guard, drawdown protection
 */

const config = require('../config');
const logger = require('../logger/logger');

class RiskManager {
  constructor() {
    this.dailyStartBalance = 0;
    this.dailyPnL = 0;
    this.sessionStartBalance = 0;
    this.sessionPeakBalance = 0;
    this.tradeCount = 0;
    this.winCount = 0;
    this.consecutiveLosses = 0;
    this.consecutiveWins = 0;
    this.lastTradeAmount = 0;
    this.lastLossTime = null;
    this.cooldownUntil = 0;
    this.isAnyLimitViolated = false;
    this.limitViolationReason = '';
  }

  /**
   * Initialize risk manager with starting balance
   */
  initialize(startingBalance) {
    this.dailyStartBalance = startingBalance;
    this.sessionStartBalance = startingBalance;
    this.sessionPeakBalance = startingBalance;
    this.dailyPnL = 0;
    this.tradeCount = 0;
    this.winCount = 0;
    this.consecutiveLosses = 0;
    this.consecutiveWins = 0;
    this.isAnyLimitViolated = false;

    logger.info('🛡️  Risk Manager initialized', {
      startingBalance: startingBalance,
      maxTradePercent: `${config.MAX_TRADE_PERCENT}%`,
      maxDailyLoss: `${config.MAX_DAILY_LOSS_PERCENT}%`,
      maxConsecutiveLosses: config.MAX_CONSECUTIVE_LOSSES,
    });
  }

  /**
   * 🔴 RULE 1: Calculate SAFE trade amount using Kelly Criterion (lite version)
   * Never exceed MAX_TRADE_PERCENT of current balance
   * Scale down based on signal confidence
   * @returns {number} safe trade amount in USD
   */
  calculateTradeAmount(currentBalance, signalConfidence = 70, aggressionLevel = 'NORMAL') {
    if (currentBalance < config.MIN_BALANCE_THRESHOLD) {
      logger.error('⛔ Balance below minimum threshold. Cannot trade.');
      return 0;
    }

    const maxTradeAmount = this.getMaxTradeAmount(currentBalance, aggressionLevel);

    // Scale amount based on confidence (70% confidence = 100% size, 50% = 50% size)
    const confidenceRatio = Math.max(0, Math.min(1, (signalConfidence - 50) / (100 - 50)));
    const scaledAmount = maxTradeAmount * confidenceRatio;

    // Further reduce if on losing streak (consecutive losses build up)
    let finalAmount = scaledAmount;
    if (this.consecutiveLosses > 0) {
      const lossReduction = 1 - this.consecutiveLosses * 0.15;
      finalAmount = scaledAmount * Math.max(0.5, lossReduction);
    }

    const minimumTradeAmount = Number(config.MIN_TRADE_AMOUNT_USD) || 1;
    finalAmount = Math.floor(finalAmount);
    if (finalAmount < minimumTradeAmount) {
      finalAmount = 0;
    }

    logger.debug('💵 Trade amount calculated', {
      balance: currentBalance,
      confidence: signalConfidence,
      maxAllowed: maxTradeAmount.toFixed(2),
      scaled: finalAmount.toFixed(2),
      consecutiveLosses: this.consecutiveLosses,
    });

    return finalAmount;
  }

  getMaxTradeAmount(currentBalance, aggressionLevel = 'NORMAL') {
    if (!Number.isFinite(currentBalance) || currentBalance < config.MIN_BALANCE_THRESHOLD) {
      return 0;
    }

    const level =
      typeof aggressionLevel === 'string'
        ? aggressionLevel.toUpperCase()
        : aggressionLevel
          ? 'AGGRESSIVE'
          : 'NORMAL';

    let maxPercent;
    if (level === 'MEGA') {
      maxPercent = config.MEGA_AGGRESSIVE_MAX_TRADE_PERCENT;
    } else if (level === 'SUPER') {
      maxPercent = config.SUPER_AGGRESSIVE_MAX_TRADE_PERCENT;
    } else if (level === 'AGGRESSIVE') {
      maxPercent = config.AGGRESSIVE_MAX_TRADE_PERCENT;
    } else {
      maxPercent = config.MAX_TRADE_PERCENT;
    }

    const rate = config.ACCOUNT_CURRENCY === 'THB' ? config.USD_TO_THB_RATE : 1;
    const balanceInUSD = currentBalance / rate;
    return (balanceInUSD * Math.min(maxPercent, config.MAX_TRADE_PERCENT)) / 100;
  }

  /**
   * 🔴 RULE 2: Check if daily loss limit is exceeded
   * If yes → trading is HALTED for the entire day
   */
  isDailyLimitReached(currentBalance) {
    const dailyLoss = this.dailyStartBalance - currentBalance;
    const dailyLossPercent = (Math.abs(dailyLoss) / this.dailyStartBalance) * 100;

    if (dailyLoss > 0 && dailyLossPercent >= config.MAX_DAILY_LOSS_PERCENT) {
      this.isAnyLimitViolated = true;
      this.limitViolationReason = `Daily loss limit reached: ${dailyLossPercent.toFixed(2)}% (limit: ${config.MAX_DAILY_LOSS_PERCENT}%)`;
      logger.error(`🔴 DAILY LOSS LIMIT TRIGGERED: ${dailyLossPercent.toFixed(2)}%`);
      return true;
    }

    return false;
  }

  /**
   * 🔴 RULE 3: Check consecutive loss limit
   * If 3 losses in a row → enforce 5-minute cooldown
   */
  isInCooldown() {
    if (this.consecutiveLosses < 3) {
      return { cooling: false };
    }
    const now = Date.now();
    if (this.cooldownUntil > now) {
      return {
        cooling: true,
        remainingSec: Math.ceil((this.cooldownUntil - now) / 1000),
      };
    }
    return { cooling: false };
  }

  shouldPauseTradingAfterLosses() {
    const cooldown = this.isInCooldown();
    if (cooldown.cooling) {
      this.isAnyLimitViolated = true;
      this.limitViolationReason = `Cooldown: ${cooldown.remainingSec}s remaining`;
      return true;
    }

    if (this.consecutiveLosses >= config.MAX_CONSECUTIVE_LOSSES) {
      this.cooldownUntil = Date.now() + config.COOLDOWN_AFTER_LOSS_MS;
      this.isAnyLimitViolated = true;
      this.limitViolationReason = `Max consecutive losses (${config.MAX_CONSECUTIVE_LOSSES}) reached. Cooldown enforced.`;
      logger.warn(
        `⚠️  Consecutive loss limit reached (${this.consecutiveLosses}/${config.MAX_CONSECUTIVE_LOSSES}). Enforcing cooldown.`
      );
      return true;
    }

    return false;
  }

  detectMartingale(lastAmount, newAmount) {
    return lastAmount > 0 && newAmount >= lastAmount * 1.8;
  }

  /**
   * Master pre-trade risk gate (6 rules).
   */
  canTrade(balance, proposedAmount = 0, lastAmount = 0) {
    if (this.isBelowMinBalance(balance)) {
      return { allowed: false, reason: '🚨 Balance below minimum' };
    }

    if (proposedAmount > 0) {
      const minimumTradeAmount = Number(config.MIN_TRADE_AMOUNT_USD) || 1;
      const maxTradeAmount = this.getMaxTradeAmount(balance, config.AGGRESSION_LEVEL);
      if (proposedAmount < minimumTradeAmount) {
        return {
          allowed: false,
          reason: `Trade amount is below broker minimum (${minimumTradeAmount})`,
        };
      }
      if (proposedAmount > maxTradeAmount) {
        return {
          allowed: false,
          reason: `Trade amount exceeds configured risk cap (${maxTradeAmount.toFixed(2)})`,
        };
      }
    }

    const dailyLoss = this.dailyStartBalance - balance;
    const dailyLossPercent =
      this.dailyStartBalance > 0 ? (dailyLoss / this.dailyStartBalance) * 100 : 0;
    if (dailyLoss > 0 && dailyLossPercent >= config.MAX_DAILY_LOSS_PERCENT) {
      return {
        allowed: false,
        reason: `🔴 Daily loss limit reached (${dailyLossPercent.toFixed(2)}%)`,
      };
    }

    const drawdown = this.sessionPeakBalance - balance;
    const drawdownPercent =
      this.sessionPeakBalance > 0 ? (drawdown / this.sessionPeakBalance) * 100 : 0;
    if (drawdownPercent >= config.SESSION_MAX_DRAWDOWN_PERCENT) {
      return {
        allowed: false,
        reason: `🔴 Session drawdown exceeded (${drawdownPercent.toFixed(2)}%)`,
      };
    }

    const cooldown = this.isInCooldown();
    if (cooldown.cooling) {
      return { allowed: false, reason: `⏳ Cooldown: ${cooldown.remainingSec}s remaining` };
    }

    if (this.detectMartingale(lastAmount || this.lastTradeAmount, proposedAmount)) {
      return { allowed: false, reason: '🚫 Martingale detected — blocked' };
    }

    if (balance > this.sessionPeakBalance) {
      this.sessionPeakBalance = balance;
    }

    return { allowed: true, reason: 'All checks passed ✅' };
  }

  recordResult(result, pnl, tradeAmount = 0) {
    this.updateAfterTrade({ result, pnl });
    if (tradeAmount > 0) {
      this.lastTradeAmount = tradeAmount;
    }
  }

  /**
   * 🔴 RULE 4: Check if balance is below minimum threshold
   * Emergency stop
   */
  isBelowMinBalance(currentBalance) {
    if (currentBalance < config.MIN_BALANCE_THRESHOLD) {
      this.isAnyLimitViolated = true;
      this.limitViolationReason = `Balance below minimum: $${currentBalance} (minimum: $${config.MIN_BALANCE_THRESHOLD})`;
      logger.error(
        `🔴 MINIMUM BALANCE THRESHOLD BREACHED: $${currentBalance} < $${config.MIN_BALANCE_THRESHOLD}`
      );
      return true;
    }

    return false;
  }

  /**
   * 🔴 RULE 5: Anti-Martingale Check
   * BLOCK any trade that doubles the previous amount after a loss
   * Martingale is a proven path to ruin
   */
  validateNoDubling(proposedAmount) {
    if (
      this.consecutiveLosses > 0 &&
      this.lastTradeAmount > 0 &&
      proposedAmount > this.lastTradeAmount * 1.5
    ) {
      logger.error(
        `🔴 MARTINGALE BLOCK: Proposed amount (${proposedAmount}) exceeds 1.5x previous (${this.lastTradeAmount})`
      );
      return false;
    }

    return true;
  }

  /**
   * 🔴 RULE 6: Check session drawdown
   * If peak balance drops by SESSION_MAX_DRAWDOWN_PERCENT → stop trading for session
   */
  checkSessionDrawdown(currentBalance) {
    // Update peak if new high
    if (currentBalance > this.sessionPeakBalance) {
      this.sessionPeakBalance = currentBalance;
    }

    const drawdown = this.sessionPeakBalance - currentBalance;
    const drawdownPercent = (drawdown / this.sessionPeakBalance) * 100;

    if (drawdownPercent >= config.SESSION_MAX_DRAWDOWN_PERCENT) {
      this.isAnyLimitViolated = true;
      this.limitViolationReason = `Session drawdown limit reached: ${drawdownPercent.toFixed(2)}% (limit: ${config.SESSION_MAX_DRAWDOWN_PERCENT}%)`;
      logger.error(
        `🔴 SESSION DRAWDOWN LIMIT: ${drawdownPercent.toFixed(2)}% from peak $${this.sessionPeakBalance}`
      );
      return true;
    }

    return false;
  }

  /**
   * Update performance after trade result
   * @param {object} tradeResult - {result: 'WIN'|'LOSS', pnl: number}
   */
  updateAfterTrade(tradeResult) {
    this.tradeCount++;
    if (tradeResult.amount) {
      this.lastTradeAmount = tradeResult.amount;
    }

    if (tradeResult.result === 'WIN') {
      this.winCount++;
      this.consecutiveWins++;
      this.consecutiveLosses = 0;
      logger.success(
        `✅ WIN - Consecutive: ${this.consecutiveWins}, Total Win Rate: ${((this.winCount / this.tradeCount) * 100).toFixed(2)}%`
      );
    } else {
      this.consecutiveLosses++;
      this.consecutiveWins = 0;
      this.lastLossTime = Date.now();
      if (this.consecutiveLosses >= 3) {
        this.cooldownUntil = Date.now() + config.COOLDOWN_AFTER_LOSS_MS;
      }
      logger.warn(
        `❌ LOSS - Consecutive: ${this.consecutiveLosses}/${config.MAX_CONSECUTIVE_LOSSES}`
      );
    }

    this.dailyPnL += tradeResult.pnl;
  }

  /**
   * Reset daily counters (call at midnight)
   */
  resetDailyCounters(newBalance) {
    this.dailyStartBalance = newBalance;
    this.dailyPnL = 0;
    logger.info('📅 Daily counters reset', { newBalance });
  }

  /**
   * Get complete risk status
   */
  getRiskStatus(currentBalance) {
    const dailyLoss = this.dailyStartBalance - currentBalance;
    const dailyLossPercent = (Math.abs(dailyLoss) / this.dailyStartBalance) * 100;
    const drawdown = this.sessionPeakBalance - currentBalance;
    const drawdownPercent = (drawdown / this.sessionPeakBalance) * 100;

    return {
      canTrade: !this.isAnyLimitViolated,
      violation: this.limitViolationReason || 'None',
      balance: {
        current: currentBalance,
        session_peak: this.sessionPeakBalance,
        daily_start: this.dailyStartBalance,
      },
      limits: {
        daily_loss: {
          current_percent: dailyLossPercent.toFixed(2) + '%',
          limit_percent: config.MAX_DAILY_LOSS_PERCENT + '%',
          violated: this.isDailyLimitReached(currentBalance),
        },
        consecutive_losses: {
          current: this.consecutiveLosses,
          limit: config.MAX_CONSECUTIVE_LOSSES,
          violated: this.shouldPauseTradingAfterLosses(),
        },
        drawdown: {
          current_percent: drawdownPercent.toFixed(2) + '%',
          limit_percent: config.SESSION_MAX_DRAWDOWN_PERCENT + '%',
          violated: this.checkSessionDrawdown(currentBalance),
        },
        min_balance: {
          current: currentBalance,
          threshold: config.MIN_BALANCE_THRESHOLD,
          violated: this.isBelowMinBalance(currentBalance),
        },
      },
      performance: {
        total_trades: this.tradeCount,
        wins: this.winCount,
        losses: this.tradeCount - this.winCount,
        win_rate:
          this.tradeCount > 0 ? ((this.winCount / this.tradeCount) * 100).toFixed(2) + '%' : 'N/A',
        daily_pnl: this.dailyPnL.toFixed(2),
        consecutive_streak:
          this.consecutiveWins > 0 ? `+${this.consecutiveWins}W` : `-${this.consecutiveLosses}L`,
        consecutive_wins: this.consecutiveWins,
        consecutive_losses: this.consecutiveLosses,
      },
    };
  }
}

module.exports = RiskManager;
