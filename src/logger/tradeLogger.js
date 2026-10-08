'use strict';
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const CSV_PATH = path.join(DATA_DIR, 'trades.csv');
const STAT_PATH = path.join(DATA_DIR, 'summary.json');

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function ensureTodayStats(summary) {
  const today = todayKey();
  if (summary.todayDate !== today) {
    summary.todayDate = today;
    summary.todayPnL = 0;
    summary.todayTrades = 0;
    summary.todayWins = 0;
    summary.todayLosses = 0;
  }
  return summary;
}

const CSV_HEADERS =
  [
    'timestamp',
    'asset',
    'direction',
    'amount',
    'duration',
    'entry_price',
    'result',
    'pnl',
    'balance_after',
    'confidence',
    'rsi',
    'macd_signal',
    'bb_position',
    'reasons',
  ].join(',') + '\n';

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(CSV_PATH)) fs.writeFileSync(CSV_PATH, CSV_HEADERS);
}

// บันทึก trade ลง CSV (เฉพาะผลที่ settle แล้ว WIN/LOSS)
function logTrade(trade) {
  if (trade.result !== 'WIN' && trade.result !== 'LOSS') {
    return;
  }

  ensureDir();
  const row =
    [
      new Date().toISOString(),
      trade.asset || 'EURUSD-OTC',
      trade.direction || '',
      (trade.amount || 0).toFixed(2),
      trade.duration || 1,
      (trade.entryPrice || 0).toFixed(5),
      trade.result || '',
      (trade.pnl || 0).toFixed(2),
      (trade.balance ?? trade.balance_after ?? 0).toFixed(2),
      trade.confidence || 0,
      (trade.rsi || 0).toFixed(2),
      trade.macdSignal || '',
      trade.bbPosition || '',
      (trade.reasons || []).join('|'),
    ].join(',') + '\n';

  fs.appendFileSync(CSV_PATH, row);
  updateSummary(trade);
}

// อัปเดต summary.json ทุกครั้งที่มี trade
function updateSummary(trade) {
  ensureDir();
  let summary = ensureTodayStats(loadSummary());

  // Only count settled trades in stats
  if (trade.result !== 'WIN' && trade.result !== 'LOSS') {
    return;
  }

  summary.totalTrades++;
  summary.todayTrades = (summary.todayTrades || 0) + 1;
  summary.lastUpdated = new Date().toISOString();

  if (trade.result === 'WIN') {
    summary.wins++;
    summary.todayWins = (summary.todayWins || 0) + 1;
    summary.totalPnL += trade.pnl || 0;
    summary.todayPnL += trade.pnl || 0;
    summary.consecutiveWins++;
    summary.consecutiveLosses = 0;
    if (summary.consecutiveWins > summary.bestWinStreak)
      summary.bestWinStreak = summary.consecutiveWins;
  } else if (trade.result === 'LOSS') {
    summary.losses++;
    summary.todayLosses = (summary.todayLosses || 0) + 1;
    summary.totalPnL += trade.pnl || 0;
    summary.todayPnL += trade.pnl || 0;
    summary.consecutiveLosses++;
    summary.consecutiveWins = 0;
    if (summary.consecutiveLosses > summary.worstLossStreak)
      summary.worstLossStreak = summary.consecutiveLosses;
  }

  const settled = summary.wins + summary.losses;
  summary.winRate =
    settled > 0 ? ((summary.wins / settled) * 100).toFixed(1) : '0.0';

  const tradeBalance = trade.balance ?? trade.balance_after;
  summary.currentBalance =
    typeof tradeBalance === 'number' ? tradeBalance : summary.currentBalance;
  if (summary.currentBalance > summary.peakBalance) summary.peakBalance = summary.currentBalance;

  summary.maxDrawdown =
    summary.peakBalance > 0
      ? (((summary.peakBalance - summary.currentBalance) / summary.peakBalance) * 100).toFixed(2)
      : '0.00';

  fs.writeFileSync(STAT_PATH, JSON.stringify(summary, null, 2));
}

