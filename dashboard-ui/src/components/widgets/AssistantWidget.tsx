import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { AIOrb } from '@/components/ui/AIOrb';
import { api } from '@/lib/api';
import type { BotStatus, Candle, Trade } from '@/types';
import type { ChatMessage } from '@/types';

interface Props {
  status: BotStatus | null;
  trades: Trade[];
  candles: Candle[];
}

export function AssistantWidget({ status }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await api.chat(text);
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: res.reply,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Unable to reach assistant. Check bot connection.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassPanel className="flex h-full min-h-[280px] flex-col overflow-hidden" padding="none">
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
        <AIOrb active={loading} />
        <div>
          <p className="font-semibold text-ink">Luna</p>
          <p className="text-xs text-ink-muted">
            {status?.status ?? 'Offline'} · AI trading assistant
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-auto px-5 py-4" role="log" aria-live="polite">
        {messages.length === 0 && (
          <p className="text-sm text-ink-faint">
            Ask about performance, strategy, or current market conditions.
          </p>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm ${
                m.role === 'user'
                  ? 'ml-auto bg-[var(--accent-soft)] text-ink'
                  : 'bg-[var(--surface-raised)] text-ink-muted'
              }`}
            >
              {m.content}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex gap-2 border-t border-[var(--border)] p-4">
        <input
          aria-label="Message Luna"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask Luna anything…"
          className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-[var(--accent)] focus:outline-none"
        />
        <MagneticButton onClick={send} disabled={loading}>
          Send
        </MagneticButton>
      </div>
    </GlassPanel>
  );
}
