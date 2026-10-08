import { GlassPanel } from '@/components/ui/GlassPanel';
import type { BotStatus, Candle, Trade } from '@/types';

interface Props {
  status: BotStatus | null;
  trades: Trade[];
  candles: Candle[];
}

function IndicatorBar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs">
        <span className="text-ink-muted">{label}</span>
        <span className="font-mono text-ink">{value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-overlay)]">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function IndicatorsWidget({ status }: Props) {
  const ind = status?.liveIndicators || status?.indicators || {};
  const rsi = typeof ind.rsi === 'number' ? ind.rsi : 50;
  const macd = typeof ind.macd === 'number' ? ind.macd : 0;
  const bb = typeof ind.bb === 'number' ? ind.bb * 100 : 50;

  return (
    <GlassPanel className="h-full min-h-[220px]" padding="lg">
      <p className="mb-5 text-xs font-medium uppercase tracking-widest text-ink-muted">
        Indicators
      </p>
      <div className="space-y-4">
        <IndicatorBar label="RSI" value={rsi} />
        <IndicatorBar label="MACD" value={Math.abs(macd) * 100} max={100} />
        <IndicatorBar label="BB Position" value={bb} />
      </div>
    </GlassPanel>
  );
}
