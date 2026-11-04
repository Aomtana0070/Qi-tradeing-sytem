const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');
const logger = require('../logger/logger');

const REVIEW_TOOL = {
  name: 'review_trade_signal',
  description: 'Approve or veto a technical trade candidate. Never change its direction or size.',
  input_schema: {
    type: 'object',
    properties: {
      approved: { type: 'boolean' },
      reason: { type: 'string' },
    },
    required: ['approved', 'reason'],
    additionalProperties: false,
  },
};

class ClaudeSignalReview {
  constructor({ client, enabled = config.CLAUDE_TRADE_REVIEW_ENABLED } = {}) {
    this.enabled = enabled;
    this.client =
      client ||
      (enabled && process.env.ANTHROPIC_API_KEY
        ? new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
            timeout: config.API_TIMEOUT_MS,
          })
        : null);
  }

  async review(signal) {
    if (!this.enabled) {
      return { approved: true, skipped: true, reason: 'Claude review is disabled' };
    }

    if (!this.client) {
      return {
        approved: false,
        reason: 'Claude review is enabled but ANTHROPIC_API_KEY is missing',
      };
    }

    try {
      const response = await this.client.messages.create({
        model: config.CLAUDE_MODEL,
        max_tokens: 128,
        system:
          'You are a conservative veto-only reviewer of a precomputed trading candidate. ' +
          'Approve only when the supplied evidence is internally consistent. Never invent data, ' +
          'predict certainty, change the direction or amount, or override risk controls. ' +
          'When uncertain, set approved=false.',
        tools: [REVIEW_TOOL],
        tool_choice: { type: 'tool', name: REVIEW_TOOL.name },
        messages: [{ role: 'user', content: JSON.stringify(signal) }],
      });

      const decision = response.content.find(
        (block) => block.type === 'tool_use' && block.name === REVIEW_TOOL.name
      );
      if (typeof decision?.input?.approved !== 'boolean') {
        return { approved: false, reason: 'Claude returned no valid review decision' };
      }

      return {
        approved: decision.input.approved,
        reason: String(decision.input.reason || 'No reason provided').slice(0, 240),
        model: config.CLAUDE_MODEL,
      };
    } catch {
      logger.warn('Claude review unavailable; candidate blocked');
      return { approved: false, reason: 'Claude review unavailable; candidate blocked' };
    }
  }
}

module.exports = ClaudeSignalReview;
