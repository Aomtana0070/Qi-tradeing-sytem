const config = require('../src/config');
const IQConnector = require('../src/api/iqConnector');

describe('IQConnector suspended-asset handling', () => {
  const originalPaperMode = config.PAPER_TRADE_MODE;

  afterEach(() => {
    config.PAPER_TRADE_MODE = originalPaperMode;
  });

  test('does not retry a suspended active id or resubmit during its cooldown', async () => {
    config.PAPER_TRADE_MODE = false;
    const connector = new IQConnector();
    const send = jest.fn().mockResolvedValue({
      message: 'Cannot purchase an option (active is suspended)',
    });
    connector.isConnected = true;
    connector.isRealConnected = true;
    connector.realClient = { balances: [], trading: {}, send };
    connector.resolveAssetIds = jest.fn(() => [76]);
    connector.findPreferredBalance = jest.fn(() => ({ id: 1 }));

    await expect(connector.placeTrade('EURUSD-OTC', 'CALL', 30, 1)).rejects.toThrow(
      /active is suspended/i
    );
    expect(send).toHaveBeenCalledTimes(1);

    await expect(connector.placeTrade('EURUSD-OTC', 'CALL', 30, 1)).rejects.toThrow(
      /temporarily blocked/i
    );
    expect(send).toHaveBeenCalledTimes(1);
  });
});
