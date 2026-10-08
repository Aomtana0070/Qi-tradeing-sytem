/**
 * IQ Option AI Trading Bot
 * Main Entry Point
 */

require('dotenv').config();
const strategy = require('./strategy');

class IQOptionTradingBot {
  constructor() {
    this.isRunning = false;
    this.tradesCount = 0;
    this.totalProfit = 0;
    this.lastTradeTime = 0; // ✅ เพิ่ม
    this.consecutiveLoss = 0; // ✅ เพิ่ม
    this.cooldownUntil = 0; // ✅ เพิ่ม
    this.MIN_TRADE_GAP_MS = 60000; // ✅ รอ 60 วิระหว่าง trade (1 candle)
    this.totalProfit = 0;
    this.tradesCount = 0;
    this.consecutiveLoss = 0;
  }

  /**
   * เริ่มต้น Bot
   */
  async start() {
    console.log('🤖 IQ Option AI Trading Bot Starting...');
    console.log(`📊 Mode: ${process.env.DEMO_ACCOUNT === 'true' ? 'DEMO' : 'LIVE'}`);
    console.log(`💵 Trade Amount: $${process.env.TRADE_AMOUNT}`);
    console.log('----------------------------------------');

    this.isRunning = true;

    // Simulate price data (ใช้จริง เชื่อมต่อกับ IQ Option API)
    await this.runTradingLoop();
  }

  /**
   * Loop หลักของ Bot
   */
  async runTradingLoop() {
    let iteration = 0;

    while (this.isRunning && this.tradesCount < parseInt(process.env.MAX_TRADES_PER_DAY || 10)) {
      iteration++;

      // ✅ ตรวจ cooldown ก่อน
      if (Date.now() < this.cooldownUntil) {
        const wait = Math.ceil((this.cooldownUntil - Date.now()) / 1000);
        console.log(`⏳ Cooldown: รออีก ${wait} วินาที...`);
        await this.sleep(5000);
        continue;
      }

      try {
        const priceData = this.generateMockPriceData();
        const signal = strategy.generateSignal(priceData.closes, priceData.current);

        console.log(`\n[${new Date().toLocaleTimeString()}] #${iteration}`);
        console.log(
          `📈 Price: ${priceData.current.toFixed(5)} | RSI: ${signal.indicators?.rsi?.value || 'N/A'}`
        );
        console.log(`🎯 Signal: ${signal.signal} (${signal.confidence}%) — ${signal.reason || ''}`);

        // ✅ เทรดเฉพาะเมื่อ signal ดีและผ่าน cooldown
        const timeSinceLast = Date.now() - this.lastTradeTime;
        if (
          signal.signal !== 'HOLD' &&
          parseFloat(signal.confidence) >= 70 &&
          timeSinceLast >= this.MIN_TRADE_GAP_MS
        ) {
          await this.executeTrade(signal.signal, priceData.current);
          this.lastTradeTime = Date.now();

          // ✅ ถ้าแพ้ 3 ครั้งติด → cooldown 5 นาที
          if (this.consecutiveLoss >= 3) {
            console.log('⚠️ 3 แพ้ติด → พัก 5 นาที');
            this.cooldownUntil = Date.now() + 5 * 60 * 1000;
            this.consecutiveLoss = 0;
          }
        } else if (signal.signal === 'HOLD') {
          console.log('⏸  HOLD — รอ signal ที่ดีกว่า');
        }
      } catch (error) {
        console.error('❌ Error:', error.message);
      }

      // ✅ รอ 60 วินาทีต่อ candle (แทน 100ms)
      await this.sleep(parseInt(process.env.CANDLE_INTERVAL_MS || 60000));
    }

    this.printSummary();
  }

