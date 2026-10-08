import { motion } from 'framer-motion';
import clsx from 'clsx';

interface StrategyCardProps {
  id: string;
  label: string;
  description: string;
  active: boolean;
  onToggle: () => void;
}

export function StrategyCard({ label, description, active, onToggle }: StrategyCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={clsx(
        'group relative overflow-hidden rounded-xl border p-4 text-left transition-colors',
        active
          ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
          : 'border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--surface-overlay)]'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ink">{label}</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">{description}</p>
        </div>
        <span
          className={clsx(
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]',
            active
              ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
              : 'border-[var(--border)] text-transparent'
          )}
        >
          ✓
        </span>
      </div>
      {active && (
        <motion.div
          layoutId="strategy-glow"
          className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-[var(--accent)]/30"
          initial={false}
        />
      )}
    </motion.button>
  );
}

interface ExchangeCardProps {
  name: string;
  connected?: boolean;
  active: boolean;
  onToggle: () => void;
}

export function ExchangeCard({ name, connected, active, onToggle }: ExchangeCardProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={clsx(
        'flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all',
        active
          ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
          : 'border-[var(--border)] bg-[var(--surface-raised)] hover:bg-[var(--surface-overlay)]'
      )}
    >
      <div>
        <p className="text-sm font-medium text-ink">{name}</p>
        <p className="text-xs text-ink-muted">
          {connected ? 'Connected' : active ? 'Enabled' : 'Disabled'}
        </p>
      </div>
      <span
        className={clsx(
          'h-2 w-2 rounded-full',
          connected ? 'bg-emerald-400' : active ? 'bg-amber-400' : 'bg-zinc-600'
        )}
      />
    </button>
  );
}

interface RiskPresetCardProps {
  label: string;
  description: string;
  active: boolean;
  onSelect: () => void;
}

export function RiskPresetCard({ label, description, active, onSelect }: RiskPresetCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ scale: 1.02 }}
      className={clsx(
        'rounded-xl border p-4 text-left',
        active
          ? 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-glow'
          : 'border-[var(--border)] bg-[var(--surface-raised)]'
      )}
    >
      <p className="text-sm font-semibold capitalize text-ink">{label}</p>
      <p className="mt-1 text-xs text-ink-muted">{description}</p>
    </motion.button>
  );
}
