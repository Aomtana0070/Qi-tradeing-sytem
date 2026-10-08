import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_SETTINGS, RISK_PRESETS } from '@/settings/defaults';
import type { BotSettingsState, SaveStatus, SettingsCategoryId } from '@/settings/types';

const MAX_HISTORY = 30;

function cloneSettings(s: BotSettingsState): BotSettingsState {
  return JSON.parse(JSON.stringify(s));
}

interface SettingsStore {
  settings: BotSettingsState;
  savedSnapshot: BotSettingsState;
  activeCategory: SettingsCategoryId;
  favorites: SettingsCategoryId[];
  searchQuery: string;
  saveStatus: SaveStatus;
  commandOpen: boolean;
  past: BotSettingsState[];
  future: BotSettingsState[];
  dirty: boolean;

  setCategory: (id: SettingsCategoryId) => void;
  setSearch: (q: string) => void;
  toggleFavorite: (id: SettingsCategoryId) => void;
  setCommandOpen: (open: boolean) => void;
  updateSection: <K extends keyof BotSettingsState>(
    section: K,
    patch: Partial<BotSettingsState[K]>
  ) => void;
  applyRiskPreset: (preset: keyof typeof RISK_PRESETS) => void;
  resetCategory: (id: SettingsCategoryId) => void;
  resetAll: () => void;
  undo: () => void;
  redo: () => void;
  markSaved: () => void;
  loadFromServer: (partial: Record<string, unknown>) => void;
  setSaveStatus: (status: SaveStatus) => void;
  importSettings: (json: string) => void;
  exportSettings: () => string;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: cloneSettings(DEFAULT_SETTINGS),
      savedSnapshot: cloneSettings(DEFAULT_SETTINGS),
      activeCategory: 'general',
      favorites: ['trading', 'risk', 'strategy'],
      searchQuery: '',
      saveStatus: 'idle',
      commandOpen: false,
      past: [],
      future: [],
      dirty: false,

      setCategory: (id) => set({ activeCategory: id, searchQuery: '' }),
      setSearch: (q) => set({ searchQuery: q }),
      toggleFavorite: (id) =>
        set((s) => ({
          favorites: s.favorites.includes(id)
            ? s.favorites.filter((f) => f !== id)
            : [...s.favorites, id],
        })),
      setCommandOpen: (open) => set({ commandOpen: open }),

      updateSection: (section, patch) => {
        set((s) => {
          const past = [...s.past, cloneSettings(s.settings)].slice(-MAX_HISTORY);
          const settings = {
            ...s.settings,
            [section]: { ...s.settings[section], ...patch },
          };
          return {
            past,
            future: [],
            settings,
            dirty: true,
            saveStatus: 'idle' as SaveStatus,
          };
        });
      },

      applyRiskPreset: (preset) => {
        const patch = RISK_PRESETS[preset];
        get().updateSection('risk', { ...patch, riskPreset: preset });
      },

      resetCategory: (id) => {
        set((s) => {
          const past = [...s.past, cloneSettings(s.settings)].slice(-MAX_HISTORY);
          return {
            past,
            future: [],
            settings: { ...s.settings, [id]: cloneSettings(DEFAULT_SETTINGS)[id] },
            dirty: true,
          };
        });
      },

      resetAll: () => {
        set((s) => ({
          past: [...s.past, cloneSettings(s.settings)].slice(-MAX_HISTORY),
          future: [],
          settings: cloneSettings(DEFAULT_SETTINGS),
          dirty: true,
        }));
      },

      undo: () => {
        const { past, settings, future } = get();
        if (past.length === 0) return;
        const prev = past[past.length - 1];
        set({
          past: past.slice(0, -1),
          future: [cloneSettings(settings), ...future].slice(0, MAX_HISTORY),
          settings: prev,
          dirty: true,
        });
      },

      redo: () => {
        const { past, settings, future } = get();
        if (future.length === 0) return;
        const next = future[0];
        set({
          future: future.slice(1),
          past: [...past, cloneSettings(settings)].slice(-MAX_HISTORY),
          settings: next,
          dirty: true,
        });
      },

      markSaved: () => {
        const { settings } = get();
        set({
          savedSnapshot: cloneSettings(settings),
          dirty: false,
          saveStatus: 'saved',
        });
        setTimeout(() => {
          if (get().saveStatus === 'saved') set({ saveStatus: 'idle' });
        }, 2200);
      },

