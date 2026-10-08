export type ThemePreset = 'obsidian' | 'arctic' | 'dawn' | 'forest';

export type LayoutDensity = 'comfortable' | 'compact' | 'spacious';

export type WidgetId =
  | 'balance'
  | 'winRate'
  | 'todayPnl'
  | 'streak'
  | 'chart'
  | 'trades'
  | 'indicators'
  | 'controls'
  | 'assistant';

export interface WidgetConfig {
  id: WidgetId;
  title: string;
  colSpan: number;
  rowSpan: number;
  visible: boolean;
}

export interface ThemeTokens {
  id: ThemePreset;
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

export interface BotStatus {
  status: string;
  paused: boolean;
  mode: string;
  balance: number;
  winRate: string;
  dailyPnL: number;
  todayPnL: number;
  todayTrades: number;
  streak: number;
  streakType: 'win' | 'loss' | 'none';
  currentAsset?: string;
  aggressiveMode?: string;
  summary?: {
    totalTrades: number;
    winRate: string;
    todayPnL: number;
    consecutiveWins: number;
    consecutiveLosses: number;
    balance?: string;
  };
  indicators?: Record<string, number>;
  liveIndicators?: Record<string, number>;
}

export interface Trade {
  timestamp: string;
  asset: string;
  direction: string;
  amount: number;
  result: string;
  pnl: number;
}

export interface Candle {
  time: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
