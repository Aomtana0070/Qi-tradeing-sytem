import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { spring } from '@/lib/constants';
import { TiltCard } from '@/components/ui/TiltCard';

interface SettingsSectionProps {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function SettingsSection({
  title,
  description,
  defaultOpen = true,
  children,
}: SettingsSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <TiltCard intensity={4}>
      <div className="glass-panel overflow-hidden rounded-2xl">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--surface-overlay)]/40"
          aria-expanded={open}
        >
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-ink">{title}</h3>
            {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
          </div>
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={spring.snappy}
            className="text-ink-muted"
            aria-hidden
          >
            ▾
          </motion.span>
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="space-y-4 border-t border-[var(--border)] px-5 py-4">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TiltCard>
  );
}

export function SettingsGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

export function SettingsRow({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}
