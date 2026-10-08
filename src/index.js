/**
 * IQ OPTION AI TRADING BOT - MAIN ENTRY POINT
 * ============================================
 * Production-ready algorithmic trading bot with risk-first architecture
 *
 * The bot performs this exact workflow every candle:
 * [1] Collect last 150 candles
 * [2] Calculate indicators (RSI, MACD, Bollinger Bands)
 * [3] Get consensus signal from 3 strategies
 * [4] Check all risk limits
 * [5] Calculate safe trade amount
 * [6] Place trade (or simulate on paper trading)
 * [7] Log results and update performance
 */

require('dotenv').config();

const IQConnector = require('./api/iqConnector');
const CandleStore = require('./data/candleStore');
const indicators = require('./data/indicators');
const advancedStrategy = require('./strategy/advancedStrategy');
const signalFilter = require('./strategy/signalFilter');
const telegram = require('./logger/telegram');
const RiskManager = require('./risk/riskManager');
const OrderManager = require('./execution/orderManager');
const tradeLogger = require('./logger/tradeLogger');
const logger = require('./logger/logger');
const config = require('./config');
const DashboardServer = require('./dashboard/server');
const EconomicCalendar = require('./filters/economicCalendar');
const SessionFilter = require('./filters/sessionFilter');
const VolatilityFilter = require('./filters/volatilityFilter');
const CircuitBreaker = require('./protection/circuitBreaker');
const CapitalPreserver = require('./protection/capitalPreserver');

class TradingBot {
  constructor() {
    this.iqConnector = new IQConnector();
    this.candleStore = new CandleStore();
    this.riskManager = new RiskManager();
    this.tradeLogger = tradeLogger;
    this.orderManager = null;
    this.currentAsset = config.CURRENCY_PAIR;
    this.aggressionMode =
      config.AGGRESSION_LEVEL || (config.AGGRESSIVE_MODE ? 'AGGRESSIVE' : 'NORMAL');
    this.dashboardServer = config.DASHBOARD_ENABLED
      ? new DashboardServer(
          this.triggerTestTrade.bind(this),
          this.changeAsset.bind(this),
          this.setAggressionLevel.bind(this),
          this.executeManualTrade.bind(this),
          this.updateSettings ? this.updateSettings.bind(this) : null,
          {
            pause: () => {
              this.isPaused = true;
            },
            resume: () => {
              this.isPaused = false;
            },
            stop: () => this.stop(),
            getTradeLogger: () => this.tradeLogger,
          },
          this.candleStore // ✅ Pass candleStore for candles API
        )
      : null;

    this.isRunning = false;
    this.isPaused = false;
    this.sessionStartTime = null;
    this.unsubscribeCandles = null;
    this.lastTradeAmount = 0;
    this._candleProcessing = false;
    this._throttleLogAt = {};

    // Filters & protection
    this.econCalendar = new EconomicCalendar();
    this.sessionFilter = new SessionFilter(config.SESSION_FILTER_ENABLED);
    this.volFilter = new VolatilityFilter();
    this.circuitBreaker = new CircuitBreaker();
    this.capitalPreserver = new CapitalPreserver();

    // Bind event handlers
    this.onCandleClose = this.onCandleClose.bind(this);
    this._statsInterval = null;
  }

  pushDashboardStats(balanceOverride) {
    if (!this.dashboardServer) return;

    const tradeStats = this.tradeLogger.getStats();
    const performance = this.tradeLogger.getPerformanceMetrics();
    const summary = this.tradeLogger.loadSummary();

    const push = (balance) => {
      const riskStatus = this.riskManager.getRiskStatus(balance);
      this.dashboardServer.updateMetrics({
        status: this.isPaused ? 'PAUSED' : 'RUNNING',
        paused: this.isPaused,
        currentBalance: balance,
        balance,
        summary: {
          totalTrades: performance.totalTrades,
          winRate: tradeStats.winRate,
          totalPnL: performance.totalPnL,
          todayPnL: tradeStats.todayPnL,
          todayTrades: tradeStats.todayTrades,
          balance: balance.toFixed(2),
          consecutiveStreak: riskStatus.performance.consecutive_streak,
          consecutiveWins: summary.consecutiveWins,
          consecutiveLosses: summary.consecutiveLosses,
          consecutiveLossLimit: riskStatus.limits.consecutive_losses.limit,
        },
        recentTrades: this.tradeLogger.getRecentTrades(10),
      });
    };

    if (typeof balanceOverride === 'number') {
      push(balanceOverride);
      return;
    }

    this.iqConnector
      .getBalance()
      .then(push)
      .catch(() => push(0));
  }

