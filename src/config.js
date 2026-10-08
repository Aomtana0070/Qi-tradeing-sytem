/**
 * CONFIGURATION SYSTEM
 * Centralized config file with all trading parameters
 * Risk Rules are HARDCODED and CANNOT be disabled
 */

function parseEnvBoolean(value, defaultValue = false) {
  if (typeof value !== 'string') return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  return defaultValue;
}

module.exports = {
  // ==================== ACCOUNT SETTINGS ====================
  ACCOUNT_TYPE: (process.env.ACCOUNT_TYPE || 'PRACTICE').trim().toUpperCase(),
  CURRENCY_PAIR: process.env.CURRENCY_PAIR || 'EURUSD-OTC', // default asset (EUR/USD)
  SUPPORTED_ASSETS: process.env.SUPPORTED_ASSETS
    ? process.env.SUPPORTED_ASSETS.split(',').map((asset) => asset.trim().toUpperCase())
    : [
        'EURUSD',
        'GBPUSD',
        'USDJPY',
        'AUDUSD',
        'USDCAD',
        'EURUSD-OTC',
        'GBPUSD-OTC',
        'USDJPY-OTC',
        'AUDUSD-OTC',
        'USDCAD-OTC',
        'Terra Classic (OTC)',
        'Bitcoin (OTC)',
        'Ethereum (OTC)',
        'ETH',
        'BTC',
      ], // list of supported assets (can be set via env)
  AGGRESSION_LEVEL: (process.env.AGGRESSION_LEVEL || 'NORMAL').trim().toUpperCase(),
  AGGRESSIVE_MODE: parseEnvBoolean(process.env.AGGRESSIVE_MODE, false),
  AGGRESSIVE_MAX_TRADE_PERCENT: parseInt(process.env.AGGRESSIVE_MAX_TRADE_PERCENT, 10) || 6,
  SUPER_AGGRESSIVE_MAX_TRADE_PERCENT:
    parseInt(process.env.SUPER_AGGRESSIVE_MAX_TRADE_PERCENT, 10) || 8,
  MEGA_AGGRESSIVE_MAX_TRADE_PERCENT:
    parseInt(process.env.MEGA_AGGRESSIVE_MAX_TRADE_PERCENT, 10) || 10,
  ASSET_ACTIVE_ID: process.env.ASSET_ACTIVE_ID
    ? parseInt(process.env.ASSET_ACTIVE_ID, 10) || 76
    : 76, // optional explicit IQ Option asset active_id
  CANDLE_DURATION: parseInt(process.env.CANDLE_DURATION, 10) || 60, // 1-minute candles (seconds)
  OPTION_DURATION: parseInt(process.env.OPTION_DURATION, 10) || 1, // 1-minute binary options

  // ==================== RISK MANAGEMENT (HARDCODED — NON-NEGOTIABLE) ====================
  MAX_TRADE_PERCENT: 4, // 🔴 max 4% of balance per trade (user-updated default)
  MAX_DAILY_LOSS_PERCENT: 10,
  MAX_CONSECUTIVE_LOSSES: 5, // 🔴 pause after 5 losses in a row (prevents revenge trading)
  MIN_BALANCE_THRESHOLD: 1, // 🔴 stop if balance drops below  (emergency preservation)
  COOLDOWN_AFTER_LOSS_MS: 300000, // 🔴 5-minute cooldown after max losses (forced break)
  SESSION_MAX_DRAWDOWN_PERCENT: 15,

  // ==================== STRATEGY CONSENSUS ====================
  MIN_STRATEGIES_AGREE: 2, // at least 2/3 strategies must agree before trading
  MIN_SIGNAL_STRENGTH: 65, // signal confidence must be 65+ (0-100 scale)

  // ==================== RSI SETTINGS ====================
  RSI_PERIOD: 14,

  // ==================== VOLATILITY FILTER SETTINGS ====================
  // ATR expressed as fraction of price (e.g. 0.00015 => 0.015%)
  VOLATILITY_FILTER_ENABLED: parseEnvBoolean(process.env.VOLATILITY_FILTER_ENABLED, false),
  VOLATILITY_MIN_ATR_PCT: parseFloat(process.env.VOLATILITY_MIN_ATR_PCT) || 0.00003,
  VOLATILITY_MAX_ATR_PCT: parseFloat(process.env.VOLATILITY_MAX_ATR_PCT) || 0.00025,
  VOLATILITY_SIZE_MULTIPLIER_THRESHOLD:
    parseFloat(process.env.VOLATILITY_SIZE_MULTIPLIER_THRESHOLD) || 0.00015,
  RSI_OVERBOUGHT: 70, // signal strength 0-100 for overbought
  RSI_OVERSOLD: 30, // signal strength 0-100 for oversold

  // ==================== MACD SETTINGS ====================
  MACD_FAST: 12,
  MACD_SLOW: 26,
  MACD_SIGNAL: 9,

  // ==================== BOLLINGER BANDS SETTINGS ====================
  BB_PERIOD: 20,
  BB_STD_DEV: 2,

  // ==================== TREND DETECTION ====================
  EMA_FAST: 50, // for trend detection
  EMA_SLOW: 200, // for trend detection

  // ==================== DATA & CANDLE SETTINGS ====================
  CANDLE_BUFFER_SIZE: 150, // store last 150 candles in memory
  MIN_CANDLES_FOR_ANALYSIS: parseInt(process.env.MIN_CANDLES_FOR_ANALYSIS, 10) || 15, // need at least 15 candles before analysis starts

  // ==================== TRADING PARAMETERS ====================
  MIN_SECONDS_BETWEEN_TRADES: parseInt(process.env.MIN_SECONDS_BETWEEN_TRADES, 10) || 55, // min gap between auto trades (≥ ~1 candle for 1m options)
  PAPER_TRADE_MODE: parseEnvBoolean(process.env.PAPER_TRADE_MODE, true),
  DEFAULT_TRADE_AMOUNT: null, // calculated dynamically by risk manager
  MIN_TRADE_AMOUNT_USD: 30, // minimum $30 trade size (adjustable for different account currencies)

  // ==================== LOGGING ====================
  LOG_LEVEL: 'info', // 'debug' | 'info' | 'warn' | 'error'
  TRADE_LOG_PATH: './data/trades.csv',
  CONSOLE_COLORS: true, // colorize console output

  // ==================== DATABASE & PERSISTENCE ====================
  ENABLE_TRADE_CSV_LOGGING: true,
  ENABLE_PERFORMANCE_TRACKING: true,

  // ==================== ALERTS ====================
  ENABLE_TELEGRAM_ALERTS: parseEnvBoolean(process.env.ENABLE_TELEGRAM_ALERTS, false), // set to true if TELEGRAM_BOT_TOKEN is provided
  ALERT_ON_ERROR: true,
  ALERT_ON_TRADE: true,
  ALERT_ON_RISK_WARNING: true,

  // ==================== WEB DASHBOARD ====================
  DASHBOARD_ENABLED: parseEnvBoolean(process.env.DASHBOARD_ENABLED, true),
  DASHBOARD_PORT: parseInt(process.env.DASHBOARD_PORT, 10) || 3001,
  DASHBOARD_HOST: process.env.DASHBOARD_HOST || 'localhost',
  DASHBOARD_AUTO_REFRESH_MS: parseInt(process.env.DASHBOARD_AUTO_REFRESH_MS, 10) || 3000,
  SESSION_FILTER_ENABLED: parseEnvBoolean(process.env.SESSION_FILTER_ENABLED, true),

  // ==================== API SETTINGS ====================
  API_TIMEOUT_MS: 10000, // 10-second timeout for API calls
  RECONNECT_MAX_RETRIES: 5, // max 5 reconnection attempts
  RECONNECT_BACKOFF_MS: 2000, // exponential backoff starting at 2sec
  SESSION_HEARTBEAT_MS: 30000, // 30-second heartbeat

  // ==================== BACKTESTING ====================
  BACKTEST_START_BALANCE: 1000, // default $1000 for backtest
  BACKTEST_FEE_PERCENT: 0, // transaction fees (usually 0 for binary options)

  // ==================== VALIDATION & SAFETY ====================
  REQUIRE_USER_CONFIRMATION_FOR_LIVE: true, // if PAPER_TRADE_MODE false, require console confirmation
  VALIDATE_API_RESPONSES: true, // validate all API data before using
  ENABLE_PANIC_STOP: true, // allow emergency stop via keyboard or API

  // ==================== FEATURE FLAGS ====================
  USE_MULTIPLE_TIMEFRAMES: false, // experimental: use 1m + 5m + 15m consensus
  USE_VOLUME_ANALYSIS: false, // experimental: include volume in signals
  USE_SUPPORT_RESISTANCE: false, // experimental: detect S/R levels
  // ==================== ACCOUNT SETTINGS ====================
  ACCOUNT_CURRENCY: (process.env.ACCOUNT_CURRENCY || 'USD').trim().toUpperCase(),
  USD_TO_THB_RATE: parseFloat(process.env.USD_TO_THB_RATE) || 35,
  /**
   * Get human-readable config info
   */
  getInfo() {
    return `
╔════════════════════════════════════════════════════════════╗
║        IQ OPTION TRADING BOT - CONFIGURATION               ║
╠════════════════════════════════════════════════════════════╣
║ Account Type:      ${this.ACCOUNT_TYPE}
║ Asset:             ${this.CURRENCY_PAIR}
║ Asset Active ID:   ${this.ASSET_ACTIVE_ID || 'not set'}
║ Candle Duration:   ${this.CANDLE_DURATION}s
║ Paper Trade Mode:  ${this.PAPER_TRADE_MODE ? '✅ ON (SAFE)' : '⚠️  OFF (LIVE MONEY)'}
║ Order Mode:       ${this.PAPER_TRADE_MODE ? '🚦 Paper simulation (no broker orders)' : '⚠️  Broker orders enabled'}
║
║ 🛡️  RISK PROTECTION:
║   • Max Trade Size:        ${this.MAX_TRADE_PERCENT}% of balance
║   • Daily Loss Limit:      ${this.MAX_DAILY_LOSS_PERCENT}%
║   • Max Consecutive Loss:  ${this.MAX_CONSECUTIVE_LOSSES} trades
║   • Session Drawdown Cap:  ${this.SESSION_MAX_DRAWDOWN_PERCENT}%
║   • Min Balance StopOut:   $${this.MIN_BALANCE_THRESHOLD}
║
║ 📊 STRATEGY:
║   • Aggression Level:      ${this.AGGRESSION_LEVEL}
║   • Hard trade-size cap:   ${this.MAX_TRADE_PERCENT}% in every aggression mode
║   • Min Strategies Agree:  ${this.MIN_STRATEGIES_AGREE}/3
║   • Min Signal Strength:   ${this.MIN_SIGNAL_STRENGTH}%
║   • Candle Buffer:         ${this.CANDLE_BUFFER_SIZE} candles
║   • Session Filter:        ${this.SESSION_FILTER_ENABLED ? 'ENABLED' : 'DISABLED'}
║
║ 🌐 Dashboard: http://${this.DASHBOARD_HOST}:${this.DASHBOARD_PORT}
╚════════════════════════════════════════════════════════════╝
    `.trim();
  },
};
