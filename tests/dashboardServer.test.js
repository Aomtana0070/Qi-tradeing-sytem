const config = require('../src/config');
const DashboardServer = require('../src/dashboard/server');

describe('DashboardServer manual trade responses', () => {
  const originalPort = config.DASHBOARD_PORT;
  let dashboard;

  afterEach(async () => {
    if (dashboard) await dashboard.stop();
    dashboard = null;
    config.DASHBOARD_PORT = originalPort;
  });

  test('rejects orders while starting and reports broker rejection as failure', async () => {
    config.DASHBOARD_PORT = 0;
    const onManualTrade = jest.fn().mockResolvedValue({
      success: false,
      error: 'EURUSD-OTC is temporarily blocked after a broker suspension',
    });
    dashboard = new DashboardServer(null, null, null, onManualTrade);
    await dashboard.start();
    const port = dashboard.server.address().port;
    const url = `http://localhost:${port}/api/manual-trade`;
    const request = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction: 'CALL', amount: 30 }),
    };

    const startingResponse = await fetch(url, request);
    expect(startingResponse.status).toBe(503);
    expect((await startingResponse.json()).error).toMatch(/initializing/i);
    expect(onManualTrade).not.toHaveBeenCalled();

    dashboard.updateMetrics({ status: 'RUNNING' });
    const rejectedResponse = await fetch(url, request);
    expect(rejectedResponse.status).toBe(503);
    const payload = await rejectedResponse.json();
    expect(payload.success).toBe(false);
    expect(payload.error).toMatch(/suspension/i);
    expect(onManualTrade).toHaveBeenCalledTimes(1);
  });
});
