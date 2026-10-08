import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SETTINGS_CATEGORIES } from '@/settings/defaults';
import { useSettingsStore } from '@/store/settingsStore';
import type { SettingsCategoryId } from '@/settings/types';
import { spring } from '@/lib/constants';

export function CommandPalette() {
  const open = useSettingsStore((s) => s.commandOpen);
  const setOpen = useSettingsStore((s) => s.setCommandOpen);
  const setCategory = useSettingsStore((s) => s.setCategory);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SETTINGS_CATEGORIES;
    return SETTINGS_CATEGORIES.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.keywords.some((k) => k.includes(q))
    );
  }, [query]);

  const pick = (id: SettingsCategoryId) => {
    setCategory(id);
    setOpen(false);
    setQuery('');
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close command palette"
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.div
            role="dialog"
            aria-label="Command palette"
            className="glass-panel fixed left-1/2 top-[18%] z-[70] w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl shadow-2xl"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={spring.snappy}
          >
            <div className="border-b border-[var(--border)] px-4 py-3">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search settings…"
                className="w-full bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
              />
            </div>
            <ul className="max-h-72 overflow-auto p-2">
              {results.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => pick(c.id as SettingsCategoryId)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-overlay)]"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-sm text-[var(--accent)]">
                      {c.icon}
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-ink">{c.label}</span>
                      <span className="block text-xs text-ink-muted">{c.description}</span>
                    </span>
                  </button>
                </li>
              ))}
              {results.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-ink-muted">No results</li>
              )}
            </ul>
            <div className="border-t border-[var(--border)] px-4 py-2 text-[10px] text-ink-faint">
              ↑↓ navigate · Enter select · Esc close · Ctrl+K toggle
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
