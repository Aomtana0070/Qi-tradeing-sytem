/**
 * ORDER MANAGER
 * Handles trade execution with pre-trade checks and post-trade logging
 * Supports both real trading and paper trading (simulation)
 */

const config = require('../config');
const logger = require('../logger/logger');

class OrderManager {
  constructor(iqConnector, riskManager, tradeLogger) {
    this.iqConnector = iqConnector;
    this.riskManager = riskManager;
    this.tradeLogger = tradeLogger;
    this.lastTradeTime = 0;
    this.tradeInProgress = false;
  }

  /**
   * Place a trade (real or paper)
   * @param {object} tradeRequest - {asset, direction, amount, duration, indicators}
   * @param {number} currentBalance - current account balance
   * @returns {Promise<object>} trade result
   */
  async placeTrade(tradeRequest, currentBalance) {
    const { asset, direction, amount, duration, signalConfidence, strategyReasons } = tradeRequest;

    // ==================== PRE-TRADE CHECKS ====================

    // 1. Rate limiting - prevent trading too fast
    if (!this.canPlaceTrade()) {
      logger.warn(
        `⏸️  Rate limit: wait ${Math.ceil((config.MIN_SECONDS_BETWEEN_TRADES * 1000 - (Date.now() - this.lastTradeTime)) / 1000)}s`
      );
      return null;
    }

    // 2. Validate inputs
    if (!['CALL', 'PUT'].includes(direction)) {
      throw new Error(`Invalid direction: ${direction}`);
    }

    if (amount <= 0 || !Number.isFinite(amount)) {
      throw new Error(`Invalid trade amount: ${amount}`);
    }

    const riskGate = this.riskManager.canTrade(
      currentBalance,
      amount,
      this.riskManager.lastTradeAmount
    );
    if (!riskGate.allowed) {
      logger.error(`🔴 Risk gate blocked trade: ${riskGate.reason}`);
      return null;
    }

    // ==================== EXECUTE TRADE ====================

    this.tradeInProgress = true;

    try {
      logger.info(
        `\n${'═'.repeat(70)}\n` +
          `📈 EXECUTING TRADE: ${direction} | Amount: $${amount} | ${asset} ${duration}m\n` +
          `Confidence: ${signalConfidence}% | Balance: $${currentBalance}\n` +
          `${'═'.repeat(70)}`
      );

      let result;

      if (config.PAPER_TRADE_MODE) {
        // Paper trading - simulate
        result = await this.simulateTrade(asset, direction, amount, currentBalance);
      } else {
        // Real trading - connect to IQ Option
        result = await this.iqConnector.placeTrade(asset, direction, amount, duration);
      }

      // ==================== POST-TRADE ACTIONS ====================

      if (result) {
        const shouldUpdateRisk = result.result === 'WIN' || result.result === 'LOSS';

        if (shouldUpdateRisk) {
          this.riskManager.recordResult(result.result, result.pnl, amount);
        } else {
          logger.info('ℹ️ Trade placed, outcome pending settlement', {
            orderId: result.orderId,
            status: result.result,
          });
        }

        // Log trade only after settlement (WIN/LOSS)
        if (this.tradeLogger && (result.result === 'WIN' || result.result === 'LOSS')) {
          const balanceAfter =
            typeof result.balanceAfter === 'number'
              ? result.balanceAfter
              : await this.iqConnector.getBalance().catch(() =>
                  currentBalance + (typeof result.pnl === 'number' ? result.pnl : 0)
                );

          await this.tradeLogger.logTrade({
            timestamp: new Date(),
            asset,
            direction,
            amount,
            duration,
            result: result.result,
            pnl: result.pnl,
            confidence: signalConfidence,
            reasons: strategyReasons,
            balance: balanceAfter,
          });
        }

        // Update last trade time after full settlement
        this.lastTradeTime = Date.now();

        const finalBalance =
          typeof result.balanceAfter === 'number'
            ? result.balanceAfter
            : await this.iqConnector.getBalance().catch(() => currentBalance);

        const pnlDisplay =
          typeof result.pnl === 'number'
            ? `${result.pnl >= 0 ? '+' : ''}$${result.pnl.toFixed(2)}`
            : 'unknown';
        logger.success(
          `✅ Trade ${result.result} | P&L: ${pnlDisplay} | Balance: $${finalBalance.toFixed(2)}`
        );

        return result;
      }
    } catch (error) {
      logger.error('❌ Trade execution failed', error);
      return null;
    } finally {
      this.tradeInProgress = false;
    }
  }

  /**
   * Simulate trade for paper trading
   * @returns {Promise<object>} simulated trade result
   */
  async simulateTrade(asset, direction, amount, currentPrice) {
    return new Promise((resolve) => {
      // Simulate 1-minute candle close
      const simulationTime = config.OPTION_DURATION * 60 * 1000;

      logger.info(`📄 Paper Trade Mode: Simulating for ${config.OPTION_DURATION} minute(s)...`);

      setTimeout(() => {
        // Simple simulation: 55% win rate (configurable)
        const isWin = Math.random() > 0.45;

        const result = {
          orderId: `sim_${Date.now()}`,
          direction,
          asset,
          amount,
          timestamp: Date.now(),
          result: isWin ? 'WIN' : 'LOSS',
          pnl: isWin ? amount : -amount,
          description: isWin
            ? `✅ Simulated ${direction} - Price moved in expected direction`
            : `❌ Simulated ${direction} - Price moved against prediction`,
        };

        // Update the internal paper balance so the bot's own balance reflects the simulation.
        if (this.iqConnector && this.iqConnector.client) {
          this.iqConnector.client.balance = (this.iqConnector.client.balance || 0) + result.pnl;
        }

        logger.success(`📄 Simulation result: ${result.description}`);
        resolve(result);
      }, simulationTime);
    });
  }

  /**
   * Check if enough time has passed for next trade (rate limiting)
   */
  canPlaceTrade() {
    if (this.tradeInProgress) return false;

    const timeSinceLastTrade = Date.now() - this.lastTradeTime;
    const optionMs = (config.OPTION_DURATION || 1) * 60 * 1000;
    const minGapMs = Math.max(
      config.MIN_SECONDS_BETWEEN_TRADES * 1000,
      optionMs + 5000
    );
    return timeSinceLastTrade >= minGapMs;
  }

  /**
   * Get trade manager status
   */
  getStatus() {
    return {
      tradeInProgress: this.tradeInProgress,
      lastTradeTime: new Date(this.lastTradeTime),
      canTradeNow: this.canPlaceTrade(),
      secondsUntilNextTrade: Math.max(
        0,
        Math.ceil(
          (config.MIN_SECONDS_BETWEEN_TRADES * 1000 - (Date.now() - this.lastTradeTime)) / 1000
        )
      ),
    };
  }
}

module.exports = OrderManager;
