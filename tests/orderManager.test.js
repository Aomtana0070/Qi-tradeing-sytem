const config = require('../src/config');
const OrderManager = require('../src/execution/orderManager');

describe('OrderManager execution failures', () => {
  const originalPaperMode = config.PAPER_TRADE_MODE;

  afterEach(() => {
    config.PAPER_TRADE_MODE = originalPaperMode;
  });

  test('propagates broker rejection instead of returning a successful trade result', async () => {
    config.PAPER_TRADE_MODE = false;
    const brokerError = new Error('Cannot purchase an option (active is suspended)');
    const connector = {
      placeTrade: jest.fn().mockRejectedValue(brokerError),
    };
    const riskManager = {
      lastTradeAmount: 0,
      canTrade: jest.fn(() => ({ allowed: true })),
    };
    const manager = new OrderManager(connector, riskManager, null);

    await expect(
      manager.placeTrade(
        {
          asset: 'EURUSD-OTC',
          direction: 'CALL',
          amount: 30,
          duration: 1,
          signalConfidence: 70,
        },
        10000
      )
    ).rejects.toThrow('active is suspended');
    expect(connector.placeTrade).toHaveBeenCalledTimes(1);
  });
});
