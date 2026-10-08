'use strict';
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ✅ ใช้ key จาก .env โดยตรง
const API_KEY = process.env.AI_API_KEY;
const MODEL = process.env.AI_MODEL || 'gemini-2.0-flash-lite';

let genAI = null;
let model = null;

function initGemini() {
  if (!API_KEY) {
    console.warn('⚠️  AI_API_KEY ไม่ได้ตั้งค่า — Luna จะตอบด้วย fallback');
    return false;
  }
  try {
    genAI = new GoogleGenerativeAI(API_KEY);
    // ไม่ใช้ systemInstruction เพราะ Gemini มี bug กับ Thai quotes
    model = genAI.getGenerativeModel({
      model: MODEL,
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 500,
      },
    });
    console.log(`✅ Luna AI initialized (${MODEL})`);
    return true;
  } catch {
    console.error('❌ Gemini init error');
    return false;
  }
}

// Luna's personality prompt
function buildSystemPrompt(botState, stats, trades) {
  return `คุณคือ "Luna" — AI Trading Assistant สาวน้อยน่ารักสดใส ผู้ช่วยเทรด IQ Option
  
บุคลิก:
- พูดภาษาไทยเสมอ ใช้คำลงท้าย "ค่ะ" "นะคะ" "ค่า"
- น่ารัก สดใส ใช้ emoji เยอะๆ เช่น 💜✨📊🎉
- ตอบสั้นๆ กระชับ ไม่เกิน 5 ประโยค
- ห้ามรับประกันกำไร บอกความเสี่ยงด้วยเสมอ

สถานะ bot ตอนนี้:
- Status: ${botState.status || 'RUNNING'} | Asset: ${botState.asset || 'EURUSD-OTC'}
- Balance: $${parseFloat(botState.balance || 0).toFixed(2)}
- Session: ${botState.session || 'Unknown'}

ผลวันนี้:
- Trades: ${stats.todayTrades || 0} | Win Rate: ${stats.winRate || 0}%
- P&L วันนี้: $${parseFloat(stats.todayPnL || 0).toFixed(2)}
- Wins: ${stats.wins || 0} | Losses: ${stats.losses || 0}
- Max Drawdown: ${stats.maxDrawdown || '0.00'}%

5 trades ล่าสุด:
${
  (trades || [])
    .slice(0, 5)
    .map(
      (t) =>
        `  ${t.direction || ''} → ${t.result || ''} $${(t.pnl || 0) > 0 ? '+' : ''}${parseFloat(t.pnl || 0).toFixed(2)}`
    )
    .join('\n') || '  ยังไม่มี trades'
}

Indicators ล่าสุด:
${JSON.stringify(botState.indicators || {}, null, 2)}`;
}

const chatHistory = [];

async function chat(userMessage, botState = {}, stats = {}, trades = []) {
  // Fallback ถ้าไม่มี API key
  if (!model && !initGemini()) {
    return getFallbackReply(userMessage, stats);
  }

  try {
    const systemPrompt = buildSystemPrompt(botState, stats, trades);

    // สร้าง chat session ใหม่ทุกครั้งพร้อม history
    const chatSession = model.startChat({
      history: chatHistory.map((h) => ({
        role: h.role === 'luna' ? 'model' : 'user',
        parts: [{ text: h.text }],
      })),
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.8,
      },
      systemInstruction: systemPrompt,
    });

    const result = await chatSession.sendMessage(userMessage);
    const reply = result.response.text();

    // บันทึก history (จำกัด 20 messages)
    chatHistory.push({ role: 'user', text: userMessage });
    chatHistory.push({ role: 'luna', text: reply });
    if (chatHistory.length > 20) chatHistory.splice(0, 2);

    return reply;
  } catch (error) {
    console.error('❌ Gemini error:', error.message);
    // ถ้า model ไม่รองรับ systemInstruction ลองวิธีอื่น
    if (error.message.includes('systemInstruction')) {
      return await chatFallbackMethod(userMessage, botState, stats, trades);
    }
    return `❌ ขอโทษค่ะ Luna ตอบไม่ได้ตอนนี้: ${error.message}`;
  }
}

// Fallback method ถ้า systemInstruction ไม่รองรับ
async function chatFallbackMethod(userMessage, botState, stats, trades) {
  try {
    const prompt =
      buildSystemPrompt(botState, stats, trades) + '\n\nUser: ' + userMessage + '\nLuna:';
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch {
    return getFallbackReply(userMessage, stats);
  }
}

// Fallback ถ้าไม่มี API
function getFallbackReply(msg, stats) {
  const lc = msg.toLowerCase();
  if (lc.includes('สรุป') || lc.includes('วันนี้'))
    return `📊 วันนี้เทรดไป ${stats.todayTrades || 0} ครั้ง Win Rate ${stats.winRate || 0}% P&L $${parseFloat(stats.todayPnL || 0).toFixed(2)} ค่ะ! กำลังพยายามอยู่นะคะ 💜`;
  if (lc.includes('ไม่เทรด'))
    return '⏸ ตอนนี้ Luna กำลังรอ signal ที่มี confidence สูงพอค่ะ ต้องการ 3/4 indicators เห็นด้วยนะคะ~ ✨';
  if (lc.includes('เสี่ยง'))
    return '🛡️ ความเสี่ยงตอนนี้อยู่ในระดับปกติค่ะ แต่ Binary Options มีความเสี่ยงสูงนะคะ ระวังด้วย 💜';
  return '💜 สวัสดีค่ะ! Luna พร้อมช่วยเสมอ แต่ตอนนี้ยังไม่ได้ตั้งค่า AI_API_KEY ค่ะ ตั้งใน .env แล้วรีสตาร์ทนะคะ~ ✨';
}

function clearHistory() {
  chatHistory.length = 0;
}

module.exports = { chat, clearHistory, initGemini };
