const config = require('../src/config');
const IQConnector = require('../src/api/iqConnector');

describe('IQConnector suspended-asset handling', () => {
  const originalPaperMode = config.PAPER_TRADE_MODE;
  const originalActiveId = config.ASSET_ACTIVE_ID;

  afterEach(() => {
    config.PAPER_TRADE_MODE = originalPaperMode;
    config.ASSET_ACTIVE_ID = originalActiveId;
  });

  test('resolves OTC and regular symbols to distinct package active IDs', () => {
    config.ASSET_ACTIVE_ID = null;
    const connector = new IQConnector();

    expect(connector.resolveAssetIds('EURUSD')).toEqual([1]);
    expect(connector.resolveAssetIds('EURUSD-OTC')).toEqual([76]);
    expect(connector.resolveAssetIds('EUR/USD (OTC)')).toEqual([76]);
  });

  test('does not retry or resubmit an asset after the broker suspends it', async () => {
    config.PAPER_TRADE_MODE = false;
    const connector = new IQConnector();
    const send = jest.fn().mockResolvedValue({
      message: 'Cannot purchase an option (active is suspended)',
    });
    connector.isConnected = true;
    connector.isRealConnected = true;
    connector.realClient = { balances: [], trading: {}, send };
    connector.resolveAssetIds = jest.fn(() => [76, 1]);
    connector.findPreferredBalance = jest.fn(() => ({ id: 1 }));

    await expect(connector.placeTrade('EURUSD-OTC', 'CALL', 30, 1)).rejects.toThrow(
      /active is suspended/i
    );
    expect(send).toHaveBeenCalledTimes(1);

    await expect(connector.placeTrade('EURUSD-OTC', 'CALL', 30, 1)).rejects.toThrow(
      /blocked for this session/i
    );
    expect(send).toHaveBeenCalledTimes(1);
  });
});