function loadSummary() {
  ensureDir();
  if (!fs.existsSync(STAT_PATH)) {
    const defaultSummary = {
      totalTrades: 0,
      wins: 0,
      losses: 0,
      winRate: '0.0',
      totalPnL: 0,
      todayPnL: 0,
      todayTrades: 0,
      todayWins: 0,
      todayLosses: 0,
      todayDate: todayKey(),
      currentBalance: 0,
      peakBalance: 0,
      maxDrawdown: '0.00',
      consecutiveWins: 0,
      consecutiveLosses: 0,
      bestWinStreak: 0,
      worstLossStreak: 0,
      lastUpdated: null,
      startedAt: new Date().toISOString(),
    };
    fs.writeFileSync(STAT_PATH, JSON.stringify(defaultSummary, null, 2));
    return defaultSummary;
  }
  try {
    return ensureTodayStats(JSON.parse(fs.readFileSync(STAT_PATH, 'utf8')));
  } catch {
    return loadSummary(); // reset if corrupted
  }
}

// ดึง N trades ล่าสุดจาก CSV
function getRecentTrades(n = 50) {
  ensureDir();
  try {
    const lines = fs.readFileSync(CSV_PATH, 'utf8').trim().split('\n');
    return lines
      .slice(1)
      .slice(-n)
      .reverse()
      .map((line) => {
        const [
          timestamp,
          asset,
          direction,
          amount,
          duration,
          entry_price,
          result,
          pnl,
          balance_after,
          confidence,
          rsi,
          macd_signal,
          bb_position,
          reasons,
        ] = line.split(',');
        return {
          timestamp,
          asset,
          direction,
          amount: parseFloat(amount),
          duration: parseInt(duration),
          entryPrice: parseFloat(entry_price),
          result,
          pnl: parseFloat(pnl),
          balance: parseFloat(balance_after),
          confidence: parseInt(confidence),
          rsi: parseFloat(rsi),
          macdSignal: macd_signal,
          bbPosition: bb_position,
          reasons: (reasons || '').split('|'),
        };
      });
  } catch {
    return [];
  }
}

// Reset today P&L ทุกเที่ยงคืน
function resetDailyStats() {
  const summary = ensureTodayStats(loadSummary());
  summary.todayPnL = 0;
  summary.todayTrades = 0;
  summary.todayWins = 0;
  summary.todayLosses = 0;
  summary.todayDate = todayKey();
  fs.writeFileSync(STAT_PATH, JSON.stringify(summary, null, 2));
}

function scheduleDailyReset() {
  const msUntilMidnight = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return midnight - now;
  };

  const scheduleNext = () => {
    setTimeout(() => {
      resetDailyStats();
      scheduleNext();
    }, msUntilMidnight());
  };

  scheduleNext();
}

function getStats() {
  const summary = ensureTodayStats(loadSummary());

  return {
    totalTrades: summary.totalTrades,
    wins: summary.wins,
    losses: summary.losses,
    winRate: summary.winRate,
    todayPnL: summary.todayPnL,
    todayTrades: summary.todayTrades || 0,
    consecutiveWins: summary.consecutiveWins,
    consecutiveLosses: summary.consecutiveLosses,
    currentBalance: summary.currentBalance,
  };
}

function getPerformanceMetrics() {
  const summary = ensureTodayStats(loadSummary());
  const settled = summary.wins + summary.losses;

  return {
    totalTrades: summary.totalTrades,
    totalWins: summary.wins,
    totalLosses: summary.losses,
    winRate: summary.winRate,
    totalPnL: summary.totalPnL,
    todayPnL: summary.todayPnL,
    todayTrades: summary.todayTrades || 0,
    averagePnL: settled > 0 ? (summary.totalPnL / settled).toFixed(2) : 0,
    bestTrade: 0,
    worstTrade: 0,
  };
}

module.exports = {
  logTrade,
  loadSummary,
  getRecentTrades,
  resetDailyStats,
  scheduleDailyReset,
  getStats,
  getPerformanceMetrics,
};
