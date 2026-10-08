import { motion } from 'framer-motion';
import { useSettingsStore } from '@/store/settingsStore';
import { STRATEGY_OPTIONS } from '@/settings/defaults';
import type { SettingsCategoryId } from '@/settings/types';
import {
  SettingsInput,
  SettingsSelect,
  SettingsSlider,
  SettingsSegmented,
  SettingsTextarea,
} from '@/components/settings/fields/SettingsFields';
import { SettingsToggle } from '@/components/settings/fields/SettingsToggle';
import { SettingsSection, SettingsGrid, SettingsRow } from '@/components/settings/SettingsSection';
import { StrategyCard, ExchangeCard, RiskPresetCard } from '@/components/settings/SettingsCards';
import { useDashboardStore } from '@/store/dashboardStore';
import { THEMES } from '@/lib/constants';
import type { ThemePreset } from '@/types';

export function SettingsCategoryContent({ category }: { category: SettingsCategoryId }) {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.updateSection);
  const applyRiskPreset = useSettingsStore((s) => s.applyRiskPreset);
  const dashboardTheme = useDashboardStore((s) => s.theme);
  const setTheme = useDashboardStore((s) => s.setTheme);
  const setDensity = useDashboardStore((s) => s.setDensity);

  switch (category) {
    case 'general':
      return (
        <div className="space-y-4">
          <SettingsSection title="Bot Identity" description="How your workspace appears">
            <SettingsGrid>
              <SettingsInput
                label="Bot Name"
                value={settings.general.botName}
                onChange={(v) => update('general', { botName: v })}
              />
              <SettingsInput
                label="Avatar URL"
                value={settings.general.botAvatar}
                onChange={(v) => update('general', { botAvatar: v })}
                placeholder="https://..."
              />
            </SettingsGrid>
            <SettingsTextarea
              label="Description"
              value={settings.general.botDescription}
              onChange={(v) => update('general', { botDescription: v })}
              rows={2}
            />
          </SettingsSection>
          <SettingsSection title="Locale & Format" defaultOpen>
            <SettingsGrid>
              <SettingsSelect
                label="Language"
                value={settings.general.language}
                onChange={(v) => update('general', { language: v })}
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'th', label: 'ไทย' },
                  { value: 'ja', label: '日本語' },
                ]}
              />
              <SettingsSelect
                label="Timezone"
                value={settings.general.timezone}
                onChange={(v) => update('general', { timezone: v })}
                options={[
                  { value: 'Asia/Bangkok', label: 'Bangkok (ICT)' },
                  { value: 'UTC', label: 'UTC' },
                  { value: 'America/New_York', label: 'New York' },
                  { value: 'Europe/London', label: 'London' },
                ]}
              />
              <SettingsSelect
                label="Date Format"
                value={settings.general.dateFormat}
                onChange={(v) => update('general', { dateFormat: v })}
                options={[
                  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
                ]}
              />
              <SettingsSelect
                label="Currency Display"
                value={settings.general.currencyDisplay}
                onChange={(v) => update('general', { currencyDisplay: v })}
                options={[
                  { value: 'USD', label: 'USD ($)' },
                  { value: 'THB', label: 'THB (฿)' },
                  { value: 'EUR', label: 'EUR (€)' },
                ]}
              />
            </SettingsGrid>
          </SettingsSection>
          <SettingsSection title="Appearance">
            <SettingsGrid>
              <SettingsSelect
                label="Theme Preset"
                description="Syncs with dashboard theme engine"
                value={dashboardTheme}
                onChange={(v) => setTheme(v as ThemePreset)}
                options={Object.entries(THEMES).map(([k, t]) => ({
                  value: k,
                  label: t.label,
                }))}
              />
              <SettingsInput
                label="Accent Color"
                type="color"
                value={settings.general.accentColor}
                onChange={(v) => update('general', { accentColor: v })}
              />
              <SettingsSegmented
                label="Layout Preset"
                value={settings.general.layoutPreset}
                onChange={(v) =>
                  update('general', { layoutPreset: v as typeof settings.general.layoutPreset })
                }
                options={[
                  { value: 'default', label: 'Default' },
                  { value: 'trader', label: 'Trader' },
                  { value: 'analyst', label: 'Analyst' },
                  { value: 'minimal', label: 'Minimal' },
                ]}
              />
            </SettingsGrid>
            <SettingsRow>
              <SettingsToggle
                label="Compact Mode"
                description="Tighter widget spacing"
                checked={settings.general.compactMode}
                onChange={(v) => {
                  update('general', { compactMode: v });
                  setDensity(v ? 'compact' : 'comfortable');
                }}
              />
              <SettingsToggle
                label="Full Screen Mode"
                description="Hide browser chrome when supported"
                checked={settings.general.fullScreenMode}
                onChange={(v) => {
                  update('general', { fullScreenMode: v });
                  if (v && document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen().catch(() => {});
                  }
                }}
              />
            </SettingsRow>
          </SettingsSection>
        </div>
      );

    case 'trading':
      return (
        <div className="space-y-4">
          <SettingsSection title="Execution" description="Core trading behavior">
            <SettingsToggle
              label="Trading Enabled"
              description="Master switch for automated execution"
              checked={settings.trading.tradingEnabled}
              onChange={(v) => update('trading', { tradingEnabled: v })}
            />
            <SettingsToggle
              label="Live Trading"
              description="Locked in the dashboard. Configure PAPER_TRADE_MODE in the local .env file and restart to change execution mode."
              checked={settings.trading.liveTrading}
              onChange={(v) => update('trading', { liveTrading: v })}
              disabled
            />
            <SettingsSegmented
              label="Trade Direction"
              value={settings.trading.tradeDirection}
              onChange={(v) =>
                update('trading', { tradeDirection: v as typeof settings.trading.tradeDirection })
              }
              options={[
                { value: 'longOnly', label: 'Long Only' },
                { value: 'shortOnly', label: 'Short Only' },
                { value: 'both', label: 'Long + Short' },
              ]}
            />
            <SettingsGrid>
              <SettingsSlider
                label="Max Open Positions"
                value={settings.trading.maxOpenPositions}
                onChange={(v) => update('trading', { maxOpenPositions: v })}
                min={1}
                max={5}
              />
              <SettingsSlider
                label="Max Daily Trades"
                value={settings.trading.maxDailyTrades}
                onChange={(v) => update('trading', { maxDailyTrades: v })}
                min={1}
                max={200}
              />
            </SettingsGrid>
          </SettingsSection>
          <SettingsSection title="Position Sizing">
            <SettingsSegmented
              label="Sizing Mode"
              value={settings.trading.positionSizing}
              onChange={(v) =>
                update('trading', {
                  positionSizing: v as typeof settings.trading.positionSizing,
                })
              }
              options={[
                { value: 'fixed', label: 'Fixed Lot' },
                { value: 'dynamic', label: 'Dynamic Lot' },
                { value: 'riskBased', label: 'Risk Based' },
              ]}
            />
            <SettingsInput
              label="Fixed Lot (USD)"
              type="number"
              value={settings.trading.fixedLot}
              onChange={(v) => update('trading', { fixedLot: Number(v) || 0 })}
            />
            <SettingsInput
              label="Trading Asset"
              value={settings.trading.tradingAsset}
              onChange={(v) => update('trading', { tradingAsset: v.toUpperCase() })}
            />
          </SettingsSection>
          <SettingsSection title="Market Access">
            <SettingsTextarea
              label="Allowed Symbols"
              description="Comma-separated list"
              value={settings.trading.allowedSymbols}
              onChange={(v) => update('trading', { allowedSymbols: v })}
              rows={2}
            />
            <SettingsTextarea
              label="Blocked Symbols"
              value={settings.trading.blockedSymbols}
              onChange={(v) => update('trading', { blockedSymbols: v })}
              rows={2}
            />
            <SettingsInput
              label="Trading Sessions"
              value={settings.trading.tradingSessions}
              onChange={(v) => update('trading', { tradingSessions: v })}
            />
            <SettingsToggle
              label="Weekend Trading"
              checked={settings.trading.weekendTrading}
              onChange={(v) => update('trading', { weekendTrading: v })}
            />
            <SettingsToggle
              label="News Trading"
              checked={settings.trading.newsTrading}
              onChange={(v) => update('trading', { newsTrading: v })}
            />
          </SettingsSection>
        </div>
      );

    case 'strategy':
      return (
        <div className="space-y-4">
          <SettingsSection title="Strategy Selection" description="Enable strategies for consensus">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {STRATEGY_OPTIONS.map((s) => (
                <StrategyCard
                  key={s.id}
                  id={s.id}
                  label={s.label}
                  description={s.desc}
                  active={!!settings.strategy.enabledStrategies[s.id]}
                  onToggle={() =>
                    update('strategy', {
                      enabledStrategies: {
                        ...settings.strategy.enabledStrategies,
                        [s.id]: !settings.strategy.enabledStrategies[s.id],
                      },
                    })
                  }
                />
              ))}
            </div>
          </SettingsSection>
          <SettingsSection title="Indicator Parameters">
            <SettingsGrid>
              <SettingsSlider
                label="RSI Length"
                value={settings.strategy.rsiLength}
                onChange={(v) => update('strategy', { rsiLength: v })}
                min={5}
                max={30}
              />
              <SettingsSlider
                label="RSI Overbought"
                value={settings.strategy.rsiOverbought}
                onChange={(v) => update('strategy', { rsiOverbought: v })}
                min={60}
                max={90}
              />
              <SettingsSlider
                label="RSI Oversold"
                value={settings.strategy.rsiOversold}
                onChange={(v) => update('strategy', { rsiOversold: v })}
                min={10}
                max={40}
              />
              <SettingsSlider
                label="EMA Fast"
                value={settings.strategy.emaFast}
                onChange={(v) => update('strategy', { emaFast: v })}
                min={5}
                max={100}
              />
              <SettingsSlider
                label="EMA Slow"
                value={settings.strategy.emaSlow}
                onChange={(v) => update('strategy', { emaSlow: v })}
                min={50}
                max={300}
              />
              <SettingsSlider
                label="MACD Fast"
                value={settings.strategy.macdFast}
                onChange={(v) => update('strategy', { macdFast: v })}
                min={5}
                max={20}
              />
              <SettingsSlider
                label="MACD Slow"
                value={settings.strategy.macdSlow}
                onChange={(v) => update('strategy', { macdSlow: v })}
                min={15}
                max={40}
              />
              <SettingsSlider
                label="MACD Signal"
                value={settings.strategy.macdSignal}
                onChange={(v) => update('strategy', { macdSignal: v })}
                min={5}
                max={15}
              />
              <SettingsSlider
                label="ATR Length"
                value={settings.strategy.atrLength}
                onChange={(v) => update('strategy', { atrLength: v })}
                min={5}
                max={30}
              />
            </SettingsGrid>
            <SettingsToggle
              label="Volume Filter"
              checked={settings.strategy.volumeFilter}
              onChange={(v) => update('strategy', { volumeFilter: v })}
            />
            <SettingsToggle
              label="Trend Filter"
              checked={settings.strategy.trendFilter}
              onChange={(v) => update('strategy', { trendFilter: v })}
            />
            <SettingsSlider
              label="Confirmation Count"
              value={settings.strategy.confirmationCount}
              onChange={(v) => update('strategy', { confirmationCount: v })}
              min={1}
              max={5}
            />
          </SettingsSection>
        </div>
      );

    case 'signal':
      return (
        <div className="space-y-4">
          <SettingsSection title="Signal Filtering">
            <SettingsGrid>
              <SettingsSlider
                label="Min Strategies Agree"
                value={settings.signal.minStrategiesAgree}
                onChange={(v) => update('signal', { minStrategiesAgree: v })}
                min={1}
                max={5}
              />
              <SettingsSlider
                label="Signal Strength Threshold"
                value={settings.signal.signalStrengthThreshold}
                onChange={(v) => update('signal', { signalStrengthThreshold: v })}
                min={50}
                max={95}
                suffix="%"
              />
              <SettingsSlider
                label="Candle Buffer"
                value={settings.signal.candleBuffer}
                onChange={(v) => update('signal', { candleBuffer: v })}
                min={50}
                max={300}
              />
              <SettingsSlider
                label="Signal Cooldown"
                value={settings.signal.signalCooldown}
                onChange={(v) => update('signal', { signalCooldown: v })}
                min={0}
                max={120}
                suffix="s"
              />
              <SettingsSlider
                label="Signal Expiration"
                value={settings.signal.signalExpiration}
                onChange={(v) => update('signal', { signalExpiration: v })}
                min={15}
                max={300}
                suffix="s"
              />
              <SettingsSlider
                label="Quality Score Min"
                value={settings.signal.signalQualityScore}
                onChange={(v) => update('signal', { signalQualityScore: v })}
                min={50}
                max={100}
              />
            </SettingsGrid>
            <SettingsToggle
              label="Multi Confirmation"
              checked={settings.signal.multiConfirmation}
              onChange={(v) => update('signal', { multiConfirmation: v })}
            />
            <SettingsToggle
              label="Confidence Filter"
              checked={settings.signal.confidenceFilter}
              onChange={(v) => update('signal', { confidenceFilter: v })}
            />
            <SettingsToggle
              label="AI Confidence Filter"
              checked={settings.signal.aiConfidenceFilter}
              onChange={(v) => update('signal', { aiConfidenceFilter: v })}
            />
          </SettingsSection>
        </div>
      );

    case 'risk':
      return (
        <div className="space-y-4">
          <SettingsSection title="Risk Presets" description="One-click risk profiles">
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  ['conservative', 'Lower exposure, tighter stops'],
                  ['balanced', 'Default professional profile'],
                  ['aggressive', 'Higher risk tolerance'],
                ] as const
              ).map(([id, desc]) => (
                <RiskPresetCard
                  key={id}
                  label={id}
                  description={desc}
                  active={settings.risk.riskPreset === id}
                  onSelect={() => applyRiskPreset(id)}
                />
              ))}
            </div>
          </SettingsSection>
          <SettingsSection title="Risk Limits">
            <SettingsGrid>
              <SettingsSlider
                label="Risk Per Trade"
                value={settings.risk.riskPerTrade}
                onChange={(v) => update('risk', { riskPerTrade: v, maxTradePercent: v })}
                min={1}
                max={4}
                suffix="%"
              />
              <SettingsSlider
                label="Daily Risk Limit"
                value={settings.risk.dailyRiskLimit}
                onChange={(v) => update('risk', { dailyRiskLimit: v })}
                min={5}
                max={10}
                suffix="%"
              />
              <SettingsSlider
                label="Weekly Risk Limit"
                value={settings.risk.weeklyRiskLimit}
                onChange={(v) => update('risk', { weeklyRiskLimit: v })}
                min={5}
                max={50}
                suffix="%"
              />
              <SettingsSlider
                label="Monthly Risk Limit"
                value={settings.risk.monthlyRiskLimit}
                onChange={(v) => update('risk', { monthlyRiskLimit: v })}
                min={5}
                max={50}
                suffix="%"
              />
              <SettingsSlider
                label="Max Drawdown"
                value={settings.risk.maxDrawdown}
                onChange={(v) => update('risk', { maxDrawdown: v })}
                min={5}
                max={15}
                suffix="%"
              />
              <SettingsSlider
                label="Max Consecutive Losses"
                value={settings.risk.maxConsecutiveLosses}
                onChange={(v) => update('risk', { maxConsecutiveLosses: v })}
                min={2}
                max={5}
              />
            </SettingsGrid>
            <SettingsToggle
              label="Auto Stop Trading"
              checked={settings.risk.autoStopTrading}
              onChange={(v) => update('risk', { autoStopTrading: v })}
            />
            <SettingsToggle
              label="Equity Protection"
              checked={settings.risk.equityProtection}
              onChange={(v) => update('risk', { equityProtection: v })}
            />
            <SettingsToggle
              label="Capital Protection"
              checked={settings.risk.capitalProtection}
              onChange={(v) => update('risk', { capitalProtection: v })}
            />
            <SettingsToggle
              label="Emergency Stop"
              checked={settings.risk.emergencyStop}
              onChange={(v) => update('risk', { emergencyStop: v })}
            />
          </SettingsSection>
        </div>
      );

    case 'takeProfit':
      return (
        <div className="space-y-4">
          <SettingsSection title="Take Profit Targets">
            <SettingsToggle
              label="Fixed Take Profit"
              checked={settings.takeProfit.fixedTp}
              onChange={(v) => update('takeProfit', { fixedTp: v })}
            />
            <SettingsGrid>
              <SettingsSlider
                label="TP1 (% payout)"
                value={settings.takeProfit.tp1}
                onChange={(v) => update('takeProfit', { tp1: v })}
                min={50}
                max={100}
                suffix="%"
              />
              <SettingsSlider
                label="TP2"
                value={settings.takeProfit.tp2}
                onChange={(v) => update('takeProfit', { tp2: v })}
                min={0}
                max={100}
                suffix="%"
              />
              <SettingsSlider
                label="TP3"
                value={settings.takeProfit.tp3}
                onChange={(v) => update('takeProfit', { tp3: v })}
                min={0}
                max={100}
                suffix="%"
              />
              <SettingsSlider
                label="TP4"
                value={settings.takeProfit.tp4}
                onChange={(v) => update('takeProfit', { tp4: v })}
                min={0}
                max={100}
                suffix="%"
              />
            </SettingsGrid>
            <SettingsToggle
              label="Partial Close"
              checked={settings.takeProfit.partialClose}
              onChange={(v) => update('takeProfit', { partialClose: v })}
            />
            <SettingsToggle
              label="Dynamic Take Profit"
              checked={settings.takeProfit.dynamicTp}
              onChange={(v) => update('takeProfit', { dynamicTp: v })}
            />
            <SettingsToggle
              label="ATR Based TP"
              checked={settings.takeProfit.atrBasedTp}
              onChange={(v) => update('takeProfit', { atrBasedTp: v })}
            />
            <SettingsSlider
              label="Risk Reward Ratio"
              value={settings.takeProfit.riskRewardTp}
              onChange={(v) => update('takeProfit', { riskRewardTp: v })}
              min={1}
              max={5}
              step={0.1}
              suffix="R"
            />
          </SettingsSection>
        </div>
      );

    case 'stopLoss':
      return (
        <div className="space-y-4">
          <SettingsSection title="Stop Loss Rules">
            <SettingsToggle
              label="Fixed Stop Loss"
              checked={settings.stopLoss.fixedSl}
              onChange={(v) => update('stopLoss', { fixedSl: v })}
            />
            <SettingsToggle
              label="Dynamic Stop Loss"
              checked={settings.stopLoss.dynamicSl}
              onChange={(v) => update('stopLoss', { dynamicSl: v })}
            />
            <SettingsToggle
              label="ATR Stop"
              checked={settings.stopLoss.atrStop}
              onChange={(v) => update('stopLoss', { atrStop: v })}
            />
            <SettingsToggle
              label="Break Even"
              checked={settings.stopLoss.breakEven}
              onChange={(v) => update('stopLoss', { breakEven: v })}
            />
            <SettingsToggle
              label="Auto Move SL"
              checked={settings.stopLoss.autoMoveSl}
              onChange={(v) => update('stopLoss', { autoMoveSl: v })}
            />
            <SettingsToggle
              label="Smart Stop"
              checked={settings.stopLoss.smartStop}
              onChange={(v) => update('stopLoss', { smartStop: v })}
            />
            <SettingsToggle
              label="Trailing Stop"
              checked={settings.stopLoss.trailingStop}
              onChange={(v) => update('stopLoss', { trailingStop: v })}
            />
            <SettingsSlider
              label="Trailing Distance"
              value={settings.stopLoss.trailingDistance}
              onChange={(v) => update('stopLoss', { trailingDistance: v })}
              min={1}
              max={50}
              suffix=" pips"
            />
          </SettingsSection>
        </div>
      );

    case 'ai':
      return (
        <div className="space-y-4">
          <SettingsSection title="AI Providers">
            <SettingsToggle
              label="AI Enabled"
              checked={settings.ai.aiEnabled}
              onChange={(v) => update('ai', { aiEnabled: v })}
            />
            <SettingsInput
              label="Gemini API Key"
              type="password"
              value={settings.ai.geminiApiKey}
              onChange={(v) => update('ai', { geminiApiKey: v })}
              mono
            />
            <SettingsInput
              label="OpenAI API Key"
              type="password"
              value={settings.ai.openaiApiKey}
              onChange={(v) => update('ai', { openaiApiKey: v })}
              mono
            />
            <SettingsInput
              label="Claude API Key"
              type="password"
              value={settings.ai.claudeApiKey}
              onChange={(v) => update('ai', { claudeApiKey: v })}
              mono
            />
          </SettingsSection>
          <SettingsSection title="AI Features">
            <SettingsToggle
              label="AI Analysis"
              checked={settings.ai.aiAnalysis}
              onChange={(v) => update('ai', { aiAnalysis: v })}
            />
            <SettingsToggle
              label="Market Prediction"
              checked={settings.ai.aiMarketPrediction}
              onChange={(v) => update('ai', { aiMarketPrediction: v })}
            />
            <SettingsToggle
              label="Sentiment Analysis"
              checked={settings.ai.aiSentiment}
              onChange={(v) => update('ai', { aiSentiment: v })}
            />
            <SettingsToggle
              label="Trade Validation"
              checked={settings.ai.aiTradeValidation}
              onChange={(v) => update('ai', { aiTradeValidation: v })}
            />
            <SettingsToggle
              label="AI Learning"
              checked={settings.ai.aiLearning}
              onChange={(v) => update('ai', { aiLearning: v })}
            />
            <SettingsToggle
              label="Auto Optimization"
              checked={settings.ai.autoOptimization}
              onChange={(v) => update('ai', { autoOptimization: v })}
            />
            <SettingsSlider
              label="AI Confidence Threshold"
              value={settings.ai.aiConfidenceThreshold}
              onChange={(v) => update('ai', { aiConfidenceThreshold: v })}
              min={50}
              max={95}
              suffix="%"
            />
            <SettingsTextarea
              label="Prompt Editor"
              value={settings.ai.promptEditor}
              onChange={(v) => update('ai', { promptEditor: v })}
              rows={5}
              mono
            />
          </SettingsSection>
        </div>
      );

    case 'notifications':
      return (
        <div className="space-y-4">
          <SettingsSection title="Channels">
            {(['telegram', 'discord', 'line', 'email', 'push'] as const).map((k) => (
              <SettingsToggle
                key={k}
                label={k.charAt(0).toUpperCase() + k.slice(1)}
                checked={settings.notifications[k]}
                onChange={(v) => update('notifications', { [k]: v })}
              />
            ))}
          </SettingsSection>
          <SettingsSection title="Alert Types">
            {(
              ['tradeOpen', 'tradeClose', 'profit', 'loss', 'error', 'risk', 'system'] as const
            ).map((k) => (
              <SettingsToggle
                key={k}
                label={k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                checked={settings.notifications[k]}
                onChange={(v) => update('notifications', { [k]: v })}
              />
            ))}
          </SettingsSection>
        </div>
      );

    case 'dashboard':
      return (
        <div className="space-y-4">
          <SettingsSection title="Visibility">
            {Object.entries(settings.dashboard).map(([key, val]) =>
              typeof val === 'boolean' ? (
                <SettingsToggle
                  key={key}
                  label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                  checked={val}
                  onChange={(v) => update('dashboard', { [key]: v })}
                />
              ) : null
            )}
          </SettingsSection>
        </div>
      );

    case 'performance':
      return (
        <div className="space-y-4">
          <SettingsSection title="Testing & Analytics">
            {Object.entries(settings.performance).map(([key, val]) => (
              <SettingsToggle
                key={key}
                label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                checked={val}
                onChange={(v) => update('performance', { [key]: v })}
              />
            ))}
          </SettingsSection>
        </div>
      );

    case 'security':
      return (
        <div className="space-y-4">
          <SettingsSection title="Access Control">
            <SettingsToggle
              label="Two-Factor Authentication"
              checked={settings.security.twoFactor}
              onChange={(v) => update('security', { twoFactor: v })}
            />
            <SettingsToggle
              label="Passcode Lock"
              checked={settings.security.passcodeLock}
              onChange={(v) => update('security', { passcodeLock: v })}
            />
            <SettingsSlider
              label="Session Timeout"
              value={settings.security.sessionTimeout}
              onChange={(v) => update('security', { sessionTimeout: v })}
              min={5}
              max={120}
              suffix=" min"
            />
            <SettingsInput
              label="IP Whitelist"
              description="Comma-separated IPs"
              value={settings.security.ipWhitelist}
              onChange={(v) => update('security', { ipWhitelist: v })}
              mono
            />
            <SettingsToggle
              label="Device Management"
              checked={settings.security.deviceManagement}
              onChange={(v) => update('security', { deviceManagement: v })}
            />
            <SettingsToggle
              label="API Permission Control"
              checked={settings.security.apiPermissionControl}
              onChange={(v) => update('security', { apiPermissionControl: v })}
            />
            <SettingsToggle
              label="Encryption"
              checked={settings.security.encryption}
              onChange={(v) => update('security', { encryption: v })}
            />
            <SettingsToggle
              label="Login History"
              checked={settings.security.loginHistory}
              onChange={(v) => update('security', { loginHistory: v })}
            />
            <SettingsToggle
              label="Audit Logs"
              checked={settings.security.auditLogs}
              onChange={(v) => update('security', { auditLogs: v })}
            />
          </SettingsSection>
        </div>
      );

    case 'exchange':
      return (
        <div className="space-y-4">
          <SettingsSection title="Exchange Connections">
            <div className="grid gap-3 sm:grid-cols-2">
              <ExchangeCard
                name="IQ Option"
                connected
                active={settings.exchange.iqOption}
                onToggle={() => update('exchange', { iqOption: !settings.exchange.iqOption })}
              />
              <ExchangeCard
                name="Binance"
                active={settings.exchange.binance}
                onToggle={() => update('exchange', { binance: !settings.exchange.binance })}
              />
              <ExchangeCard
                name="Bybit"
                active={settings.exchange.bybit}
                onToggle={() => update('exchange', { bybit: !settings.exchange.bybit })}
              />
              <ExchangeCard
                name="OKX"
                active={settings.exchange.okx}
                onToggle={() => update('exchange', { okx: !settings.exchange.okx })}
              />
              <ExchangeCard
                name="MEXC"
                active={settings.exchange.mexc}
                onToggle={() => update('exchange', { mexc: !settings.exchange.mexc })}
              />
              <ExchangeCard
                name="KuCoin"
                active={settings.exchange.kucoin}
                onToggle={() => update('exchange', { kucoin: !settings.exchange.kucoin })}
              />
              <ExchangeCard
                name="Gate.io"
                active={settings.exchange.gate}
                onToggle={() => update('exchange', { gate: !settings.exchange.gate })}
              />
              <ExchangeCard
                name="Bitget"
                active={settings.exchange.bitget}
                onToggle={() => update('exchange', { bitget: !settings.exchange.bitget })}
              />
            </div>
            <SettingsToggle
              label="Latency Monitor"
              checked={settings.exchange.latencyMonitor}
              onChange={(v) => update('exchange', { latencyMonitor: v })}
            />
          </SettingsSection>
        </div>
      );

    case 'automation':
      return (
        <div className="space-y-4">
          <SettingsSection title="Automation">
            {Object.entries(settings.automation).map(([key, val]) =>
              key === 'autoSchedule' ? (
                <SettingsInput
                  key={key}
                  label="Auto Trading Schedule"
                  value={val as string}
                  onChange={(v) => update('automation', { autoSchedule: v })}
                />
              ) : (
                <SettingsToggle
                  key={key}
                  label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                  checked={val as boolean}
                  onChange={(v) => update('automation', { [key]: v })}
                />
              )
            )}
          </SettingsSection>
        </div>
      );

    case 'advanced':
      return (
        <div className="space-y-4">
          <SettingsSection title="Bot Engine">
            <SettingsSegmented
              label="Aggression Mode"
              value={settings.advanced.aggressionMode}
              onChange={(v) => update('advanced', { aggressionMode: v })}
              options={[
                { value: 'NORMAL', label: 'Normal' },
                { value: 'AGGRESSIVE', label: 'Aggressive' },
                { value: 'SUPER', label: 'Super' },
                { value: 'MEGA', label: 'Mega' },
              ]}
            />
            <SettingsToggle
              label="Session Filter"
              checked={settings.advanced.sessionFilter}
              onChange={(v) => update('advanced', { sessionFilter: v })}
            />
            <SettingsToggle
              label="Volatility Filter"
              checked={settings.advanced.volatilityFilter}
              onChange={(v) => update('advanced', { volatilityFilter: v })}
            />
          </SettingsSection>
          <SettingsSection title="Developer">
            <SettingsTextarea
              label="Custom Scripts"
              value={settings.advanced.customScripts}
              onChange={(v) => update('advanced', { customScripts: v })}
              rows={4}
              mono
            />
            <SettingsInput
              label="Webhook URL"
              value={settings.advanced.webhookUrl}
              onChange={(v) => update('advanced', { webhookUrl: v })}
              mono
            />
            <SettingsTextarea
              label="JSON Configuration"
              value={settings.advanced.jsonConfig}
              onChange={(v) => update('advanced', { jsonConfig: v })}
              rows={6}
              mono
            />
            <SettingsToggle
              label="Developer Mode"
              checked={settings.advanced.developerMode}
              onChange={(v) => update('advanced', { developerMode: v })}
            />
            <SettingsToggle
              label="Debug Mode"
              checked={settings.advanced.debugMode}
              onChange={(v) => update('advanced', { debugMode: v })}
            />
            <SettingsToggle
              label="Experimental Features"
              checked={settings.advanced.experimentalFeatures}
              onChange={(v) => update('advanced', { experimentalFeatures: v })}
            />
          </SettingsSection>
        </div>
      );

    default:
      return null;
  }
}
