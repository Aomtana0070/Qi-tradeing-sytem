import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { THEMES, spring } from '@/lib/constants';
import { useDashboardStore } from '@/store/dashboardStore';
import type { ThemePreset } from '@/types';
import { MagneticButton } from '@/components/ui/MagneticButton';

export function ThemePanel() {
  const open = useDashboardStore((s) => s.showThemePanel);
  const setOpen = useDashboardStore((s) => s.setShowThemePanel);
  const theme = useDashboardStore((s) => s.theme);
  const setTheme = useDashboardStore((s) => s.setTheme);
  const holographic = useDashboardStore((s) => s.holographic);
  const particles = useDashboardStore((s) => s.particles);
  const neuralNet = useDashboardStore((s) => s.neuralNet);
  const reducedMotion = useDashboardStore((s) => s.reducedMotion);
  const setHolographic = useDashboardStore((s) => s.setHolographic);
  const setParticles = useDashboardStore((s) => s.setParticles);
  const setNeuralNet = useDashboardStore((s) => s.setNeuralNet);
  const setReducedMotion = useDashboardStore((s) => s.setReducedMotion);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close theme panel"
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.aside
            role="dialog"
            aria-label="Theme customization"
            className="glass-panel fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-[var(--border)]"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={spring.soft}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] p-5">
              <h2 className="text-lg font-semibold text-ink">Appearance</h2>
              <MagneticButton size="sm" variant="ghost" onClick={() => setOpen(false)}>
                ✕
              </MagneticButton>
            </div>

            <div className="flex-1 overflow-auto p-5 space-y-6">
              <section>
                <p className="mb-3 text-xs font-medium uppercase tracking-widest text-ink-muted">
                  Color theme
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(THEMES) as ThemePreset[]).map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTheme(id)}
                      className={clsx(
                        'rounded-xl border p-3 text-left transition-all',
                        theme === id
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                          : 'border-[var(--border)] bg-[var(--surface-raised)] hover:bg-[var(--surface-overlay)]'
                      )}
                    >
                      <span
                        className="mb-2 block h-6 w-full rounded-md"
                        style={{ background: THEMES[id].accent }}
                      />
                      <span className="text-sm font-medium text-ink">{THEMES[id].label}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-widest text-ink-muted">
                  Effects
                </p>
                {[
                  ['Holographic panels', holographic, setHolographic],
                  ['Particle field', particles, setParticles],
                  ['Neural network', neuralNet, setNeuralNet],
                  ['Reduce motion', reducedMotion, setReducedMotion],
                ].map(([label, value, setter]) => (
                  <label
                    key={label as string}
                    className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3"
                  >
                    <span className="text-sm text-ink">{label as string}</span>
                    <input
                      type="checkbox"
                      checked={value as boolean}
                      onChange={(e) => (setter as (v: boolean) => void)(e.target.checked)}
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                  </label>
                ))}
              </section>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