  async updateSettings(settings = {}) {
    const result = {};
    try {
      if (settings.liveModeEnabled === true && config.PAPER_TRADE_MODE) {
        throw new Error('Live mode can only be enabled in .env before restarting the bot');
      }
      const numericLimits = {
        maxTradePercent: [1, 4],
        maxConsecutiveLosses: [1, 5],
        minBalanceThreshold: [1, 1000000],
        minConfidence: [50, 100],
        maxDailyLoss: [1, 10],
        sessionMaxDrawdownPercent: [5, 15],
        rsiPeriod: [5, 30],
        rsiOverbought: [50, 90],
        rsiOversold: [10, 50],
        macdFast: [5, 20],
        macdSlow: [15, 40],
        macdSignal: [5, 15],
        minStrategiesAgree: [1, 5],
      };
      for (const [key, [min, max]] of Object.entries(numericLimits)) {
        if (settings[key] !== undefined && settings[key] !== null) {
          const value = Number(settings[key]);
          if (!Number.isFinite(value) || value < min || value > max) {
            throw new Error(`${key} must be between ${min} and ${max}`);
          }
        }
      }
      const nextRsiOversold = settings.rsiOversold ?? config.RSI_OVERSOLD;
      const nextRsiOverbought = settings.rsiOverbought ?? config.RSI_OVERBOUGHT;
      if (nextRsiOversold >= nextRsiOverbought) {
        throw new Error('RSI oversold must be lower than RSI overbought');
      }
      const nextMacdFast = settings.macdFast ?? config.MACD_FAST;
      const nextMacdSlow = settings.macdSlow ?? config.MACD_SLOW;
      if (nextMacdFast >= nextMacdSlow) {
        throw new Error('MACD fast period must be lower than slow period');
      }
      if (typeof settings.maxTradePercent === 'number') {
        config.MAX_TRADE_PERCENT = Number(settings.maxTradePercent);
        result.maxTradePercent = config.MAX_TRADE_PERCENT;
      }
      if (typeof settings.aggressiveMaxTradePercent === 'number') {
        config.AGGRESSIVE_MAX_TRADE_PERCENT = Number(settings.aggressiveMaxTradePercent);
        result.aggressiveMaxTradePercent = config.AGGRESSIVE_MAX_TRADE_PERCENT;
      }
      if (typeof settings.superAggressiveMaxTradePercent === 'number') {
        config.SUPER_AGGRESSIVE_MAX_TRADE_PERCENT = Number(settings.superAggressiveMaxTradePercent);
        result.superAggressiveMaxTradePercent = config.SUPER_AGGRESSIVE_MAX_TRADE_PERCENT;
      }
      if (typeof settings.megaAggressiveMaxTradePercent === 'number') {
        config.MEGA_AGGRESSIVE_MAX_TRADE_PERCENT = Number(settings.megaAggressiveMaxTradePercent);
        result.megaAggressiveMaxTradePercent = config.MEGA_AGGRESSIVE_MAX_TRADE_PERCENT;
      }
      if (typeof settings.maxConsecutiveLosses === 'number') {
        config.MAX_CONSECUTIVE_LOSSES = Number(settings.maxConsecutiveLosses);
        result.maxConsecutiveLosses = config.MAX_CONSECUTIVE_LOSSES;
      }
      if (typeof settings.startBalance === 'number') {
        // update capital preserver baseline
        this.capitalPreserver.setStart(Number(settings.startBalance));
        result.startBalance = Number(settings.startBalance);
      }
      if (typeof settings.minBalanceThreshold === 'number') {
        config.MIN_BALANCE_THRESHOLD = Number(settings.minBalanceThreshold);
        result.minBalanceThreshold = config.MIN_BALANCE_THRESHOLD;
      }
      if (typeof settings.sessionFilterEnabled === 'boolean') {
        config.SESSION_FILTER_ENABLED = settings.sessionFilterEnabled;
        this.sessionFilter.setEnabled(settings.sessionFilterEnabled);
        result.sessionFilterEnabled = settings.sessionFilterEnabled;
      }
      if (typeof settings.aggressionLevel === 'string') {
        const normalized = settings.aggressionLevel.trim().toUpperCase();
        const validLevels = ['NORMAL', 'AGGRESSIVE', 'SUPER', 'MEGA'];
        if (!validLevels.includes(normalized)) {
          throw new Error(`Invalid aggression level: ${settings.aggressionLevel}`);
        }
        config.AGGRESSION_LEVEL = normalized;
        this.aggressionMode = normalized;
        result.aggressionLevel = normalized;
      }
      if (typeof settings.liveModeEnabled === 'boolean') {
        config.PAPER_TRADE_MODE = !settings.liveModeEnabled;
        result.liveModeEnabled = settings.liveModeEnabled;
        result.mode = config.PAPER_TRADE_MODE ? 'PAPER' : 'LIVE';
      }
      if (typeof settings.minConfidence === 'number') {
        config.MIN_SIGNAL_STRENGTH = Number(settings.minConfidence);
        result.minConfidence = config.MIN_SIGNAL_STRENGTH;
      }
      if (typeof settings.maxDailyLoss === 'number') {
        config.MAX_DAILY_LOSS_PERCENT = Number(settings.maxDailyLoss);
        result.maxDailyLoss = config.MAX_DAILY_LOSS_PERCENT;
      }
      if (typeof settings.sessionMaxDrawdownPercent === 'number') {
        config.SESSION_MAX_DRAWDOWN_PERCENT = Number(settings.sessionMaxDrawdownPercent);
        result.sessionMaxDrawdownPercent = config.SESSION_MAX_DRAWDOWN_PERCENT;
      }
      if (typeof settings.rsiPeriod === 'number') {
        config.RSI_PERIOD = Number(settings.rsiPeriod);
        result.rsiPeriod = config.RSI_PERIOD;
      }
      if (typeof settings.rsiOverbought === 'number') {
        config.RSI_OVERBOUGHT = Number(settings.rsiOverbought);
        result.rsiOverbought = config.RSI_OVERBOUGHT;
      }
      if (typeof settings.rsiOversold === 'number') {
        config.RSI_OVERSOLD = Number(settings.rsiOversold);
        result.rsiOversold = config.RSI_OVERSOLD;
      }
      if (typeof settings.macdFast === 'number') {
        config.MACD_FAST = Number(settings.macdFast);
        result.macdFast = config.MACD_FAST;
      }
      if (typeof settings.macdSlow === 'number') {
        config.MACD_SLOW = Number(settings.macdSlow);
        result.macdSlow = config.MACD_SLOW;
      }
      if (typeof settings.macdSignal === 'number') {
        config.MACD_SIGNAL = Number(settings.macdSignal);
        result.macdSignal = config.MACD_SIGNAL;
      }
      if (typeof settings.minStrategiesAgree === 'number') {
        config.MIN_STRATEGIES_AGREE = Number(settings.minStrategiesAgree);
        result.minStrategiesAgree = config.MIN_STRATEGIES_AGREE;
      }
      if (typeof settings.volatilityFilter === 'boolean') {
        config.VOLATILITY_FILTER_ENABLED = settings.volatilityFilter;
        result.volatilityFilter = settings.volatilityFilter;
      }
      if (typeof settings.tradingAsset === 'string' && settings.tradingAsset.trim()) {
        await this.changeAsset(String(settings.tradingAsset).trim().toUpperCase());
        result.tradingAsset = this.currentAsset;
      }

      // Update dashboard immediately when possible
      if (this.dashboardServer) {
        this.dashboardServer.updateMetrics({
          settings: result,
          mode: result.mode,
          aggressiveMode: this.aggressionMode,
        });
      }
      return result;
    } catch (err) {
      throw new Error('Failed to update settings: ' + err.message);
    }
  }

