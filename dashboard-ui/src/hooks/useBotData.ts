import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { BotStatus, Candle, Trade } from '@/types';

export function useBotData(pollMs = 2500) {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [s, t, c] = await Promise.all([
          api.status(),
          api.trades(),
          api.candles(60),
        ]);
        if (!active) return;
        setStatus(s);
        setTrades(t);
        setCandles(c.candles || []);
        setError(null);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Connection failed');
      }
    };

    load();
    const id = setInterval(load, pollMs);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [pollMs]);

  return { status, trades, candles, error, refresh: () => {} };
}

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}

export function useCursorPosition() {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const move = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', move, { passive: true });
    return () => window.removeEventListener('mousemove', move);
  }, []);

  return pos;
}
