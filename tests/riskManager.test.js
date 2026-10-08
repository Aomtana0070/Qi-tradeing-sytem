const config = require('../src/config');
const RiskManager = require('../src/risk/riskManager');

describe('RiskManager trade sizing', () => {
  const originalMinimum = config.MIN_TRADE_AMOUNT_USD;
  const originalCurrency = config.ACCOUNT_CURRENCY;
  const originalRate = config.USD_TO_THB_RATE;
  const originalAggression = config.AGGRESSION_LEVEL;

  afterEach(() => {
    config.MIN_TRADE_AMOUNT_USD = originalMinimum;
    config.ACCOUNT_CURRENCY = originalCurrency;
    config.USD_TO_THB_RATE = originalRate;
    config.AGGRESSION_LEVEL = originalAggression;
  });

  test('never exceeds the percentage cap when the minimum is affordable', () => {
    config.ACCOUNT_CURRENCY = 'USD';
    config.MIN_TRADE_AMOUNT_USD = 30;
    const risk = new RiskManager();
    risk.initialize(1000);

    const amount = risk.calculateTradeAmount(1000, 100, 'NORMAL');

    expect(amount).toBe(40);
    expect(amount).toBeLessThanOrEqual(1000 * (config.MAX_TRADE_PERCENT / 100));
  });

  test('returns zero instead of violating the cap when the minimum is unaffordable', () => {
    config.ACCOUNT_CURRENCY = 'THB';
    config.USD_TO_THB_RATE = 35;
    config.MIN_TRADE_AMOUNT_USD = 30;
    const risk = new RiskManager();
    risk.initialize(1000);

    expect(risk.calculateTradeAmount(1000, 100, 'NORMAL')).toBe(0);
  });

  test('blocks manual trade amounts above the configured percentage cap', () => {
    config.ACCOUNT_CURRENCY = 'USD';
    config.MIN_TRADE_AMOUNT_USD = 30;
    const risk = new RiskManager();
    risk.initialize(1000);

    expect(risk.canTrade(1000, 40).allowed).toBe(true);
    expect(risk.canTrade(1000, 41).allowed).toBe(false);
  });

  test('blocks trade amounts below the broker minimum', () => {
    config.ACCOUNT_CURRENCY = 'USD';
    config.MIN_TRADE_AMOUNT_USD = 30;
    const risk = new RiskManager();
    risk.initialize(1000);

    expect(risk.canTrade(1000, 29).allowed).toBe(false);
  });

  test('aggressive mode cannot exceed the hard percentage cap', () => {
    config.ACCOUNT_CURRENCY = 'USD';
    config.AGGRESSION_LEVEL = 'MEGA';
    const risk = new RiskManager();
    risk.initialize(1000);

    expect(risk.canTrade(1000, 40).allowed).toBe(true);
    expect(risk.canTrade(1000, 41).allowed).toBe(false);
  });
});
