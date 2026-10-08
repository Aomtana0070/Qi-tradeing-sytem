import { useMemo } from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import type { BotStatus, Candle, Trade } from '@/types';

interface Props {
  status: BotStatus | null;
  trades: Trade[];
  candles: Candle[];
}

export function ChartWidget({ candles, status }: Props) {
  const points = useMemo(() => {
    const data = candles.slice(-40);
    if (data.length < 2) return null;
    const closes = data.map((c) => c.close);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const range = max - min || 0.0001;
    const w = 100;
    const h = 48;
    const coords = closes
      .map((v, i) => {
        const x = (i / (closes.length - 1)) * w;
        const y = h - ((v - min) / range) * h;
        return `${x},${y}`;
      })
      .join(' ');
    return { coords, min, max, asset: status?.currentAsset };
  }, [candles, status?.currentAsset]);

  return (
    <GlassPanel className="flex h-full min-h-[220px] flex-col" padding="lg">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-ink-muted">Price</p>
          <p className="text-lg font-semibold text-ink">{status?.currentAsset ?? '—'}</p>
        </div>
        {points && (
          <p className="font-mono text-sm text-ink-muted">
            {points.min.toFixed(5)} – {points.max.toFixed(5)}
          </p>
        )}
      </div>
      <div className="flex flex-1 items-end">
        {points ? (
          <svg viewBox="0 0 100 48" className="h-full w-full" preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon
              fill="url(#chartFill)"
              points={`0,48 ${points.coords} 100,48`}
            />
            <polyline
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points.coords}
            />
          </svg>
        ) : (
          <p className="text-sm text-ink-faint">Collecting candle data…</p>
        )}
      </div>
    </GlassPanel>
  );
}
