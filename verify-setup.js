/**
 * SETUP VERIFICATION & NEXT STEPS
 * Run this to verify the bot is properly configured
 */

const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'src/index.js',
  'src/config.js',
  'src/api/iqConnector.js',
  'src/data/candleStore.js',
  'src/data/indicators.js',
  'src/strategy/rsiStrategy.js',
  'src/strategy/macdStrategy.js',
  'src/strategy/bollingerStrategy.js',
  'src/strategy/consensusFilter.js',
  'src/risk/riskManager.js',
  'src/execution/orderManager.js',
  'src/logger/logger.js',
  'src/logger/tradeLogger.js',
  'package.json',
  '.env',
  '.env.example',
];

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  IQ OPTION AI TRADING BOT - SETUP VERIFICATION             ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('📋 Checking required files...\n');

const allFilesPresent = requiredFiles.every((file) => {
  const filePath = path.join(__dirname, file);
  const exists = fs.existsSync(filePath);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${file}`);
  return exists;
});

console.log('\n');

if (allFilesPresent) {
  console.log('✅ All required files present!\n');
  console.log('🎯 NEXT STEPS:\n');
  console.log('1. Install dependencies:');
  console.log('   npm install\n');
  console.log('2. Configure .env file:');
  console.log('   nano .env\n');
  console.log('3. Start bot using the PAPER_TRADE_MODE value in .env:');
  console.log('   npm start\n');
  console.log('4. Monitor web dashboard:');
  console.log('   http://localhost:3001\n');
  console.log('5. After 30 days of paper trading, review trades.csv\n');
  console.log('6. If satisfied, modify .env:');
  console.log('   PAPER_TRADE_MODE=false\n');
  console.log('⚠️ Remember: Only use real money after extensive backtesting!\n');
} else {
  console.log('❌ Some files are missing! Please check your setup.\n');
}

console.log('═'.repeat(60) + '\n');