  /**
   * Initialize and start the bot
   */
  async start() {
    try {
      logger.title('🤖 IQ OPTION AI TRADING BOT - STARTING');
      console.log(config.getInfo());

      // Validate environment
      this.validateEnvironment();

      // Start dashboard if enabled
      if (this.dashboardServer) {
        await this.startDashboard();
      }

      // Connect to IQ Option
      const connected = await this.iqConnector.connect(
        process.env.IQ_EMAIL,
        process.env.IQ_PASSWORD,
        config.ACCOUNT_TYPE
      );

      if (!connected) {
        throw new Error('Failed to connect to IQ Option');
      }

      // Get starting balance
      const balance = await this.iqConnector.getBalance();
      logger.info(`💰 Starting balance: $${balance}`);

      // Initialize risk manager
      this.riskManager.initialize(balance);
      // Initialize capital preserver baseline
      try {
        this.capitalPreserver.setStart(balance);
      } catch {
        // ignore
      }

      // Initialize order manager
      this.orderManager = new OrderManager(this.iqConnector, this.riskManager, this.tradeLogger);

      tradeLogger.scheduleDailyReset();

      this.iqConnector.on('connection_lost', () => {
        logger.warn('🔌 Connection lost — pausing new trades until reconnect');
        this.isPaused = true;
      });

      this.iqConnector.on('connected', async () => {
        if (this.isPaused) {
          logger.success('✅ Reconnected — resuming trading');
          this.isPaused = false;
        }
        if (this.currentAsset) {
          await this.subscribeToAsset(this.currentAsset).catch((err) =>
            logger.error('Failed to resubscribe candles after reconnect', err)
          );
        }
        this.pushDashboardStats();
      });

      this.iqConnector.on('fatal_error', (message) => {
        logger.error(`💀 Fatal connection error: ${message}`);
        this.isPaused = true;
      });

      this._statsInterval = setInterval(() => {
        if (this.isRunning) this.pushDashboardStats();
      }, 5000);

      // Require user confirmation for live trading
      if (!config.PAPER_TRADE_MODE && config.REQUIRE_USER_CONFIRMATION_FOR_LIVE) {
        await this.requestLiveTradeConfirmation();
      }

      // Subscribe to candles
      await this.subscribeToAsset(this.currentAsset);

      this.isRunning = true;
      this.sessionStartTime = Date.now();

      logger.success('✅ Bot started successfully');
      logger.separator();
    } catch (error) {
      logger.error('❌ Failed to start bot', error);
      await this.stop();
      process.exit(1);
    }
  }

