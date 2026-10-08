import { useRef } from 'react';
import { motion } from 'framer-motion';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { useSettingsStore, mapSettingsToApi } from '@/store/settingsStore';
import { api } from '@/lib/api';
import { SETTINGS_CATEGORIES } from '@/settings/defaults';

export function SettingsToolbar() {
  const dirty = useSettingsStore((s) => s.dirty);
  const saveStatus = useSettingsStore((s) => s.saveStatus);
  const activeCategory = useSettingsStore((s) => s.activeCategory);
  const settings = useSettingsStore((s) => s.settings);
  const markSaved = useSettingsStore((s) => s.markSaved);
  const setSaveStatus = useSettingsStore((s) => s.setSaveStatus);
  const resetCategory = useSettingsStore((s) => s.resetCategory);
  const resetAll = useSettingsStore((s) => s.resetAll);
  const undo = useSettingsStore((s) => s.undo);
  const redo = useSettingsStore((s) => s.redo);
  const exportSettings = useSettingsStore((s) => s.exportSettings);
  const importSettings = useSettingsStore((s) => s.importSettings);
  const past = useSettingsStore((s) => s.past);
  const future = useSettingsStore((s) => s.future);
  const fileRef = useRef<HTMLInputElement>(null);

  const meta = SETTINGS_CATEGORIES.find((c) => c.id === activeCategory);

  const save = async () => {
    setSaveStatus('saving');
    try {
      await api.saveSettings(mapSettingsToApi(settings));
      markSaved();
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2500);
    }
  };

  const onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => importSettings(String(reader.result));
    reader.readAsText(file);
    e.target.value = '';
  };

  const exportFile = () => {
    const blob = new Blob([exportSettings()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'iq-command-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg)]/80 px-4 py-4 backdrop-blur-xl md:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink">{meta?.label ?? 'Settings'}</h2>
          <p className="mt-0.5 text-sm text-ink-muted">{meta?.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <MagneticButton size="sm" variant="ghost" onClick={undo} disabled={past.length === 0}>
            Undo
          </MagneticButton>
          <MagneticButton size="sm" variant="ghost" onClick={redo} disabled={future.length === 0}>
            Redo
          </MagneticButton>
          <MagneticButton size="sm" variant="ghost" onClick={() => resetCategory(activeCategory)}>
            Reset Category
          </MagneticButton>
          <MagneticButton size="sm" variant="ghost" onClick={exportFile}>
            Export
          </MagneticButton>
          <MagneticButton size="sm" variant="ghost" onClick={() => fileRef.current?.click()}>
            Import
          </MagneticButton>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onImport} />
          <MagneticButton size="sm" variant="ghost" onClick={resetAll}>
            Reset All
          </MagneticButton>

          <MagneticButton
            size="md"
            variant="primary"
            onClick={save}
            disabled={saveStatus === 'saving'}
            className="min-w-[120px]"
          >
            {saveStatus === 'saving' && 'Saving…'}
            {saveStatus === 'saved' && '✓ Saved'}
            {saveStatus === 'error' && 'Retry Save'}
            {saveStatus === 'idle' && (dirty ? 'Save Changes' : 'Saved')}
          </MagneticButton>
        </div>
      </div>

      {dirty && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 text-xs text-amber-400/90"
        >
          Unsaved changes — save to apply to the trading bot
        </motion.p>
      )}
    </div>
  );
}
