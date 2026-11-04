const ClaudeSignalReview = require('../src/strategy/claudeSignalReview');

const candidate = {
  asset: 'EURUSD-OTC',
  direction: 'CALL',
  confidence: 72,
  reasons: ['RSI_OVERSOLD', 'MACD_CROSS_UP'],
};

describe('ClaudeSignalReview', () => {
  const originalApiKey = process.env.ANTHROPIC_API_KEY;

  afterEach(() => {
    if (originalApiKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalApiKey;
  });

  test('does not call Claude when review is disabled', async () => {
    const create = jest.fn();
    const reviewer = new ClaudeSignalReview({
      enabled: false,
      client: { messages: { create } },
    });

    await expect(reviewer.review(candidate)).resolves.toMatchObject({
      approved: true,
      skipped: true,
    });
    expect(create).not.toHaveBeenCalled();
  });

  test('uses the structured decision and reason returned by Claude', async () => {
    const create = jest.fn().mockResolvedValue({
      content: [
        {
          type: 'tool_use',
          name: 'review_trade_signal',
          input: { approved: false, reason: 'Signal reasons conflict' },
        },
      ],
    });
    const reviewer = new ClaudeSignalReview({
      enabled: true,
      client: { messages: { create } },
    });

    await expect(reviewer.review(candidate)).resolves.toMatchObject({
      approved: false,
      reason: 'Signal reasons conflict',
    });
    expect(create).toHaveBeenCalledTimes(1);
  });

  test('fails closed when the key, response decision, or API is unavailable', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const missingKeyReviewer = new ClaudeSignalReview({ enabled: true });
    await expect(missingKeyReviewer.review(candidate)).resolves.toMatchObject({ approved: false });

    const invalidResponseReviewer = new ClaudeSignalReview({
      enabled: true,
      client: { messages: { create: jest.fn().mockResolvedValue({ content: [] }) } },
    });
    await expect(invalidResponseReviewer.review(candidate)).resolves.toMatchObject({
      approved: false,
    });

    const unavailableReviewer = new ClaudeSignalReview({
      enabled: true,
      client: { messages: { create: jest.fn().mockRejectedValue(new Error('offline')) } },
    });
    await expect(unavailableReviewer.review(candidate)).resolves.toMatchObject({ approved: false });
  });
});
