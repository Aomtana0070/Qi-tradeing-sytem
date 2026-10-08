import { GlassPanel } from '@/components/ui/GlassPanel';
import type { BotStatus, Candle, Trade } from '@/types';

interface Props {
  status: BotStatus | null;
  trades: Trade[];
  candles: Candle[];
}

export function TradesWidget({ trades }: Props) {
  return (
    <GlassPanel className="flex h-full min-h-[220px] flex-col overflow-hidden" padding="none">
      <div className="border-b border-[var(--border)] px-5 py-4">
        <p className="text-xs font-medium uppercase tracking-widest text-ink-muted">Recent Trades</p>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-[var(--surface-raised)] text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-5 py-2 font-medium">Time</th>
              <th className="px-3 py-2 font-medium">Dir</th>
              <th className="px-3 py-2 font-medium">Result</th>
              <th className="px-5 py-2 font-medium text-right">P&L</th>
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-ink-faint">
                  No trades yet
                </td>
              </tr>
            ) : (
              trades.slice(0, 12).map((t, i) => {
                const settled = t.result === 'WIN' || t.result === 'LOSS';
                const win = t.result === 'WIN';
                return (
                  <tr key={`${t.timestamp}-${i}`} className="border-t border-[var(--border)]/50">
                    <td className="px-5 py-2.5 font-mono text-xs text-ink-muted">
                      {new Date(t.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-3 py-2.5">{t.direction}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                          win
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : settled
                              ? 'bg-red-500/15 text-red-300'
                              : 'bg-[var(--surface-overlay)] text-ink-muted'
                        }`}
                      >
                        {settled ? t.result : 'PENDING'}
                      </span>
                    </td>
                    <td
                      className={`px-5 py-2.5 text-right font-mono ${
                        !settled ? 'text-ink-faint' : t.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {settled ? `${t.pnl >= 0 ? '+' : ''}$${t.pnl.toFixed(2)}` : '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </GlassPanel>
  );
}
