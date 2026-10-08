class CapitalPreserver {
  constructor(startBalance = 10000) {
    this.startBalance = startBalance;
  }

  setStart(balance) {
    this.startBalance = balance;
  }

  check(balance) {
    const pct = balance / this.startBalance;
    if (pct < 0.5) return { zone: 'EMERGENCY', allowed: false };
    if (pct < 0.75) return { zone: 'RED', allowed: false };
    if (pct < 0.85) return { zone: 'YELLOW', allowed: true, maxTradePct: 1 };
    return { zone: 'GREEN', allowed: true, maxTradePct: 4 };
  }
}

module.exports = CapitalPreserver;
