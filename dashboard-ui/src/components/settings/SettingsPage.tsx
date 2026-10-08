import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { SettingsSidebar } from '@/components/settings/SettingsSidebar';
import { SettingsToolbar } from '@/components/settings/SettingsToolbar';
import { SettingsCategoryContent } from '@/components/settings/SettingsCategoryContent';
import { CommandPalette } from '@/components/settings/CommandPalette';
import { SettingsParticles } from '@/components/settings/SettingsParticles';
import { PageTransition } from '@/components/ui/PageTransition';
import { useSettingsStore } from '@/store/settingsStore';
import { api } from '@/lib/api';
import { SETTINGS_CATEGORIES } from '@/settings/defaults';

export function SettingsPage() {
  const activeCategory = useSettingsStore((s) => s.activeCategory);
  const loadFromServer = useSettingsStore((s) => s.loadFromServer);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    api.getSettings().then(loadFromServer).catch(() => {});
  }, [loadFromServer]);

  const meta = SETTINGS_CATEGORIES.find((c) => c.id === activeCategory);

  return (
    <div className="relative flex h-full min-h-0 flex-col lg:flex-row">
      <SettingsParticles />
      <CommandPalette />

      {/* Mobile sidebar toggle */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2 lg:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-ink-muted"
        >
          ☰ Categories
        </button>
        <span className="text-sm font-medium text-ink">{meta?.label}</span>
      </div>

      <div className={`${sidebarOpen ? 'block' : 'hidden'} lg:block`}>
        <SettingsSidebar mobile={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <SettingsToolbar />
        <div className="flex-1 overflow-auto px-4 py-6 md:px-6">
          <PageTransition pageKey={activeCategory}>
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto max-w-4xl space-y-4"
            >
              <SettingsCategoryContent category={activeCategory} />
            </motion.div>
          </PageTransition>
        </div>
      </div>
    </div>
  );
}
