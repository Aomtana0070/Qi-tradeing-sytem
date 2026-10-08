const sections = [
  {
    title: 'Trading flow',
    items: [
      [
        '1. Candle feed',
        'Connects to the selected IQ Option account and collects the configured market candles. A fresh start needs enough candles before indicators can produce a signal.',
        'Active',
      ],
      [
        '2. Strategy consensus',
        'Combines RSI, MACD, Bollinger Bands, EMA trend, Stochastic, ADX/ATR, candle patterns, and nearby support/resistance. The configured minimum agreement and confidence thresholds can reject a signal.',
        'Active',
      ],
      [
        '3. Market filters',
        'Session, economic-calendar, volatility, circuit-breaker, capital-preservation, and cooldown checks can block a signal before an order is considered.',
        'Active',
      ],
      [
        '4. Risk gate',
        'Checks available balance, daily loss, session drawdown, loss cooldown, broker minimum, martingale behavior, and the configured per-trade percentage cap. Rejected orders are not submitted.',
        'Active',
      ],
      [
        '5. Order execution',
        'PAPER mode never submits a broker order. With PAPER off, broker orders can be submitted to the selected account; whether funds are real depends on ACCOUNT_TYPE. Mode changes are intentionally locked in this dashboard.',
        'Safety critical',
      ],
    ],
  },
  {
    title: 'Command and analytics',
    items: [
      [
        'Balance and P&L',
        'Displays the balance and performance values received from the bot. PAPER results are simulated and should not be treated as expected live performance.',
        'Active',
      ],
      [
        'Win rate and streak',
        'Summarizes the trades currently recorded by the trade logger. Small samples are not evidence of a profitable strategy.',
        'Active',
      ],
      [
        'Price chart and candles',
        'Shows recent candle/price data received from the configured asset. Candle availability depends on broker connection and market data.',
        'Active',
      ],
      [
        'Indicators and signal',
        'Shows the latest computed indicator values, signal direction, confidence, and reasons when the bot has enough candle history.',
        'Active',
      ],
      [
        'Recent trades',
        'Lists settled trades written to the local trade log. Keep the data directory private; it is excluded from Git.',
        'Active',
      ],
      [
        'Assistant',
        'Uses the configured Gemini service when available and falls back to rule-based responses. AI text is informational and does not guarantee or authorize a trade.',
        'Limited',
      ],
      [
        'Pause, resume, stop',
        'Pause prevents new automated trades; resume allows the loop to continue; stop shuts down the bot and disconnects. Stop does not cancel an order already submitted to the broker.',
        'Active',
      ],
    ],
  },
  {
    title: 'Settings that affect the engine',
    items: [
      [
        'Asset and aggression',
        'Changes the selected asset and strategy aggression level. Aggression may change signal thresholds but never raises the hard per-trade cap.',
        'Active',
      ],
      [
        'Risk controls',
        'Trade percentage is limited to 1–4%; daily loss to at most 10%; consecutive losses to at most 5. A trade below the broker minimum is blocked instead of being increased.',
        'Active',
      ],
      [
        'Signal and indicators',
        'Minimum confidence/agreement, RSI period/levels, MACD periods, session filter, and volatility filter are sent to the running bot and validated before applying.',
        'Active',
      ],
      [
        'Execution mode',
        'The dashboard cannot enable LIVE trading. Set PAPER_TRADE_MODE in the private local .env file and restart only after reviewing all risks. Keep PAPER_TRADE_MODE=true for testing.',
        'Locked',
      ],
    ],
  },
  {
    title: 'Settings that are display-only or not connected',
    items: [
      [
        'General appearance',
        'Theme, layout, compact mode, and locale change dashboard presentation or stay in browser settings; they do not change trading decisions.',
        'Display',
      ],
      [
        'Strategy cards and advanced methods',
        'The separate EMA/SMA/VWAP/SMC/ICT/custom strategy toggles do not add those strategy engines. The active engine is the consensus implementation described above.',
        'UI only',
      ],
      [
        'Take profit and stop loss',
        'These controls are not connected to the binary-option order lifecycle. Do not assume they protect a submitted trade.',
        'UI only',
      ],
      [
        'AI provider keys and AI toggles',
        'The active assistant reads provider configuration from the server environment. Keys typed into dashboard settings are not used to configure the server.',
        'UI only',
      ],
      [
        'Notifications, exchange, security, automation, performance',
        'These category controls are presentation/settings data only unless explicitly shown as active above. They do not configure other brokers, 2FA, backtesting, or automated schedules.',
        'UI only',
      ],
    ],
  },
];

const statusStyle: Record<string, string> = {
  Active: 'text-emerald-300',
  'Safety critical': 'text-amber-300',
  Limited: 'text-sky-300',
  Locked: 'text-amber-300',
  Display: 'text-ink-muted',
  'UI only': 'text-rose-300',
};

export function FeatureGuide() {
  return (
    <div className="h-full overflow-auto px-4 py-5 md:px-6 md:py-7">
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="border-b border-[var(--border)] pb-5">
          <p className="text-xs font-semibold uppercase text-[var(--accent)]">Operator guide</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">How this bot works</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">
            คู่มือนี้บอกสิ่งที่ระบบทำได้จริงและส่วนที่ยังไม่เชื่อมกับ engine
            ไม่มีระบบใดรับประกันกำไรหรือผลการเทรดในอนาคต
          </p>
        </header>

        <div className="border-l-2 border-amber-400 bg-amber-400/5 px-4 py-3 text-sm leading-6 text-amber-100">
          Paper trades use a random simulated outcome, not historical market replay. The bot may
          still connect to the configured practice account for candles and balance, but PAPER mode
          does not submit an order. Never expose .env, credentials, API keys, or local trade
          history.
        </div>

        {sections.map((section) => (
          <section key={section.title} aria-labelledby={`guide-${section.title}`}>
            <h3 id={`guide-${section.title}`} className="mb-3 text-lg font-semibold text-ink">
              {section.title}
            </h3>
            <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {section.items.map(([title, description, status]) => (
                <article
                  key={title}
                  className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
                >
                  <div>
                    <h4 className="text-sm font-medium text-ink">{title}</h4>
                    <p className="mt-1 max-w-4xl text-sm leading-6 text-ink-muted">{description}</p>
                  </div>
                  <span
                    className={`text-xs font-semibold ${statusStyle[status] ?? 'text-ink-muted'}`}
                  >
                    {status}
                  </span>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
