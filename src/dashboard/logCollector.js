const MAX_LOGS = 200;

class LogCollector {
  constructor() {
    this.logs = [];
  }

  push(logEntry) {
    try {
      const entry = {
        time: new Date().toISOString(),
        level: logEntry.level || 'INFO',
        message: logEntry.message || '',
        data: logEntry.data || null,
      };
      this.logs.push(entry);
      if (this.logs.length > MAX_LOGS) this.logs.shift();
    } catch {
      // noop
    }
  }

  getAll() {
    return this.logs.slice();
  }
}

module.exports = new LogCollector();
