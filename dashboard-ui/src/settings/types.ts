export type SettingsCategoryId =
  | 'general'
  | 'trading'
  | 'strategy'
  | 'signal'
  | 'risk'
  | 'takeProfit'
  | 'stopLoss'
  | 'ai'
  | 'notifications'
  | 'dashboard'
  | 'performance'
  | 'security'
  | 'exchange'
  | 'automation'
  | 'advanced';

export type TradeDirection = 'longOnly' | 'shortOnly' | 'both';
export type PositionSizing = 'fixed' | 'dynamic' | 'riskBased';
export type MarginMode = 'cross' | 'isolated';
export type RiskPreset = 'conservative' | 'balanced' | 'aggressive';
export type ThemeMode = 'dark' | 'light' | 'system';
export type LayoutPreset = 'default' | 'trader' | 'analyst' | 'minimal';

export interface BotSettingsState {
  general: {
    botName: string;
    botDescription: string;
    botAvatar: string;
    language: string;
    timezone: string;
    dateFormat: string;
    numberFormat: string;
    currencyDisplay: string;
    themeMode: ThemeMode;
    accentColor: string;
    layoutPreset: LayoutPreset;
    compactMode: boolean;
    fullScreenMode: boolean;
  };
  trading: {
    tradingEnabled: boolean;
    tradeDirection: TradeDirection;
    maxOpenPositions: number;
    maxDailyTrades: number;
    positionSizing: PositionSizing;
    fixedLot: number;
    leverage: number;
    maxLeverage: number;
    marginMode: MarginMode;
    allowedSymbols: string;
    blockedSymbols: string;
    tradingSessions: string;
    weekendTrading: boolean;
    newsTrading: boolean;
    liveTrading: boolean;
    tradingAsset: string;
  };
  strategy: {
    enabledStrategies: Record<string, boolean>;
    rsiLength: number;
    rsiOverbought: number;
    rsiOversold: number;
    emaFast: number;
    emaSlow: number;
    macdFast: number;
    macdSlow: number;
    macdSignal: number;
    atrLength: number;
    volumeFilter: boolean;
    trendFilter: boolean;
    confirmationCount: number;
  };
  signal: {
    minStrategiesAgree: number;
    signalStrengthThreshold: number;
    candleBuffer: number;
    signalCooldown: number;
    signalExpiration: number;
    multiConfirmation: boolean;
    confidenceFilter: boolean;
    aiConfidenceFilter: boolean;
    signalQualityScore: number;
  };
  risk: {
    riskPerTrade: number;
    dailyRiskLimit: number;
    weeklyRiskLimit: number;
    monthlyRiskLimit: number;
    maxDrawdown: number;
    maxConsecutiveLosses: number;
    autoStopTrading: boolean;
    equityProtection: boolean;
    capitalProtection: boolean;
    emergencyStop: boolean;
    riskPreset: RiskPreset;
    maxTradePercent: number;
    minBalanceThreshold: number;
  };
  takeProfit: {
    fixedTp: boolean;
    tp1: number;
    tp2: number;
    tp3: number;
    tp4: number;
    partialClose: boolean;
    dynamicTp: boolean;
    atrBasedTp: boolean;
    riskRewardTp: number;
  };
  stopLoss: {
    fixedSl: boolean;
    dynamicSl: boolean;
    atrStop: boolean;
    breakEven: boolean;
    autoMoveSl: boolean;
    smartStop: boolean;
    trailingStop: boolean;
    trailingDistance: number;
  };
  ai: {
    aiEnabled: boolean;
    geminiApiKey: string;
    openaiApiKey: string;
    claudeApiKey: string;
    aiAnalysis: boolean;
    aiMarketPrediction: boolean;
    aiSentiment: boolean;
    aiTradeValidation: boolean;
    aiLearning: boolean;
    autoOptimization: boolean;
    promptEditor: string;
    aiConfidenceThreshold: number;
  };
  notifications: {
    telegram: boolean;
    discord: boolean;
    line: boolean;
    email: boolean;
    push: boolean;
    tradeOpen: boolean;
    tradeClose: boolean;
    profit: boolean;
    loss: boolean;
    error: boolean;
    risk: boolean;
    system: boolean;
  };
  dashboard: {
    showBalance: boolean;
    showEquity: boolean;
    showDrawdown: boolean;
    showWinRate: boolean;
    showPnl: boolean;
    showOpenPositions: boolean;
    showHeatmap: boolean;
    showCharts: boolean;
    showNews: boolean;
    showAiAnalysis: boolean;
    widgetDragDrop: boolean;
    saveLayoutProfiles: boolean;
  };
  performance: {
    backtesting: boolean;
    forwardTesting: boolean;
    monteCarlo: boolean;
    optimization: boolean;
    walkForward: boolean;
    exportReports: boolean;
    performanceMetrics: boolean;
  };
  security: {
    twoFactor: boolean;
    passcodeLock: boolean;
    sessionTimeout: number;
    ipWhitelist: string;
    deviceManagement: boolean;
    apiPermissionControl: boolean;
    encryption: boolean;
    loginHistory: boolean;
    auditLogs: boolean;
  };
  exchange: {
    binance: boolean;
    bybit: boolean;
    okx: boolean;
    mexc: boolean;
    kucoin: boolean;
    gate: boolean;
    bitget: boolean;
    iqOption: boolean;
    latencyMonitor: boolean;
  };
  automation: {
    autoRestart: boolean;
    autoRecovery: boolean;
    autoReconnect: boolean;
    autoUpdate: boolean;
    autoParamOptimization: boolean;
    autoRiskAdjustment: boolean;
    autoSchedule: string;
  };
  advanced: {
    customScripts: string;
    webhookUrl: string;
    jsonConfig: string;
    developerMode: boolean;
    debugMode: boolean;
    experimentalFeatures: boolean;
    sessionFilter: boolean;
    volatilityFilter: boolean;
    aggressionMode: string;
  };
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface SettingsCategoryMeta {
  id: SettingsCategoryId;
  label: string;
  description: string;
  icon: string;
  keywords: string[];
}
