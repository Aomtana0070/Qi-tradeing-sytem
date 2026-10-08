const LEVELS = {
  0: { name: 'OK', action: 'Trade normally' },
  1: { name: 'CAUTION', trigger: '3% daily loss', action: 'Reduce size 50%' },
  2: { name: 'WARNING', trigger: '5% daily loss', action: 'Pause 30 minutes' },
  3: { name: 'CRITICAL', trigger: '6% daily loss', action: 'Stop for the day' },
  4: { name: 'EMERGENCY', trigger: '10% drawdown', action: 'Full stop + Alert' },
};

class CircuitBreaker {
  evaluate({ dailyLossPercent = 0, drawdownPercent = 0 }) {
    if (drawdownPercent >= 10) return { level: 4, info: LEVELS[4] };
    if (dailyLossPercent >= 6) return { level: 3, info: LEVELS[3] };
    if (dailyLossPercent >= 5) return { level: 2, info: LEVELS[2] };
    if (dailyLossPercent >= 3) return { level: 1, info: LEVELS[1] };
    return { level: 0, info: LEVELS[0] };
  }
}

module.exports = CircuitBreaker;
