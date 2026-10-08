import { motion } from 'framer-motion';
import clsx from 'clsx';
import { SETTINGS_CATEGORIES } from '@/settings/defaults';
import { useSettingsStore } from '@/store/settingsStore';
import type { SettingsCategoryId } from '@/settings/types';

interface SettingsSidebarProps {
  mobile?: boolean;
  onNavigate?: () => void;
}

export function SettingsSidebar({ mobile, onNavigate }: SettingsSidebarProps) {
  const active = useSettingsStore((s) => s.activeCategory);
  const favorites = useSettingsStore((s) => s.favorites);
  const searchQuery = useSettingsStore((s) => s.searchQuery);
  const setCategory = useSettingsStore((s) => s.setCategory);
  const setSearch = useSettingsStore((s) => s.setSearch);
  const toggleFavorite = useSettingsStore((s) => s.toggleFavorite);
  const setCommandOpen = useSettingsStore((s) => s.setCommandOpen);

  const q = searchQuery.trim().toLowerCase();
  const filtered = SETTINGS_CATEGORIES.filter(
    (c) =>
      !q ||
      c.label.toLowerCase().includes(q) ||
      c.keywords.some((k) => k.includes(q))
  );

  const favItems = filtered.filter((c) => favorites.includes(c.id as SettingsCategoryId));
  const restItems = filtered.filter((c) => !favorites.includes(c.id as SettingsCategoryId));

  const nav = (id: SettingsCategoryId) => {
    setCategory(id);
    onNavigate?.();
  };

  const NavItem = ({ id, label, icon }: { id: SettingsCategoryId; label: string; icon: string }) => (
    <div className="group flex items-center gap-1">
      <button
        type="button"
        onClick={() => nav(id)}
        className={clsx(
          'flex flex-1 items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-all',
          active === id
            ? 'bg-[var(--accent-soft)] font-medium text-ink'
            : 'text-ink-muted hover:bg-[var(--surface-overlay)] hover:text-ink'
        )}
      >
        <span className="w-4 text-center text-xs opacity-70">{icon}</span>
        {label}
      </button>
      <button
        type="button"
        aria-label={`Favorite ${label}`}
        onClick={() => toggleFavorite(id)}
        className="rounded-lg px-1.5 py-1 text-xs text-ink-faint opacity-0 transition-opacity hover:text-[var(--accent)] group-hover:opacity-100"
      >
        {favorites.includes(id) ? '★' : '☆'}
      </button>
    </div>
  );

  return (
    <aside
      className={clsx(
        'flex flex-col border-[var(--border)] bg-[var(--surface)]/60 backdrop-blur-xl',
        mobile ? 'w-full border-b' : 'h-full w-64 shrink-0 border-r'
      )}
    >
      <div className="border-b border-[var(--border)] p-4">
        <div className="relative">
          <input
            value={searchQuery}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search settings…"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] py-2 pl-3 pr-16 text-sm text-ink placeholder:text-ink-faint focus:border-[var(--accent)] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-ink-faint"
          >
            ⌘K
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-auto p-3" aria-label="Settings categories">
        {favItems.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-ink-faint">
              Favorites
            </p>
            <div className="space-y-0.5">
              {favItems.map((c) => (
                <NavItem key={c.id} id={c.id as SettingsCategoryId} label={c.label} icon={c.icon} />
              ))}
            </div>
          </div>
        )}
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-ink-faint">
          All Settings
        </p>
        <div className="space-y-0.5">
          {restItems.map((c) => (
            <NavItem key={c.id} id={c.id as SettingsCategoryId} label={c.label} icon={c.icon} />
          ))}
        </div>
      </nav>

      {!mobile && (
        <motion.div
          className="border-t border-[var(--border)] p-4 text-xs text-ink-faint"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Professional workspace · IQ Command
        </motion.div>
      )}
    </aside>
  );
}
