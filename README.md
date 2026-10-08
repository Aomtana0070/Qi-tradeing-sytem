# IQ Option Trading Bot

A local-only IQ Option practice/paper-trading bot with a React dashboard. Trading involves substantial risk. This software does not guarantee returns and is not financial advice.

## Safety

- The checked-in example uses `ACCOUNT_TYPE=PRACTICE` and `PAPER_TRADE_MODE=true`. Paper mode refuses to start with a REAL account.
- Paper mode does not submit broker orders. Its simulated win/loss result is random and is not a historical backtest or evidence of strategy performance.
- Live mode is deliberately locked in the dashboard. Do not enable it unless you understand the risks and have tested extensively with a practice account.
- The dashboard binds to loopback only and rejects non-local browser origins. Do not expose it through a tunnel, reverse proxy, or public network.
- Never commit `.env`, API keys, account credentials, trade history, or balance summaries. Rotate any secret that has been shared or exposed.

## Setup

1. Install root dependencies with `npm install`.
2. Install dashboard dependencies with `npm run dashboard:install`.
3. Copy `.env.example` to `.env` and enter credentials locally. Keep `PAPER_TRADE_MODE=true`.
4. Start the bot with `npm start`; the dashboard is served at `http://localhost:3001`.
5. Run `npm test -- --runInBand`, `npm run lint`, and `npm run dashboard:build` to verify changes.

For dashboard-only development, start the backend with `npm run dev`, then start Vite separately with `npm run dashboard:dev`.

## Dashboard guide

The dashboard's **Guide** tab explains the trading flow, active risk checks, controls, paper-mode limitations, and settings that are display-only or not connected to the trading engine. Read it before operating the bot.

## Active engine

The runtime combines RSI, MACD, Bollinger Bands, EMA trend, Stochastic, ADX/ATR, candle patterns, and support/resistance signals. Session, economic-calendar, volatility, circuit-breaker, capital-preserver, cooldown, and risk checks may reject a trade. The balance and broker data depend on IQ Option availability.

Several settings categories are UI placeholders, not implemented trading features. In particular, alternate exchange toggles, custom strategy cards, take-profit/stop-loss controls, backtesting/optimization toggles, advanced automation, and dashboard-entered AI keys do not configure the runtime engine. Consult the in-app Guide for the current support status.

## Validation

Tests and builds verify software behavior only. Passing them does not establish profitability, strategy validity, or readiness for live trading. The paper-trade simulator uses random outcomes; use independent historical testing and long-running practice-account forward tests before making any financial decision.
