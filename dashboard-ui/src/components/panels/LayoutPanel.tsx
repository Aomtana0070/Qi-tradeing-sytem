import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { DENSITY_GAP, spring, WIDGET_LABELS } from '@/lib/constants';
import { useDashboardStore } from '@/store/dashboardStore';
import type { LayoutDensity, WidgetId } from '@/types';
import { MagneticButton } from '@/components/ui/MagneticButton';

export function LayoutPanel() {
  const open = useDashboardStore((s) => s.showLayoutPanel);
  const setOpen = useDashboardStore((s) => s.setShowLayoutPanel);
  const density = useDashboardStore((s) => s.density);
  const setDensity = useDashboardStore((s) => s.setDensity);
  const widgets = useDashboardStore((s) => s.widgets);
  const toggleWidget = useDashboardStore((s) => s.toggleWidget);
  const resetLayout = useDashboardStore((s) => s.resetLayout);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close layout panel"
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.aside
            role="dialog"
            aria-label="Layout customization"
            className="glass-panel fixed left-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-r border-[var(--border)]"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={spring.soft}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] p-5">
              <h2 className="text-lg font-semibold text-ink">Workspace</h2>
              <MagneticButton size="sm" variant="ghost" onClick={() => setOpen(false)}>
                ✕
              </MagneticButton>
            </div>

            <div className="flex-1 overflow-auto p-5 space-y-6">
              <section>
                <p className="mb-3 text-xs font-medium uppercase tracking-widest text-ink-muted">
                  Density
                </p>
                <div className="flex gap-2">
                  {(Object.keys(DENSITY_GAP) as LayoutDensity[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDensity(d)}
                      className={clsx(
                        'flex-1 rounded-xl border py-2 text-sm capitalize transition-all',
                        density === d
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-ink'
                          : 'border-[var(--border)] text-ink-muted hover:bg-[var(--surface-overlay)]'
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <p className="mb-3 text-xs font-medium uppercase tracking-widest text-ink-muted">
                  Widgets
                </p>
                <div className="space-y-2">
                  {widgets.map((w) => (
                    <label
                      key={w.id}
                      className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3"
                    >
                      <span className="text-sm text-ink">{WIDGET_LABELS[w.id as WidgetId]}</span>
                      <input
                        type="checkbox"
                        checked={w.visible}
                        onChange={() => toggleWidget(w.id)}
                        className="h-4 w-4 accent-[var(--accent)]"
                      />
                    </label>
                  ))}
                </div>
              </section>

              <MagneticButton variant="ghost" className="w-full" onClick={resetLayout}>
                Reset layout
              </MagneticButton>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
