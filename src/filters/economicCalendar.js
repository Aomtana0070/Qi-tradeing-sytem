const axios = require('axios');

const CACHE_MS = 1000 * 60 * 60;
const CALENDAR_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';
const WINDOW_MS = 15 * 60 * 1000;

const ASSET_CURRENCIES = {
  EURUSD: ['EUR', 'USD'],
  GBPUSD: ['GBP', 'USD'],
  USDJPY: ['USD', 'JPY'],
  AUDUSD: ['AUD', 'USD'],
  USDCAD: ['USD', 'CAD'],
  'EURUSD-OTC': ['EUR', 'USD'],
  'GBPUSD-OTC': ['GBP', 'USD'],
  'USDJPY-OTC': ['USD', 'JPY'],
  'AUDUSD-OTC': ['AUD', 'USD'],
  'USDCAD-OTC': ['USD', 'CAD'],
};

class EconomicCalendar {
  constructor() {
    this.cache = null;
    this.cacheAt = 0;
  }

  async fetchEvents() {
    try {
      const res = await axios.get(CALENDAR_URL, { timeout: 5000 });
      return res.data || [];
    } catch {
      return this.cache || [];
    }
  }

  async getCachedEvents() {
    const now = Date.now();
    if (this.cache && now - this.cacheAt < CACHE_MS) return this.cache;
    const events = await this.fetchEvents();
    this.cache = events;
    this.cacheAt = now;
    return events;
  }

  async isNewsWindow(asset) {
    const normalized = String(asset || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');
    const currencies = ASSET_CURRENCIES[normalized] || ASSET_CURRENCIES[asset] || ['USD'];
    const events = await this.getCachedEvents();
    const now = Date.now();

    const nearby = events.filter((e) => {
      const t = new Date(e.date || e.time || (e.timestamp ? e.timestamp * 1000 : 0)).getTime();
      return currencies.includes(e.currency) && Math.abs(t - now) < WINDOW_MS;
    });

    const highImpact = nearby.some((e) => e.impact === 'High' || e.impact_level === 3);
    const medImpact = nearby.some((e) => e.impact === 'Medium' || e.impact_level === 2);

    return {
      blocked: highImpact,
      sizeMultiplier: highImpact ? 0 : medImpact ? 0.5 : 1.0,
      events: nearby,
      nextEvent: events.find((e) => {
        const t = new Date(e.date || e.time).getTime();
        return t > now;
      }),
    };
  }
}

module.exports = EconomicCalendar;
