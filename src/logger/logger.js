/**
 * LOGGER UTILITY
 * Centralized logging with colors and levels
 */

const config = require('../config');
let logCollector;
try {
  logCollector = require('../dashboard/logCollector');
} catch {
  logCollector = null;
}

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const levels = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const currentLevel = levels[config.LOG_LEVEL.toUpperCase()] || levels.INFO;

function formatTime() {
  const now = new Date();
  return now.toLocaleTimeString('th-TH', { hour12: false });
}

function formatMessage(level, message, data = '') {
  const time = formatTime();
  const useColors = config.CONSOLE_COLORS;

  const levelColors = {
    DEBUG: colors.cyan,
    INFO: colors.blue,
    WARN: colors.yellow,
    ERROR: colors.red,
  };

  const colorCode = levelColors[level] || '';
  const dataStr = data ? ` | ${JSON.stringify(data)}` : '';

  if (useColors) {
    return `${colorCode}[${time}] [${level}]${colors.reset} ${message}${dataStr}`;
  }
  return `[${time}] [${level}] ${message}${dataStr}`;
}

const logger = {
  debug(message, data) {
    if (currentLevel <= levels.DEBUG) {
      const formatted = formatMessage('DEBUG', message, data);
      console.log(formatted);
      if (logCollector) logCollector.push({ level: 'DEBUG', message, data });
    }
  },

  info(message, data) {
    if (currentLevel <= levels.INFO) {
      const formatted = formatMessage('INFO', message, data);
      console.log(formatted);
      if (logCollector) logCollector.push({ level: 'INFO', message, data });
    }
  },

  warn(message, data) {
    if (currentLevel <= levels.WARN) {
      const formatted = formatMessage('WARN', message, data);
      console.warn(formatted);
      if (logCollector) logCollector.push({ level: 'WARN', message, data });
    }
  },

  error(message, error = '') {
    if (currentLevel <= levels.ERROR) {
      const errorMsg = error instanceof Error ? error.message : error;
      const formatted = formatMessage('ERROR', message, errorMsg);
      console.error(formatted);
      if (logCollector) logCollector.push({ level: 'ERROR', message, error: errorMsg });
    }
  },

  success(message, data) {
    if (currentLevel <= levels.INFO) {
      const time = formatTime();
      const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
      if (config.CONSOLE_COLORS) {
        const formatted = `${colors.green}[${time}] [SUCCESS]${colors.reset} ${message}${dataStr}`;
        console.log(formatted);
        if (logCollector) logCollector.push({ level: 'SUCCESS', message, data });
      } else {
        const formatted = `[${time}] [SUCCESS] ${message}${dataStr}`;
        console.log(formatted);
        if (logCollector) logCollector.push({ level: 'SUCCESS', message, data });
      }
    }
  },

  separator() {
    console.log('─'.repeat(80));
  },

  title(text) {
    const padding = Math.max(0, Math.floor((80 - text.length) / 2));
    console.log('\n' + '═'.repeat(80));
    console.log(' '.repeat(padding) + text);
    console.log('═'.repeat(80) + '\n');
  },
};

module.exports = logger;