  /**
   * Validate environment before trading
   */
  validateEnvironment() {
    if (!process.env.IQ_EMAIL || !process.env.IQ_PASSWORD) {
      throw new Error('❌ Missing IQ_EMAIL or IQ_PASSWORD in .env file');
    }

    if (config.PAPER_TRADE_MODE && config.ACCOUNT_TYPE !== 'PRACTICE') {
      throw new Error('Paper mode requires ACCOUNT_TYPE=PRACTICE');
    }

    if (!config.PAPER_TRADE_MODE && !process.env.IQ_EMAIL) {
      throw new Error('❌ Live trading requires valid credentials');
    }

    logger.success('✅ Environment validation passed');
  }

  /**
   * Request user confirmation for live trading
   */
  async requestLiveTradeConfirmation() {
    logger.title('⚠️  LIVE TRADING MODE ACTIVATED');
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                   ⚠️  WARNING ⚠️                           ║
╠════════════════════════════════════════════════════════════╣
║ You are running the bot in LIVE TRADING mode!               ║
║ Real money will be at risk!                                 ║
║                                                             ║
║ Requirements before proceeding:                             ║
║ 1. Run 30+ days of backtesting                              ║
║ 2. Paper trade for 30+ days                                 ║
║ 3. Understand the risks completely                          ║
║ 4. Have written risk acceptance                             ║
║ 5. Start with SMALL amounts ($1-$5 per trade)               ║
║                                                             ║
║ The bot can and WILL cause losses.                          ║
║ Only trade money you can afford to lose.                    ║
╚════════════════════════════════════════════════════════════╝
    `);

    return new Promise((resolve) => {
      process.stdout.write('\nType "YES I UNDERSTAND THE RISKS" to proceed: ');
      process.stdin.once('data', (data) => {
        const input = data.toString().trim();
        if (input === 'YES I UNDERSTAND THE RISKS') {
          logger.success('✅ Confirmed. Starting live trading.');
          resolve();
        } else {
          logger.error('❌ Confirmation failed. Exiting.');
          process.exit(1);
        }
      });
    });
  }

  async startDashboard() {
    try {
      if (this.dashboardServer) {
        await this.dashboardServer.start();
      }
    } catch (error) {
      logger.error('❌ Failed to start dashboard', error);
    }
  }

  async subscribeToAsset(asset) {
    if (!asset || typeof asset !== 'string') {
      throw new Error('Asset is required to subscribe to candles');
    }

    if (this.unsubscribeCandles) {
      this.unsubscribeCandles();
    }

    this.candleStore.clear();
    this.currentAsset = asset;
    logger.info(`📊 Subscribing to ${asset} ${config.CANDLE_DURATION}s candles...`);
    this.unsubscribeCandles = this.iqConnector.subscribeToCandles(
      asset,
      config.CANDLE_DURATION,
      this.onCandleClose
    );

    if (this.dashboardServer) {
      this.dashboardServer.updateMetrics({ currentAsset: asset });
    }
  }

  async changeAsset(asset) {
    const normalized = String(asset).trim().toUpperCase();
    if (!config.SUPPORTED_ASSETS.includes(normalized)) {
      throw new Error(`Asset not supported: ${normalized}`);
    }
    logger.info(`🔄 Changing trading asset to ${normalized}`);
    await this.subscribeToAsset(normalized);
    return normalized;
  }

  async setAggressionLevel(level) {
    const normalized = String(level || 'NORMAL')
      .trim()
      .toUpperCase();
    const validLevels = ['NORMAL', 'AGGRESSIVE', 'SUPER', 'MEGA'];
    if (!validLevels.includes(normalized)) {
      throw new Error(`Invalid aggression level: ${level}`);
    }

    this.aggressionMode = normalized;
    logger.info(`⚡ Aggression mode set to ${this.aggressionMode}`);
    if (this.dashboardServer) {
      this.dashboardServer.updateMetrics({ aggressiveMode: this.aggressionMode });
    }
    return this.aggressionMode;
  }

  async executeManualTrade(tradeRequest = {}) {
    if (!this.orderManager) {
      throw new Error('Bot has not finished initialization yet');
    }

    const currentBalance = await this.iqConnector.getBalance();
    const asset = tradeRequest.asset
      ? String(tradeRequest.asset).trim().toUpperCase()
      : this.currentAsset;
    const direction = ['CALL', 'PUT'].includes(tradeRequest.direction)
      ? tradeRequest.direction
      : 'CALL';
    const amount = Number(tradeRequest.amount) > 0 ? Number(tradeRequest.amount) : 1;

    const request = {
      asset,
      direction,
      amount,
      duration: config.OPTION_DURATION,
      signalConfidence: tradeRequest.signalConfidence || 70,
      strategyReasons: tradeRequest.strategyReasons || ['Dashboard manual trade'],
    };

    const result = await this.orderManager.placeTrade(request, currentBalance);

    if (this.dashboardServer) {
      const performance = this.tradeLogger.getPerformanceMetrics();
      const newBalance = await this.iqConnector.getBalance();
      const riskStatus = this.riskManager.getRiskStatus(newBalance);

      this.dashboardServer.updateMetrics({
        summary: {
          totalTrades: performance.totalTrades,
          winRate: performance.winRate,
          totalPnL: performance.totalPnL,
          balance: newBalance.toFixed(2),
          consecutiveStreak: riskStatus.performance.consecutive_streak,
          consecutiveWins: riskStatus.performance.consecutive_wins,
          consecutiveLosses: riskStatus.performance.consecutive_losses,
          consecutiveLossLimit: riskStatus.limits.consecutive_losses.limit,
        },
        priceSeries: this.candleStore.getClosePrices(30),
        lastTrade: result || { success: false, error: 'Manual trade not executed' },
        recentTrades: this.tradeLogger.getRecentTrades(10),
      });
    }

    return result || { success: false, error: 'Manual trade not executed' };
  }

  async triggerTestTrade() {
    return this.executeManualTrade({
      asset: this.currentAsset,
      direction: 'CALL',
      amount: 1,
      signalConfidence: 70,
      strategyReasons: ['Dashboard test trade'],
    });
  }

  async stopDashboard() {
    if (this.dashboardServer) {
      await this.dashboardServer.stop();
    }
  }

  _logThrottled(key, logFn, intervalMs = 60000) {
    const now = Date.now();
    if (!this._throttleLogAt[key] || now - this._throttleLogAt[key] >= intervalMs) {
      this._throttleLogAt[key] = now;
      logFn();
    }
  }

  /**
   * Handle each candle close (only once per closed bar).
   */
  async onCandleClose(candle, meta = {}) {
    if (meta.closed === false) return;

    if (this._candleProcessing) {
      logger.debug('⏭️  Skip: previous candle still processing');
      return;
    }

    if (this.orderManager?.tradeInProgress) {
      logger.debug('⏭️  Skip: trade in progress');
      return;
    }

    this._candleProcessing = true;

    try {
      const isNewBar = this.candleStore.addCandle(candle);
      if (!isNewBar) {
        return;
      }

      if (!this.candleStore.isReady) {
        return;
      }

      if (this.isPaused) {
        return;
      }

      const currentBalance = await this.iqConnector.getBalance();

      // ==================== FILTERS FIRST (cheap checks) ====================
      this.sessionFilter.setEnabled(config.SESSION_FILTER_ENABLED);
      const sessionStatus = this.sessionFilter.isGoodSession();

      if (!sessionStatus.allowed) {
        this._logThrottled('session', () =>
          logger.debug(
            `⏸️  Session filter: ${sessionStatus.session} (hour ${sessionStatus.hour} Bangkok)`
          )
        );
        return;
      }

      const riskGate = this.riskManager.canTrade(currentBalance, 0, this.lastTradeAmount);
      if (!riskGate.allowed) {
        this._logThrottled('risk', () => logger.warn(`🛑 Trading halted: ${riskGate.reason}`));
        return;
      }

      const riskStatus = this.riskManager.getRiskStatus(currentBalance);
      if (!riskStatus.canTrade) {
        this._logThrottled('riskStatus', () =>
          logger.warn(`🛑 Trading halted: ${riskStatus.violation}`)
        );
        return;
      }

      const econStatus = await this.econCalendar.isNewsWindow(this.currentAsset);
      if (econStatus.blocked) {
        this._logThrottled('news', () =>
          logger.warn('⏸️  Trading blocked due to high-impact economic event')
        );
        return;
      }

      const volStatus = this.volFilter.getStatus(this.candleStore.getCandles(30));
      if (!volStatus.allowed) {
        this._logThrottled('vol', () => logger.warn('⏸️  Volatility filter blocked trading'));
        return;
      }

      const candles = this.candleStore.getCandles();
      const closePrices = this.candleStore.getClosePrices();
      const allIndicators = indicators.calculateAll(closePrices);

      const consensusSignal = advancedStrategy.analyze(candles, this.aggressionMode);
      const minConfidence = consensusSignal.minConfidence || config.MIN_SIGNAL_STRENGTH;

      // ==================== APPLY STRICT SIGNAL FILTERING ====================
      const filteredSignal = signalFilter.filterSignal(
        consensusSignal,
        this.aggressionMode,
        currentBalance,
        consensusSignal.indicators || allIndicators
      );

      if (filteredSignal.filtered) {
        logger.debug(
          `🔴 Signal filtered out: ${filteredSignal.reason} | ${JSON.stringify(filteredSignal.validationResults).substring(0, 100)}`
        );
        return;
      }

      logger.info(
        `✅ Signal passed all filters: ${filteredSignal.signal} confidence=${filteredSignal.confidence}%`
      );

      const validSignal = filteredSignal;

      const dailyLossPercent =
        parseFloat(
          (riskStatus.limits.daily_loss.current_percent || '0').toString().replace('%', '')
        ) || 0;
      const drawdownPercent =
        parseFloat(
          (riskStatus.limits.drawdown.current_percent || '0').toString().replace('%', '')
        ) || 0;
      const cbStatus = this.circuitBreaker.evaluate({ dailyLossPercent, drawdownPercent });
      const capitalStatus = this.capitalPreserver.check(currentBalance);

      if (cbStatus.level >= 4) {
        this._logThrottled('circuit', () => logger.warn('🛑 Circuit breaker triggered'));
        return;
      }
      if (!capitalStatus.allowed) {
        this._logThrottled('capital', () => logger.warn('🛑 Capital preserver blocked trading'));
        return;
      }

      const tradeStats = this.tradeLogger.getStats();

      if (this.dashboardServer) {
        const performance = this.tradeLogger.getPerformanceMetrics();
        this.dashboardServer.updateMetrics({
          status: this.isPaused ? 'PAUSED' : 'RUNNING',
          paused: this.isPaused,
          lastCandle: candle,
          currentBalance,
          balance: currentBalance,
          riskStatus,
          consensusSignal: validSignal,
          lastSignal: validSignal,
          currentAsset: this.currentAsset,
          aggressiveMode: this.aggressionMode,
          session: sessionStatus,
          circuit: cbStatus.level || 0,
          summary: {
            totalTrades: performance.totalTrades,
            winRate: tradeStats.winRate + '%',
            totalPnL: tradeStats.todayPnL,
            todayPnL: tradeStats.todayPnL,
            todayTrades: tradeStats.todayTrades,
            balance: currentBalance.toFixed(2),
            consecutiveStreak: riskStatus.performance.consecutive_streak,
            consecutiveWins: riskStatus.performance.consecutive_wins,
            consecutiveLosses: riskStatus.performance.consecutive_losses,
            consecutiveLossLimit: riskStatus.limits.consecutive_losses.limit,
          },
          priceSeries: this.candleStore.getClosePrices(30),
          recentTrades: this.tradeLogger.getRecentTrades(10),
          filters: {
            session: sessionStatus,
            economic: econStatus,
            volatility: volStatus,
            circuitBreaker: cbStatus,
            capital: capitalStatus,
          },
          liveIndicators: validSignal.indicators || allIndicators || {},
          indicators: validSignal.indicators || {},
        });
      }

      // ==================== TRADING DECISION ====================

      if (validSignal.signal === 'WAIT') {
        logger.debug(`⏸️  WAIT: ${(validSignal.reasons || []).join(' | ')}`);
        return;
      }

      if (validSignal.confidence < minConfidence) {
        logger.debug(`📉 Low confidence: ${validSignal.confidence}% (min ${minConfidence}%)`);
        return;
      }

      if (!this.sessionFilter.isGoodSession().allowed) {
        logger.warn('⏸️  Session filter blocked trade at execution time');
        return;
      }

      if (!this.orderManager.canPlaceTrade()) {
        logger.debug('⏸️  Rate limit — waiting for next trade slot');
        return;
      }

      logger.info(
        `🎯 Signal ${validSignal.signal} ${validSignal.confidence}% | ${validSignal.agreedSignals} agree`
      );

      // ==================== EXECUTE TRADE ====================

      // Calculate safe trade amount and apply size multipliers from filters
      const baseAmount = this.riskManager.calculateTradeAmount(
        currentBalance,
        validSignal.confidence,
        this.aggressionMode
      );
      const sizeMultiplier =
        (econStatus.sizeMultiplier || 1) *
        (volStatus.sizeMultiplier || 1) *
        (cbStatus.level === 1 ? 0.5 : 1) *
        (capitalStatus.maxTradePct ? capitalStatus.maxTradePct / config.MAX_TRADE_PERCENT : 1);
      let tradeAmount = Math.max(1, Math.floor(baseAmount * sizeMultiplier));

      if (tradeAmount === 0) {
        logger.warn('⚠️  Trade amount is 0. Skipping trade.');
        return;
      }

      // Place trade
      const tradeRequest = {
        asset: this.currentAsset,
        direction: validSignal.signal,
        amount: tradeAmount,
        duration: config.OPTION_DURATION,
        signalConfidence: validSignal.confidence,
        strategyReasons: validSignal.reasons,
      };

      this.lastTradeAmount = tradeAmount;
      const tradeResult = await this.orderManager.placeTrade(tradeRequest, currentBalance);

      if (tradeResult) {
        logger.debug('📊 Risk Status:', riskStatus.performance);

        const newBalance = await this.iqConnector.getBalance();
        const stats = this.tradeLogger.getStats();

        if (tradeResult.result === 'WIN' || tradeResult.result === 'LOSS') {
          await telegram.onTrade({
            ...tradeResult,
            asset: this.currentAsset,
            balance: newBalance.toFixed(2),
            winRate: stats.winRate,
            confidence: validSignal.confidence,
            reasons: validSignal.reasons,
          });
        }

        this.pushDashboardStats(newBalance);

        if (this.dashboardServer) {
          this.dashboardServer.updateMetrics({
            lastTrade: { ...tradeResult, confidence: validSignal.confidence },
            lastSignal: validSignal,
          });
        }
      }
    } catch (error) {
      logger.error('Error in candle processing', error);
    } finally {
      this._candleProcessing = false;
    }
  }

  /**
   * Stop the bot gracefully
   */
  async stop() {
    logger.title('🛑 STOPPING BOT');

    try {
      this.isRunning = false;

      if (this._statsInterval) {
        clearInterval(this._statsInterval);
        this._statsInterval = null;
      }

      if (this.unsubscribeCandles) {
        this.unsubscribeCandles();
      }

      await this.iqConnector.disconnect();
      await this.stopDashboard();

      // Print final summary
      const finalStats = this.tradeLogger.getPerformanceMetrics();
      logger.title('📊 FINAL PERFORMANCE SUMMARY');
      console.log(`
Total Trades:    ${finalStats.totalTrades}
Wins:            ${finalStats.totalWins}
Losses:          ${finalStats.totalLosses}
Win Rate:        ${finalStats.winRate}
Total P&L:       $${finalStats.totalPnL}
Average P&L:     $${finalStats.averagePnL}
Best Trade:      $${finalStats.bestTrade}
Worst Trade:     $${finalStats.worstTrade}

Trade log saved to: ${config.TRADE_LOG_PATH}
      `);

      logger.success('✅ Bot stopped');
    } catch (error) {
      logger.error('Error during shutdown', error);
    }

    process.exit(0);
  }
}

// ==================== PROCESS INITIALIZATION ====================

const bot = new TradingBot();

// Handle signals
process.on('SIGINT', () => {
  logger.warn('\n⏹️  SIGINT received. Stopping bot...');
  bot.stop();
});

process.on('SIGTERM', () => {
  logger.warn('\n⏹️  SIGTERM received. Stopping bot...');
  bot.stop();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught Exception', error);
  bot.stop();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled Rejection', reason);
  bot.stop();
});

// Start the bot
if (require.main === module) {
  bot.start().catch((error) => {
    logger.error('Fatal error', error);
    process.exit(1);
  });
}

module.exports = TradingBot;
