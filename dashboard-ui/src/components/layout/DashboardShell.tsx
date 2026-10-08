import { lazy, Suspense, useState, useEffect } from 'react';

import { motion } from 'framer-motion';

import { Spotlight } from '@/components/ui/Spotlight';

import { MagneticButton } from '@/components/ui/MagneticButton';

import { PageTransition } from '@/components/ui/PageTransition';

import { WidgetGrid } from '@/components/layout/WidgetGrid';
import { FeatureGuide } from '@/components/layout/FeatureGuide';

import { ChartWidget } from '@/components/widgets/ChartWidget';

import { TradesWidget } from '@/components/widgets/TradesWidget';

import { ThemePanel } from '@/components/panels/ThemePanel';

import { LayoutPanel } from '@/components/panels/LayoutPanel';

import { SettingsPage } from '@/components/settings/SettingsPage';

import { useBotData, usePrefersReducedMotion } from '@/hooks/useBotData';

import { useDashboardStore } from '@/store/dashboardStore';

const FloatingScene = lazy(() =>
  import('@/components/scene/FloatingScene').then((m) => ({ default: m.FloatingScene }))
);

type View = 'command' | 'analytics' | 'settings' | 'guide';

const VIEW_META: Record<View, { title: string; subtitle: string }> = {
  command: { title: 'Command', subtitle: 'Premium trading workspace' },

  analytics: { title: 'Analytics', subtitle: 'Performance focus view' },

  settings: { title: 'Settings', subtitle: 'Configure your trading engine' },
  guide: { title: 'Guide', subtitle: 'Features, safety, and limitations' },
};

export function DashboardShell() {
  const [view, setView] = useState<View>('command');

  const { status, trades, candles, error } = useBotData();

  const setShowTheme = useDashboardStore((s) => s.setShowThemePanel);

  const setShowLayout = useDashboardStore((s) => s.setShowLayoutPanel);

  const setReducedMotion = useDashboardStore((s) => s.setReducedMotion);

  const systemReduced = usePrefersReducedMotion();

  useEffect(() => {
    if (systemReduced) setReducedMotion(true);
  }, [systemReduced, setReducedMotion]);

  const isRunning = status?.status?.toUpperCase() === 'RUNNING' && !status?.paused;

  const meta = VIEW_META[view];

  return (
    <div className="relative h-full overflow-hidden bg-[var(--bg)] text-ink">
      {view !== 'settings' && (
        <Suspense fallback={<div aria-hidden className="fixed inset-0 -z-10 bg-[var(--bg)]" />}>
          <FloatingScene />
        </Suspense>
      )}

      <Spotlight />

      <div className="relative z-10 flex h-full flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/80 px-4 py-4 backdrop-blur-xl md:px-6">
          <div className="flex items-center gap-4">
            <motion.div
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent)]"
              whileHover={{ scale: 1.05 }}
            >
              IQ
            </motion.div>

            <div>
              <h1 className="text-base font-semibold tracking-tight text-ink">{meta.title}</h1>

              <p className="text-xs text-ink-muted">{meta.subtitle}</p>
            </div>
          </div>

          <nav
            className="hidden items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-1 lg:flex"
            aria-label="Views"
          >
            {(
              [
                { id: 'command' as View, label: 'Command' },

                { id: 'analytics' as View, label: 'Analytics' },

                { id: 'settings' as View, label: 'Settings' },
                { id: 'guide' as View, label: 'Guide' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className={`rounded-lg px-4 py-1.5 text-sm transition-colors ${
                  view === item.id
                    ? 'bg-[var(--accent-soft)] font-medium text-ink'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <span
              className={`hidden items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium sm:inline-flex ${
                isRunning ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${isRunning ? 'animate-pulse bg-emerald-400' : 'bg-amber-400'}`}
              />

              {status?.paused ? 'Paused' : (status?.status ?? 'Connecting')}
            </span>

            {view !== 'settings' && (
              <>
                <MagneticButton size="sm" variant="ghost" onClick={() => setShowLayout(true)}>
                  Layout
                </MagneticButton>

                <MagneticButton size="sm" variant="ghost" onClick={() => setShowTheme(true)}>
                  Theme
                </MagneticButton>
              </>
            )}
          </div>
        </header>

        {/* Mobile nav */}

        <div className="flex gap-1 border-b border-[var(--border)] p-2 lg:hidden">
          {(['command', 'analytics', 'settings', 'guide'] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`flex-1 rounded-lg py-2 text-xs capitalize ${
                view === v ? 'bg-[var(--accent-soft)] text-ink' : 'text-ink-muted'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {error && view !== 'settings' && view !== 'guide' && (
          <div className="mx-4 mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2 text-sm text-amber-200 md:mx-6">
            {error} — start bot with <code className="font-mono">npm start</code>
          </div>
        )}

        <main className="min-h-0 flex-1 overflow-hidden">
          <PageTransition pageKey={view}>
            {view === 'command' && (
              <div className="h-full overflow-auto p-4 md:p-6">
                <WidgetGrid status={status} trades={trades} candles={candles} />
              </div>
            )}

            {view === 'analytics' && (
              <div className="h-full overflow-auto p-4 md:p-6">
                <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2">
                  <ChartWidget status={status} trades={trades} candles={candles} />

                  <TradesWidget status={status} trades={trades} candles={candles} />
                </div>
              </div>
            )}

            {view === 'settings' && <SettingsPage />}
            {view === 'guide' && <FeatureGuide />}
          </PageTransition>
        </main>
      </div>

      <ThemePanel />

      <LayoutPanel />
    </div>
  );
}
