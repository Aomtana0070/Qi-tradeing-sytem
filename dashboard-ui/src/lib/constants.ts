import type { LayoutDensity, ThemePreset, WidgetConfig, WidgetId } from '@/types';

export const THEMES: Record<
  ThemePreset,
  {
    label: string;
    bg: string;
    surface: string;
    surfaceRaised: string;
    surfaceOverlay: string;
    ink: string;
    inkMuted: string;
    inkFaint: string;
    accent: string;
    accentSoft: string;
    accentGlow: string;
    border: string;
  }
> = {
  obsidian: {
    label: 'Obsidian',
    bg: '#070708',
    surface: 'rgba(255,255,255,0.03)',
    surfaceRaised: 'rgba(255,255,255,0.05)',
    surfaceOverlay: 'rgba(255,255,255,0.08)',
    ink: '#f4f4f5',
    inkMuted: '#a1a1aa',
    inkFaint: '#52525b',
    accent: '#6366f1',
    accentSoft: 'rgba(99,102,241,0.15)',
    accentGlow: 'rgba(99,102,241,0.35)',
    border: 'rgba(255,255,255,0.07)',
  },
  arctic: {
    label: 'Arctic',
    bg: '#0a0e14',
    surface: 'rgba(255,255,255,0.04)',
    surfaceRaised: 'rgba(255,255,255,0.06)',
    surfaceOverlay: 'rgba(255,255,255,0.09)',
    ink: '#f0f9ff',
    inkMuted: '#94a3b8',
    inkFaint: '#475569',
    accent: '#38bdf8',
    accentSoft: 'rgba(56,189,248,0.12)',
    accentGlow: 'rgba(56,189,248,0.3)',
    border: 'rgba(255,255,255,0.08)',
  },
  dawn: {
    label: 'Dawn',
    bg: '#0c0a09',
    surface: 'rgba(255,255,255,0.035)',
    surfaceRaised: 'rgba(255,255,255,0.055)',
    surfaceOverlay: 'rgba(255,255,255,0.085)',
    ink: '#fafaf9',
    inkMuted: '#a8a29e',
    inkFaint: '#57534e',
    accent: '#f97316',
    accentSoft: 'rgba(249,115,22,0.12)',
    accentGlow: 'rgba(249,115,22,0.28)',
    border: 'rgba(255,255,255,0.07)',
  },
  forest: {
    label: 'Forest',
    bg: '#060807',
    surface: 'rgba(255,255,255,0.03)',
    surfaceRaised: 'rgba(255,255,255,0.05)',
    surfaceOverlay: 'rgba(255,255,255,0.08)',
    ink: '#ecfdf5',
    inkMuted: '#86efac',
    inkFaint: '#4ade80',
    accent: '#10b981',
    accentSoft: 'rgba(16,185,129,0.12)',
    accentGlow: 'rgba(16,185,129,0.28)',
    border: 'rgba(255,255,255,0.07)',
  },
};

export const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'balance', title: 'Balance', colSpan: 1, rowSpan: 1, visible: true },
  { id: 'winRate', title: 'Win Rate', colSpan: 1, rowSpan: 1, visible: true },
  { id: 'todayPnl', title: 'Today P&L', colSpan: 1, rowSpan: 1, visible: true },
  { id: 'streak', title: 'Streak', colSpan: 1, rowSpan: 1, visible: true },
  { id: 'chart', title: 'Price Chart', colSpan: 2, rowSpan: 2, visible: true },
  { id: 'trades', title: 'Recent Trades', colSpan: 2, rowSpan: 2, visible: true },
  { id: 'indicators', title: 'Indicators', colSpan: 1, rowSpan: 2, visible: true },
  { id: 'controls', title: 'Controls', colSpan: 1, rowSpan: 2, visible: true },
  { id: 'assistant', title: 'AI Assistant', colSpan: 2, rowSpan: 2, visible: true },
];

export const WIDGET_LABELS: Record<WidgetId, string> = {
  balance: 'Balance',
  winRate: 'Win Rate',
  todayPnl: 'Today P&L',
  streak: 'Streak',
  chart: 'Price Chart',
  trades: 'Recent Trades',
  indicators: 'Indicators',
  controls: 'Controls',
  assistant: 'AI Assistant',
};

export const DENSITY_GAP: Record<LayoutDensity, string> = {
  compact: '0.75rem',
  comfortable: '1rem',
  spacious: '1.5rem',
};

export const spring = {
  snappy: { type: 'spring' as const, stiffness: 420, damping: 32 },
  soft: { type: 'spring' as const, stiffness: 260, damping: 28 },
  gentle: { type: 'spring' as const, stiffness: 180, damping: 24 },
};

export const ease = [0.22, 1, 0.36, 1] as const;
