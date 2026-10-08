'use strict';

/**
 * Simple web dashboard for bot status and metrics.
 * Serves on http://localhost:3001 by default.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');

const config = require('../config');
const logger = require('../logger/logger');

const { loadSummary, getRecentTrades } = require('../logger/tradeLogger');

const { buildOfflineChatReply } = require('./offlineChat');

const PUBLIC_DIR = path.join(__dirname, 'public');
const PREMIUM_DIST = path.join(__dirname, '../../dashboard-ui/dist');

let logCollector;
let geminiChat;

try {
  logCollector = require('./logCollector');
} catch {
  logCollector = null;
}

try {
  geminiChat = require('./geminiChat');
} catch {
  geminiChat = null;
}

class DashboardServer {
  constructor(
    onTestTrade,
    onChangeAsset,
    onChangeAggression,
    onManualTrade,
    onUpdateSettings,
    botControls = {},
    candleStore = null
  ) {
    this.onTestTrade = onTestTrade;
    this.onChangeAsset = onChangeAsset;
    this.onChangeAggression = onChangeAggression;
    this.onManualTrade = onManualTrade;
    this.onUpdateSettings = onUpdateSettings;
    this.candleStore = candleStore;

    this.botControls = botControls;

    this.chatHistory = [];
    this.lastChatRequestAt = 0;

    this.app = express();
    this.server = null;

    this.isLiveMode = !config.PAPER_TRADE_MODE;

    // ✅ Global bot state
    this.botState = {
      status: 'RUNNING',
      asset: config.CURRENCY_PAIR || 'EURUSD-OTC',
      balance: 0,
      indicators: {},
      lastSignal: {},
      session: 'London',
      circuit: 0,
      paused: false,
    };

    this.status = {
      app: 'IQ Option Trading Bot Dashboard',
      status: 'starting',
      startedAt: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      message: 'Dashboard initialized...',
      mode: this.isLiveMode ? 'LIVE' : 'PAPER',

      currentAsset: config.CURRENCY_PAIR,

      aggressiveMode: config.AGGRESSION_LEVEL || (config.AGGRESSIVE_MODE ? 'AGGRESSIVE' : 'NORMAL'),

      supportedAssets: config.SUPPORTED_ASSETS,

      metrics: {},

      summary: {
        totalTrades: 0,
        winRate: '0.0',
        totalPnL: '0.00',
        balance: '0.00',
        consecutiveWins: 0,
        consecutiveLosses: 0,
        consecutiveLossLimit: config.MAX_CONSECUTIVE_LOSSES || 3,
        consecutiveStreak: '0',
      },

      priceSeries: [],
      lastTrade: null,
      lastTradeSummary: 'No trades yet',

      lastTestTrade: null,
      lastTestTradeSummary: 'No test trades yet',

      recentTrades: [],
      logs: [],

      settings: {
        maxTradePercent: config.MAX_TRADE_PERCENT,
        aggressiveMaxTradePercent: config.AGGRESSIVE_MAX_TRADE_PERCENT,

        superAggressiveMaxTradePercent: config.SUPER_AGGRESSIVE_MAX_TRADE_PERCENT,

        megaAggressiveMaxTradePercent: config.MEGA_AGGRESSIVE_MAX_TRADE_PERCENT,

        aggressionLevel:
          config.AGGRESSION_LEVEL || (config.AGGRESSIVE_MODE ? 'AGGRESSIVE' : 'NORMAL'),

        maxConsecutiveLosses: config.MAX_CONSECUTIVE_LOSSES,

        startBalance: config.BACKTEST_START_BALANCE,

        minBalanceThreshold: config.MIN_BALANCE_THRESHOLD,

        sessionFilterEnabled: config.SESSION_FILTER_ENABLED,

        liveModeEnabled: !config.PAPER_TRADE_MODE,
      },
    };

    // =========================
    // MIDDLEWARE
    // =========================

    const allowedOrigins = new Set([
      `http://localhost:${config.DASHBOARD_PORT}`,
      `http://127.0.0.1:${config.DASHBOARD_PORT}`,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ]);
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
          },
        },
      })
    );
    this.app.use((req, res, next) => {
      const origin = req.get('origin');
      if (origin && !allowedOrigins.has(origin)) {
        return res.status(403).json({ error: 'Origin not allowed' });
      }
      return next();
    });
    this.app.use(
      cors({
        origin(origin, callback) {
          if (!origin || allowedOrigins.has(origin)) return callback(null, true);
          return callback(null, false);
        },
      })
    );
    this.app.use(express.json({ limit: '32kb' }));

    if (fs.existsSync(PREMIUM_DIST)) {
      this.app.use(express.static(PREMIUM_DIST));
    } else if (fs.existsSync(PUBLIC_DIR)) {
      this.app.use(express.static(PUBLIC_DIR));
    }

    // Serve Luna images from ai pic folder
    const lunaImagesDir = path.join(__dirname, '../../ai pic');
    if (fs.existsSync(lunaImagesDir)) {
      this.app.use(
        '/luna-images',
        express.static(lunaImagesDir, {
          setHeaders: (res) => {
            res.set('Cache-Control', 'public, max-age=3600');
          },
        })
      );
    }

    // =========================
    // API
    // =========================

    // STATUS
    this.app.get('/api/status', (req, res) => {
      res.json({
        ...this.getStatus(),
        botState: this.botState,
      });
    });

    // STATS
    this.app.get('/api/stats', (req, res) => {
      try {
        return res.json(loadSummary());
      } catch {
        return res.json(this.status.summary || {});
      }
    });

    // TRADES
    this.app.get('/api/trades', (req, res) => {
      try {
        return res.json(getRecentTrades(50));
      } catch {
        return res.json(this.status.recentTrades || []);
      }
    });

    // HEALTH
    this.app.get('/api/health', (req, res) => {
      res.json({
        ok: true,
        time: new Date().toISOString(),
      });
    });

    // LOGS
    this.app.get('/api/logs', (req, res) => {
      const logs = logCollector ? logCollector.getAll() : this.status.logs || [];

      res.json({ logs });
    });

    // PAUSE
    this.app.post('/api/pause', (req, res) => {
      this.botControls.pause?.();

      this.status.paused = true;
      this.status.status = 'PAUSED';

      this.updateBotState({
        paused: true,
        status: 'PAUSED',
      });

      res.json({ ok: true });
    });

    // RESUME
    this.app.post('/api/resume', (req, res) => {
      this.botControls.resume?.();

      this.status.paused = false;
      this.status.status = 'RUNNING';

      this.updateBotState({
        paused: false,
        status: 'RUNNING',
      });

      res.json({ ok: true });
    });

    // STOP
    this.app.post('/api/stop', (req, res) => {
      res.json({ ok: true });

      setTimeout(() => {
        this.botControls.stop?.();
        process.exit(0);
      }, 500);
    });

    // =========================
    // CHAT AI
    // =========================

    this.app.post('/api/chat', async (req, res) => {
      const { message } = req.body || {};

      if (!message || !message.trim()) {
        return res.status(400).json({ error: 'No message' });
      }

      const minGapMs = parseInt(process.env.AI_CHAT_MIN_INTERVAL_MS, 10) || 8000;

      const now = Date.now();

      if (now - this.lastChatRequestAt < minGapMs) {
        const waitSec = Math.ceil((minGapMs - (now - this.lastChatRequestAt)) / 1000);

        return res.json({
          reply: `⏳ รอ ${waitSec} วินาทีก่อนถามใหม่`,
          source: 'rate_limit',
          timestamp: new Date().toISOString(),
        });
      }

      this.lastChatRequestAt = now;

      try {
        const stats = loadSummary();
        const trades = getRecentTrades(10);

        const offlineReply = () => buildOfflineChatReply(message, this.getStatus(), stats, trades);

        let reply;
        let source = 'offline';

        const useGemini =
          geminiChat && process.env.AI_API_KEY && process.env.AI_CHAT_MODE !== 'offline';

        if (useGemini) {
          const result = await geminiChat.chat(message.trim(), this.botState, stats, trades);

          if (result.ok) {
            reply = result.reply;
            source = 'gemini';
          } else {
            reply = offlineReply();
          }
        } else {
          reply = offlineReply();
        }

        return res.json({
          reply,
          source,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        return res.json({
          reply: `❌ ${e.message}`,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // CLEAR CHAT
    this.app.post('/api/chat/clear', (req, res) => {
      if (geminiChat?.clearHistory) {
        geminiChat.clearHistory();
      }

      this.chatHistory = [];

      res.json({ ok: true });
    });

    // =========================
    // TEST TRADE
    // =========================

    // CANDLES (for chart)
    this.app.get('/api/candles', (req, res) => {
      const limit = parseInt(req.query.limit) || 50;
      const candleStore = this.candleStore;

      if (!candleStore) {
        return res.json({ candles: [], message: 'CandleStore not initialized' });
      }

      try {
        const candles = candleStore.getCandles ? candleStore.getCandles(limit) : [];
        res.json({
          candles: candles.map((c) => ({
            time: c.time || c.createdAt,
            open: c.open,
            high: c.max,
            low: c.min,
            close: c.close,
            volume: c.volume || 0,
          })),
          count: candles.length,
        });
      } catch (err) {
        logger.error('Candles fetch error:', err);
        res.json({ candles: [], error: err.message });
      }
    });

    // SETTINGS (API)
    this.botSettings = {
      tradingMode: config.PAPER_TRADE_MODE ? 'paper' : 'live',
      tradeAmount: 100,
      accountBalance: 10000,
      tradingAsset: config.CURRENCY_PAIR,
      sessionFilter: config.SESSION_FILTER_ENABLED,
      newsFilter: true,
      volatilityFilter: config.VOLATILITY_FILTER_ENABLED,
      liveTrading: !config.PAPER_TRADE_MODE,
      liveModeEnabled: !config.PAPER_TRADE_MODE,
      maxDailyLoss: config.MAX_DAILY_LOSS_PERCENT,
      sessionMaxDrawdownPercent: config.SESSION_MAX_DRAWDOWN_PERCENT,
      consecutiveLossLimit: config.MAX_CONSECUTIVE_LOSSES,
      maxConsecutiveLosses: config.MAX_CONSECUTIVE_LOSSES,
      maxTradePercent: config.MAX_TRADE_PERCENT,
      minBalanceThreshold: config.MIN_BALANCE_THRESHOLD,
      rsiPeriod: config.RSI_PERIOD,
      rsiOverbought: config.RSI_OVERBOUGHT,
      rsiOversold: config.RSI_OVERSOLD,
      macdFast: config.MACD_FAST,
      macdSlow: config.MACD_SLOW,
      macdSignal: config.MACD_SIGNAL,
      minConfidence: config.MIN_SIGNAL_STRENGTH,
      minStrategiesAgree: config.MIN_STRATEGIES_AGREE,
      timezone: 'Asia/Bangkok',
      aggressionMode: config.AGGRESSION_LEVEL,
      aggressionLevel: config.AGGRESSION_LEVEL,
    };

    this.app.get('/api/settings', (req, res) => {
      res.json(this.botSettings);
    });

    this.app.post('/api/settings', async (req, res) => {
      const newSettings = req.body;
      if (!newSettings || typeof newSettings !== 'object' || Array.isArray(newSettings)) {
        return res.status(400).json({ success: false, error: 'Settings must be a JSON object' });
      }

      // Handle aggression mode change if present
      try {
        if (newSettings.aggressionMode && this.onChangeAggression) {
          await this.onChangeAggression(newSettings.aggressionMode);
        }

        const nextSettings = { ...this.botSettings, ...newSettings };
        if (this.onUpdateSettings && typeof this.onUpdateSettings === 'function') {
          await this.onUpdateSettings(nextSettings);
        }
        this.botSettings = nextSettings;
      } catch (error) {
        logger.warn('Settings update rejected:', error.message);
        return res.status(400).json({ success: false, error: error.message });
      }

      logger.success('⚙️ Settings updated:', this.botSettings);
      res.json({ success: true, settings: this.botSettings });
    });

    this.app.post('/api/test-trade', async (req, res) => {
      if (!this.onTestTrade) {
        return res.status(500).json({
          success: false,
          error: 'Test trade callback not configured',
        });
      }

      try {
        const result = await this.onTestTrade();

        this.status.lastTestTrade = result;

        this.status.lastTestTradeSummary = this.formatTradeSummary(result);

        this.status.lastUpdate = new Date().toISOString();

        return res.json({
          success: true,
          result,
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // MANUAL TRADE (CALL/PUT)
    this.app.post('/api/manual-trade', async (req, res) => {
      const { direction, amount } = req.body || {};

      if (!direction || !amount) {
        return res.status(400).json({
          success: false,
          error: 'direction and amount required',
        });
      }

      if (!this.onManualTrade) {
        return res.status(500).json({
          success: false,
          error: 'Manual trade callback not configured',
        });
      }

      try {
        const result = await this.onManualTrade({
          direction: direction.toUpperCase(),
          amount: parseFloat(amount),
        });

        this.status.lastManualTrade = result;
        this.status.lastUpdate = new Date().toISOString();

        logger.success(`📊 Manual ${direction} trade executed: $${amount}`);

        return res.json({
          success: true,
          result,
          message: `✅ ${direction} trade placed: $${amount}`,
        });
      } catch (error) {
        logger.error(`❌ Manual trade error: ${error.message}`);
        return res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // SET AGGRESSION MODE
    this.app.post('/api/set-aggression', async (req, res) => {
      const { aggressiveMode } = req.body || {};

      if (!aggressiveMode) {
        return res.status(400).json({
          success: false,
          error: 'aggressiveMode required',
        });
      }

      try {
        if (this.onChangeAggression && typeof this.onChangeAggression === 'function') {
          await this.onChangeAggression(aggressiveMode);
        }

        this.status.aggressiveMode = aggressiveMode;
        this.status.lastUpdate = new Date().toISOString();

        logger.success(`🎯 Aggression mode changed to: ${aggressiveMode}`);

        return res.json({
          success: true,
          aggressiveMode,
          message: `✅ Mode changed to ${aggressiveMode}`,
        });
      } catch (error) {
        logger.error(`❌ Aggression mode error: ${error.message}`);
        return res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });

    // =========================
    // ROOT
    // =========================

    this.app.get('/', (req, res) => {
      const premiumIndex = path.join(PREMIUM_DIST, 'index.html');
      const legacyIndex = path.join(PUBLIC_DIR, 'index.html');

      if (fs.existsSync(premiumIndex)) {
        return res.sendFile(premiumIndex);
      }

      if (fs.existsSync(legacyIndex)) {
        return res.sendFile(legacyIndex);
      }

      return res.send(`
        <html>
          <head>
            <title>IQ Dashboard</title>
            <style>
              body {
                background:#111;
                color:#eee;
                font-family:Arial;
                padding:20px;
              }

              .card {
                background:#1b1b1b;
                padding:20px;
                border-radius:10px;
              }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>IQ Option Dashboard</h1>

              <p>Status: ${this.status.status}</p>
              <p>Mode: ${this.status.mode}</p>
              <p>Asset: ${this.status.currentAsset}</p>

              <hr />

              <h2>API</h2>

              <ul>
                <li>/api/status</li>
                <li>/api/stats</li>
                <li>/api/trades</li>
                <li>/api/health</li>
                <li>/api/chat</li>
              </ul>
            </div>
          </body>
        </html>
      `);
    });
  }

  // =========================
  // START
  // =========================

  start() {
    return new Promise((resolve, reject) => {
      if (!['localhost', '127.0.0.1', '::1'].includes(config.DASHBOARD_HOST)) {
        return reject(new Error('Dashboard host must be loopback; remote binding is disabled'));
      }
      this.server = this.app.listen(config.DASHBOARD_PORT, config.DASHBOARD_HOST, () => {
        this.status.status = 'RUNNING';

        logger.info(
          `🌐 Dashboard running at http://${config.DASHBOARD_HOST}:${config.DASHBOARD_PORT}`
        );

        resolve();
      });

      this.server.on('error', (error) => {
        logger.error('❌ Dashboard failed', error);

        reject(error);
      });
    });
  }

  // =========================
  // STOP
  // =========================

  stop() {
    return new Promise((resolve) => {
      if (!this.server) {
        return resolve();
      }

      this.server.close(() => {
        logger.info('🛑 Dashboard server stopped');

        resolve();
      });
    });
  }

  // =========================
  // UPDATE BOT STATE
  // =========================

  updateBotState(newState = {}) {
    this.botState = {
      ...this.botState,
      ...newState,
    };
  }

  // =========================
  // UPDATE METRICS
  // =========================

  updateMetrics(metrics = {}) {
    this.status.metrics = {
      ...this.status.metrics,
      ...metrics,
    };

    if (metrics.currentAsset) {
      this.status.currentAsset = metrics.currentAsset;
    }

    if (metrics.summary) {
      this.status.summary = {
        ...this.status.summary,
        ...metrics.summary,
      };
    }

    if (metrics.balance !== undefined) {
      this.status.balance = metrics.balance;
    }

    if (Array.isArray(metrics.recentTrades)) {
      this.status.recentTrades = metrics.recentTrades;
    }

    if (Array.isArray(metrics.priceSeries)) {
      this.status.priceSeries = metrics.priceSeries.slice(-50);
    }

    if (metrics.liveIndicators) {
      this.status.liveIndicators = metrics.liveIndicators;
    }

    if (metrics.lastSignal) {
      this.status.lastSignal = metrics.lastSignal;
    }

    if (metrics.status) {
      this.status.status = metrics.status;
    }

    if (metrics.paused !== undefined) {
      this.status.paused = metrics.paused;
    }

    // sync botState
    this.updateBotState({
      status: this.status.status,
      asset: this.status.currentAsset,
      balance: this.status.balance,
      indicators: this.status.liveIndicators || {},
      lastSignal: this.status.lastSignal || {},
      session: this.status.session || 'Unknown',
      circuit: this.status.circuit || 0,
      paused: this.status.paused || false,
    });

    if (logCollector) {
      try {
        this.status.logs = logCollector.getAll();
      } catch {}
    }

    this.status.lastUpdate = new Date().toISOString();

    this.status.message = 'Bot is running';
  }

  // =========================
  // FORMAT TRADE
  // =========================

  formatTradeSummary(trade) {
    if (!trade || !trade.result) {
      return 'No trade result';
    }

    const pnlValue =
      typeof trade.pnl === 'number' ? `${trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}` : 'N/A';

    return `${trade.direction || 'TRADE'} ${trade.asset || ''} $${
      trade.amount || 0
    } → ${trade.result} (${pnlValue})`;
  }

  // =========================
  // STATUS
  // =========================

  getStatus() {
    let fileSummary = {};
    try {
      fileSummary = loadSummary();
    } catch {
      fileSummary = {};
    }

    const summary = { ...fileSummary, ...this.status.summary };
    const balance =
      typeof this.status.balance === 'number'
        ? this.status.balance
        : parseFloat(this.status.balance) ||
          summary.currentBalance ||
          parseFloat(summary.balance) ||
          0;

    const consecutiveWins = summary.consecutiveWins || 0;
    const consecutiveLosses = summary.consecutiveLosses || 0;
    const streak = consecutiveWins > 0 ? consecutiveWins : consecutiveLosses;
    const streakType = consecutiveWins > 0 ? 'win' : consecutiveLosses > 0 ? 'loss' : 'none';

    return {
      ...this.status,
      balance,
      winRate: summary.winRate || '0.0',
      dailyPnL: summary.todayPnL ?? 0,
      todayPnL: summary.todayPnL ?? 0,
      todayTrades: summary.todayTrades ?? 0,
      streak,
      streakType,
      summary,
      indicators: this.status.liveIndicators || this.status.indicators || {},
      uptimeSeconds: process.uptime().toFixed(0),
    };
  }
}

module.exports = DashboardServer;

module.exports.updateBotState = function (server, state) {
  if (server && typeof server.updateBotState === 'function') {
    server.updateBotState(state);
  }
};
