/**
 * Rule-based assistant when Gemini API is unavailable or quota exceeded.
 */

function buildOfflineChatReply(message, state, stats, trades = []) {
  const lower = String(message).toLowerCase();
  const sig = state.lastSignal || state.consensusSignal || {};
  const ind = state.indicators || state.liveIndicators || {};
  const session = state.filters?.session || state.session || {};
  const balance = state.summary?.balance ?? state.balance ?? '—';

  if (lower.includes('สรุป') || lower.includes('วันนี้')) {
    return (
      `📊 **สรุปวันนี้**\n` +
      `• เทรด: ${stats.todayTrades || 0} ครั้ง\n` +
      `• Win rate: ${stats.winRate || 0}%\n` +
      `• P&L วันนี้: $${stats.todayPnL || 0}\n` +
      `• Balance: $${balance}\n` +
      `• ชนะ/แพ้รวม: ${stats.wins || 0}W / ${stats.losses || 0}L`
    );
  }

  if (lower.includes('ไม่เทรด') || lower.includes('wait')) {
    const reasons = [];
    if (session.allowed === false) reasons.push(`Session: ${session.session || 'Off-hours'}`);
    if (sig.signal === 'WAIT')
      reasons.push(`สัญญาณ: WAIT (${(sig.reasons || []).slice(0, 2).join(', ')})`);
    if (state.paused) reasons.push('Bot ถูก Pause');
    if (reasons.length === 0) reasons.push('รอสัญญาณ confidence สูงพอ หรือ filters/risk');
    return `🤔 **ทำไมไม่เทรด**\n${reasons.map((r) => `• ${r}`).join('\n')}`;
  }

  if (lower.includes('indicator')) {
    return (
      `📈 **Indicators**\n` +
      `• RSI: ${ind.rsi ?? '—'}\n` +
      `• Trend: ${ind.trend ?? '—'}\n` +
      `• ADX: ${ind.adx ?? '—'}\n` +
      `• Signal ล่าสุด: ${sig.signal || 'WAIT'} (${sig.confidence || 0}%)`
    );
  }

  if (lower.includes('ความเสี่ยง') || lower.includes('risk')) {
    return (
      `🛡️ **ความเสี่ยง**\n` +
      `• Status: ${state.status}\n` +
      `• Circuit: L${state.circuit ?? state.filters?.circuitBreaker?.level ?? 0}\n` +
      `• Consecutive losses: ${state.summary?.consecutiveLosses ?? '—'}\n` +
      `• หมายเหตุ: เทรดมีความเสี่ยงสูง ห้ามลงทุนเกินที่รับได้`
    );
  }

  if (lower.includes('setting') || lower.includes('ตั้งค่า')) {
    return (
      `⚙️ **แนะนำ Settings**\n` +
      `• เริ่มด้วน PAPER + Session Filter เปิด\n` +
      `• Max trade % ไม่เกิน 2–4%\n` +
      `• ปิด Live จนกว่า WR จะนิ่ง\n` +
      `• Asset: ${state.currentAsset || '—'} | Aggression: ${state.aggressiveMode || 'NORMAL'}`
    );
  }

  const recent =
    trades.length > 0
      ? trades
          .slice(0, 3)
          .map((t) => `• ${t.direction} ${t.result} $${t.pnl}`)
          .join('\n')
      : '• ยังไม่มีเทรดล่าสุด';

  return (
    `ℹ️ **สถานะ Bot** (โหมด Offline Assistant)\n` +
    `• ${state.status} | ${state.currentAsset} | $${balance}\n` +
    `• Signal: ${sig.signal || 'WAIT'}\n` +
    `${recent}\n\n` +
    `💡 Gemini API ไม่ได้ใช้ตอนนี้ — ตั้ง AI_API_KEY หรือรอ quota คืน`
  );
}

module.exports = { buildOfflineChatReply };