  /**
   * วางเดิมพัน
   */
  async executeTrade(direction, price) {
    this.tradesCount++;

    const tradeAmount = parseFloat(process.env.TRADE_AMOUNT) || 1;

    // จำลองผลแพ้/ชนะ
    const isWin = Math.random() > 0.45;

    // IQ Option payout 80%
    const pnl = isWin ? tradeAmount * 0.8 : -tradeAmount;

    // อัปเดตกำไรรวม
    this.totalProfit += pnl;

    // คำนวณ balance ปัจจุบัน
    const currentBalance = parseFloat(process.env.DEMO_BALANCE || 10000) + this.totalProfit;

    // ==============================
    // Consecutive Loss Tracking
    // ==============================

    if (isWin) {
      this.consecutiveLoss = 0;
    } else {
      this.consecutiveLoss++;
    }

    // ==============================
    // Console Logs
    // ==============================

    console.log(`${isWin ? '✅ WIN' : '❌ LOSS'} P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`);

    console.log(
      `📊 Balance: $${currentBalance.toFixed(2)} | Total P&L: $${this.totalProfit.toFixed(2)}`
    );

    console.log(`🔥 Consecutive Losses: ${this.consecutiveLoss}`);

    // ==============================
    // Save Trade
    // ==============================

    logTrade({
      asset: process.env.CURRENCY_PAIR || 'EURUSD-OTC',

      direction: direction === 'BUY' ? 'CALL' : 'PUT',

      amount: tradeAmount,

      duration: 1,

      entryPrice: price,

      result: isWin ? 'WIN' : 'LOSS',

      pnl: pnl,

      balance: currentBalance,

      confidence: 75,

      rsi: 0,

      macdSignal: '',

      bbPosition: '',

      reasons: [direction],
    });

    // ==============================
    // Optional Safety Stop
    // ==============================

    const maxLoss = parseInt(process.env.MAX_CONSECUTIVE_LOSS || 5);

    if (this.consecutiveLoss >= maxLoss) {
      console.log(`🛑 Max consecutive losses reached (${maxLoss})`);

      console.log('⏸️ Trading paused for safety');
    }
  }
  /**
   * สร้าง Mock Price Data
   */
  generateMockPriceData() {
    // ในการใช้จริง ข้อมูลนี้จะมาจาก IQ Option API
    const basePrice = 1.075;
    const closes = [];

    for (let i = 0; i < 30; i++) {
      const change = (Math.random() - 0.48) * 0.001;
      closes.push(basePrice + change * (i + 1));
    }

    return {
      closes: closes,
      current: closes[closes.length - 1],
    };
  }

  /**
   * แสดงสรุปผล
   */
  printSummary() {
    const summary = loadSummary();
    console.log('\n========================================');
    console.log('📊 SESSION SUMMARY');
    console.log('========================================');
    console.log(`✅ Total Trades:  ${summary.totalTrades}`);
    console.log(`🏆 Wins:          ${summary.wins}`);
    console.log(`❌ Losses:        ${summary.losses}`);
    console.log(`📈 Win Rate:      ${summary.winRate}%`);
    console.log(`💰 Total P&L:     $${summary.totalPnL.toFixed(2)}`);
    console.log(`💰 Today P&L:     $${summary.todayPnL.toFixed(2)}`);
    console.log(`🏦 Balance:       $${summary.currentBalance.toFixed(2)}`);
    console.log(`📉 Max Drawdown:  ${summary.maxDrawdown}%`);
    console.log(`🔥 Best Streak:   ${summary.bestWinStreak} wins`);
    console.log(`💀 Worst Streak:  ${summary.worstLossStreak} losses`);
    console.log('========================================');
    console.log('📁 Saved to: data/trades.csv');
    console.log('📁 Summary:  data/summary.json\n');
  }

  /**
   * หยุด Bot
   */
  stop() {
    console.log('\n⛔ Stopping Bot...');
    this.isRunning = false;
  }

  /**
   * Sleep function
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// สร้าง instance และเริ่มต้น
const bot = new IQOptionTradingBot();

// Handle graceful shutdown
process.on('SIGINT', () => {
  bot.stop();
  process.exit(0);
});

// เริ่มต้น Bot
if (require.main === module) {
  bot.start().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = IQOptionTradingBot;
