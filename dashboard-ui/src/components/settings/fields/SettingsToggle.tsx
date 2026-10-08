import { motion } from 'framer-motion';
import clsx from 'clsx';

interface SettingsToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

export function SettingsToggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: SettingsToggleProps) {
  return (
    <label
      className={clsx(
        'group flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3.5 transition-colors hover:bg-[var(--surface-overlay)]',
        disabled && 'pointer-events-none opacity-50'
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">{description}</span>
        )}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface-overlay)] p-0.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        <motion.span
          className="block h-5 w-5 rounded-full bg-white shadow-sm"
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          animate={{ x: checked ? 20 : 0 }}
        />
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full"
          animate={{ backgroundColor: checked ? 'var(--accent-soft)' : 'transparent' }}
          transition={{ duration: 0.2 }}
        />
      </button>
    </label>
  );
}