      loadFromServer: (partial) => {
        set((s) => {
          const next = cloneSettings(s.settings);
          if (typeof partial.tradingAsset === 'string')
            next.trading.tradingAsset = partial.tradingAsset;
          if (typeof partial.liveTrading === 'boolean')
            next.trading.liveTrading = partial.liveTrading;
          if (typeof partial.minConfidence === 'number')
            next.signal.signalStrengthThreshold = partial.minConfidence;
          if (typeof partial.minStrategiesAgree === 'number')
            next.signal.minStrategiesAgree = partial.minStrategiesAgree;
          if (typeof partial.rsiPeriod === 'number') next.strategy.rsiLength = partial.rsiPeriod;
          if (typeof partial.rsiOverbought === 'number')
            next.strategy.rsiOverbought = partial.rsiOverbought;
          if (typeof partial.rsiOversold === 'number')
            next.strategy.rsiOversold = partial.rsiOversold;
          if (typeof partial.macdFast === 'number') next.strategy.macdFast = partial.macdFast;
          if (typeof partial.macdSlow === 'number') next.strategy.macdSlow = partial.macdSlow;
          if (typeof partial.macdSignal === 'number') next.strategy.macdSignal = partial.macdSignal;
          if (typeof partial.maxTradePercent === 'number')
            next.risk.maxTradePercent = partial.maxTradePercent;
          if (typeof partial.minBalanceThreshold === 'number')
            next.risk.minBalanceThreshold = partial.minBalanceThreshold;
          if (typeof partial.maxDailyLoss === 'number')
            next.risk.dailyRiskLimit = partial.maxDailyLoss;
          if (typeof partial.sessionMaxDrawdownPercent === 'number')
            next.risk.maxDrawdown = partial.sessionMaxDrawdownPercent;
          if (typeof partial.consecutiveLossLimit === 'number')
            next.risk.maxConsecutiveLosses = partial.consecutiveLossLimit;
          if (typeof partial.timezone === 'string') next.general.timezone = partial.timezone;
          if (typeof partial.aggressionMode === 'string')
            next.advanced.aggressionMode = partial.aggressionMode;
          if (typeof partial.sessionFilter === 'boolean')
            next.advanced.sessionFilter = partial.sessionFilter;
          if (typeof partial.volatilityFilter === 'boolean')
            next.advanced.volatilityFilter = partial.volatilityFilter;
          if (typeof partial.newsFilter === 'boolean')
            next.trading.newsTrading = partial.newsFilter;
          return {
            settings: next,
            savedSnapshot: cloneSettings(next),
            dirty: false,
          };
        });
      },

      setSaveStatus: (status) => set({ saveStatus: status }),

      importSettings: (json) => {
        try {
          const parsed = JSON.parse(json) as BotSettingsState;
          set((s) => ({
            past: [...s.past, cloneSettings(s.settings)].slice(-MAX_HISTORY),
            settings: { ...cloneSettings(DEFAULT_SETTINGS), ...parsed },
            dirty: true,
          }));
        } catch {
          set({ saveStatus: 'error' });
        }
      },

      exportSettings: () => JSON.stringify(get().settings, null, 2),
    }),
    {
      name: 'iq-bot-settings-v1',
      partialize: (s) => ({
        settings: s.settings,
        favorites: s.favorites,
        activeCategory: s.activeCategory,
      }),
    }
  )
);

export function mapSettingsToApi(settings: BotSettingsState) {
  return {
    tradingAsset: settings.trading.tradingAsset,
    liveModeEnabled: settings.trading.liveTrading,
    liveTrading: settings.trading.liveTrading,
    minConfidence: settings.signal.signalStrengthThreshold,
    minStrategiesAgree: settings.signal.minStrategiesAgree,
    rsiPeriod: settings.strategy.rsiLength,
    rsiOverbought: settings.strategy.rsiOverbought,
    rsiOversold: settings.strategy.rsiOversold,
    macdFast: settings.strategy.macdFast,
    macdSlow: settings.strategy.macdSlow,
    macdSignal: settings.strategy.macdSignal,
    maxDailyLoss: settings.risk.dailyRiskLimit,
    sessionMaxDrawdownPercent: settings.risk.maxDrawdown,
    consecutiveLossLimit: settings.risk.maxConsecutiveLosses,
    maxConsecutiveLosses: settings.risk.maxConsecutiveLosses,
    maxTradePercent: settings.risk.maxTradePercent,
    minBalanceThreshold: settings.risk.minBalanceThreshold,
    timezone: settings.general.timezone,
    aggressionMode: settings.advanced.aggressionMode,
    aggressionLevel: settings.advanced.aggressionMode,
    sessionFilterEnabled: settings.advanced.sessionFilter,
    sessionFilter: settings.advanced.sessionFilter,
    volatilityFilter: settings.advanced.volatilityFilter,
    newsFilter: settings.trading.newsTrading,
  };
}
