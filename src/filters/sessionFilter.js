class SessionFilter {
  constructor(enabled = true, timezone = 'Asia/Bangkok') {
    this.enabled = enabled;
    this.timezone = timezone;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }

  _bangkokHour() {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: this.timezone,
      hour: 'numeric',
      hour12: false,
    }).formatToParts(new Date());
    const hourPart = parts.find((p) => p.type === 'hour');
    return hourPart ? parseInt(hourPart.value, 10) : new Date().getHours();
  }

  isGoodSession() {
    if (!this.enabled) {
      return {
        allowed: true,
        quality: 'ANYTIME',
        hour: this._bangkokHour(),
        sessionFilterEnabled: false,
      };
    }
    const hour = this._bangkokHour();
    const london = hour >= 14 && hour <= 23;
    const newYork = hour >= 20 || hour <= 5;
    const overlap = hour >= 20 && hour <= 23;
    return {
      allowed: london || newYork,
      quality: overlap ? 'BEST' : london || newYork ? 'GOOD' : 'POOR',
      session: overlap
        ? 'London+NY Overlap'
        : london
          ? 'London'
          : newYork
            ? 'New York'
            : 'Off-hours',
      hour,
      sessionFilterEnabled: true,
    };
  }
}

module.exports = SessionFilter;
