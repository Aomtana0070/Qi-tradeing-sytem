/**
 * TELEGRAM ALERTS
 */

const axios = require('axios');
const config = require('../config');
const logger = require('./logger');

async function send(msg) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId || !config.ENABLE_TELEGRAM_ALERTS) return;

  try {
    await axios.post(
      `https://api.telegram.org/bot${token}/sendMessage`,
      { chat_id: chatId, text: msg, parse_mode: 'HTML' },
      { timeout: 5000 }
    );
  } catch (e) {
    logger.warn('Telegram send failed:', e.message);
  }
}

async function onTrade(trade) {
  if (!config.ALERT_ON_TRADE) return;
  const emoji = trade.result === 'WIN' ? '✅' : '❌';
  await send(
    `${emoji} <b>${trade.result}</b>\n` +
      `💱 ${trade.asset} | ${trade.direction}\n` +
      `💰 $${trade.amount} → P&L: <b>${trade.pnl > 0 ? '+' : ''}$${trade.pnl}</b>\n` +
      `📊 Balance: $${trade.balance} | WR: ${trade.winRate || 'N/A'}\n` +
      `🎯 Confidence: ${trade.confidence}% | ${(trade.reasons || []).join(', ')}`
  );
}

async function onAlert(type, msg) {
  await send(`${type === 'EMERGENCY' ? '🚨' : type === 'WARNING' ? '⚠️' : 'ℹ️'} <b>${type}</b>\n${msg}`);
}

async function sendDailyReport(stats, balance) {
  await send(
    `📊 <b>Daily Report</b>\n` +
      `Trades: ${stats.todayTrades} | WR: ${stats.winRate}%\n` +
      `P&L: ${stats.todayPnL > 0 ? '+' : ''}$${stats.todayPnL}\n` +
      `Balance: $${balance}`
  );
}

module.exports = { send, onTrade, onAlert, sendDailyReport };
