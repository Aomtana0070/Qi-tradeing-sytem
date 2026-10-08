import type { BotStatus, Candle, Trade } from '@/types';

const BASE = '';

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  return res.json();
}

export const api = {
  status: () => fetchJson<BotStatus>('/api/status'),
  trades: () => fetchJson<Trade[]>('/api/trades'),
  candles: (limit = 50) => fetchJson<{ candles: Candle[] }>(`/api/candles?limit=${limit}`),
  pause: () => fetchJson<{ ok: boolean }>('/api/pause', { method: 'POST' }),
  resume: () => fetchJson<{ ok: boolean }>('/api/resume', { method: 'POST' }),
  manualTrade: (direction: 'CALL' | 'PUT', amount: number) =>
    fetchJson<{ success: boolean; result?: unknown }>('/api/manual-trade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction, amount }),
    }),
  setAggression: (aggressiveMode: string) =>
    fetchJson<{ success: boolean }>('/api/set-aggression', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aggressiveMode }),
    }),
  chat: (message: string) =>
    fetchJson<{ reply: string; source: string }>('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    }),
  getSettings: () => fetchJson<Record<string, unknown>>('/api/settings'),
  saveSettings: (settings: Record<string, unknown>) =>
    fetchJson<{ success: boolean; settings?: unknown }>('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    }),
};
