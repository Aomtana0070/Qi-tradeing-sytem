import { useState } from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { api } from '@/lib/api';
import type { BotStatus, Candle, Trade } from '@/types';

interface Props {
  status: BotStatus | null;
  trades: Trade[];
  candles: Candle[];
}

export function ControlsWidget({ status }: Props) {
  const [amount, setAmount] = useState(30);
  const [busy, setBusy] = useState(false);
  const paused = status?.paused ?? false;

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassPanel className="flex h-full min-h-[220px] flex-col gap-4" padding="lg">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-ink-muted">Controls</p>
        <p className="mt-1 text-sm text-ink-faint">
          {status?.currentAsset} · {status?.aggressiveMode ?? 'NORMAL'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <MagneticButton
          size="sm"
          variant={paused ? 'success' : 'ghost'}
          disabled={busy}
          onClick={() => act(() => (paused ? api.resume() : api.pause()))}
        >
          {paused ? '▶ Resume' : '⏸ Pause'}
        </MagneticButton>
        <MagneticButton
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => act(() => api.setAggression('AGGRESSIVE'))}
        >
          ⚡ Aggressive
        </MagneticButton>
      </div>

      <div>
        <label htmlFor="trade-amt" className="mb-2 block text-xs text-ink-muted">
          Trade amount (USD)
        </label>
        <input
          id="trade-amt"
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 font-mono text-sm text-ink focus:border-[var(--accent)] focus:outline-none"
        />
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2">
        <MagneticButton
          variant="success"
          disabled={busy}
          onClick={() => act(() => api.manualTrade('CALL', amount))}
        >
          CALL ↑
        </MagneticButton>
        <MagneticButton
          variant="danger"
          disabled={busy}
          onClick={() => act(() => api.manualTrade('PUT', amount))}
        >
          PUT ↓
        </MagneticButton>
      </div>
    </GlassPanel>
  );
}
