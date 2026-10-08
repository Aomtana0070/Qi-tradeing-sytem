import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_WIDGETS, THEMES } from '@/lib/constants';
import type { LayoutDensity, ThemePreset, WidgetConfig } from '@/types';

interface DashboardState {
  theme: ThemePreset;
  density: LayoutDensity;
  widgets: WidgetConfig[];
  holographic: boolean;
  particles: boolean;
  neuralNet: boolean;
  reducedMotion: boolean;
  showThemePanel: boolean;
  showLayoutPanel: boolean;
  setTheme: (theme: ThemePreset) => void;
  setDensity: (density: LayoutDensity) => void;
  setWidgets: (widgets: WidgetConfig[]) => void;
  toggleWidget: (id: WidgetConfig['id']) => void;
  resetLayout: () => void;
  setHolographic: (v: boolean) => void;
  setParticles: (v: boolean) => void;
  setNeuralNet: (v: boolean) => void;
  setReducedMotion: (v: boolean) => void;
  setShowThemePanel: (v: boolean) => void;
  setShowLayoutPanel: (v: boolean) => void;
  applyThemeToDocument: () => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      theme: 'obsidian',
      density: 'comfortable',
      widgets: DEFAULT_WIDGETS,
      holographic: true,
      particles: true,
      neuralNet: true,
      reducedMotion: false,
      showThemePanel: false,
      showLayoutPanel: false,

      setTheme: (theme) => {
        set({ theme });
        get().applyThemeToDocument();
      },
      setDensity: (density) => set({ density }),
      setWidgets: (widgets) => set({ widgets }),
      toggleWidget: (id) =>
        set((s) => ({
          widgets: s.widgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)),
        })),
      resetLayout: () => set({ widgets: DEFAULT_WIDGETS }),
      setHolographic: (holographic) => set({ holographic }),
      setParticles: (particles) => set({ particles }),
      setNeuralNet: (neuralNet) => set({ neuralNet }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      setShowThemePanel: (showThemePanel) => set({ showThemePanel }),
      setShowLayoutPanel: (showLayoutPanel) => set({ showLayoutPanel }),

      applyThemeToDocument: () => {
        const t = THEMES[get().theme];
        const root = document.documentElement;
        root.style.setProperty('--bg', t.bg);
        root.style.setProperty('--surface', t.surface);
        root.style.setProperty('--surface-raised', t.surfaceRaised);
        root.style.setProperty('--surface-overlay', t.surfaceOverlay);
        root.style.setProperty('--ink', t.ink);
        root.style.setProperty('--ink-muted', t.inkMuted);
        root.style.setProperty('--ink-faint', t.inkFaint);
        root.style.setProperty('--accent', t.accent);
        root.style.setProperty('--accent-soft', t.accentSoft);
        root.style.setProperty('--accent-glow', t.accentGlow);
        root.style.setProperty('--border', t.border);
        root.style.setProperty('--spotlight', t.accentGlow);
      },
    }),
    {
      name: 'iq-dashboard-v2',
      partialize: (s) => ({
        theme: s.theme,
        density: s.density,
        widgets: s.widgets,
        holographic: s.holographic,
        particles: s.particles,
        neuralNet: s.neuralNet,
        reducedMotion: s.reducedMotion,
      }),
      onRehydrateStorage: () => (state) => state?.applyThemeToDocument(),
    }
  )
);
