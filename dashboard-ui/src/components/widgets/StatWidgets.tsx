import { GlassPanel } from '@/components/ui/GlassPanel';
import { TiltCard } from '@/components/ui/TiltCard';
import type { BotStatus, Candle, Trade } from '@/types';

interface WidgetProps {
  status: BotStatus | null;
  trades: Trade[];
  candles: Candle[];
}

export function BalanceWidget({ status }: WidgetProps) {
  const balance = status?.balance ?? 0;
  const mode = status?.mode ?? '—';

  return (
    <TiltCard className="h-full">
      <GlassPanel className="h-full" padding="lg">
        <p className="text-xs font-medium uppercase tracking-widest text-ink-muted">Balance</p>
        <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-ink">
          ${balance.toFixed(2)}
        </p>
        <p className="mt-2 text-sm text-ink-faint">{mode} account</p>
      </GlassPanel>
    </TiltCard>
  );
}

export function WinRateWidget({ status }: WidgetProps) {
  const winRate = status?.winRate ?? status?.summary?.winRate ?? '0.0';
  const total = status?.summary?.totalTrades ?? 0;

  return (
    <TiltCard className="h-full">
      <GlassPanel className="h-full" padding="lg">
        <p className="text-xs font-medium uppercase tracking-widest text-ink-muted">Win Rate</p>
        <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-ink">
          {String(winRate).includes('%') ? winRate : `${winRate}%`}
        </p>
        <p className="mt-2 text-sm text-ink-faint">{total} settled trades</p>
      </GlassPanel>
    </TiltCard>
  );
}

export function TodayPnlWidget({ status }: WidgetProps) {
  const pnl = status?.todayPnL ?? status?.dailyPnL ?? 0;
  const positive = pnl >= 0;

  return (
    <TiltCard className="h-full">
      <GlassPanel className="h-full" padding="lg">
        <p className="text-xs font-medium uppercase tracking-widest text-ink-muted">Today P&L</p>
        <p
          className={`mt-2 font-mono text-3xl font-semibold tracking-tight ${positive ? 'text-emerald-400' : 'text-red-400'}`}
        >
          {positive ? '+' : ''}${pnl.toFixed(2)}
        </p>
        <p className="mt-2 text-sm text-ink-faint">{status?.todayTrades ?? 0} trades today</p>
      </GlassPanel>
    </TiltCard>
  );
}

export function StreakWidget({ status }: WidgetProps) {
  const streak = status?.streak ?? 0;
  const type = status?.streakType ?? 'none';

  return (
    <TiltCard className="h-full">
      <GlassPanel className="h-full" padding="lg">
        <p className="text-xs font-medium uppercase tracking-widest text-ink-muted">Streak</p>
        <p
          className={`mt-2 font-mono text-3xl font-semibold tracking-tight ${type === 'win' ? 'text-emerald-400' : type === 'loss' ? 'text-red-400' : 'text-ink'}`}
        >
          {streak}
        </p>
        <p className="mt-2 text-sm text-ink-faint">
          {type === 'win' ? 'Win streak' : type === 'loss' ? 'Loss streak' : 'No active streak'}
        </p>
      </GlassPanel>
    </TiltCard>
  );
}
