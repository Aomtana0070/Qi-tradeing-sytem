/**
 * IQ OPTION CONNECTOR
 * Manages WebSocket connection to IQ Option with auto-reconnect and session management
 * This is the CORE API layer - all communication goes through here
 */

const EventEmitter = require('events');
const config = require('../config');
const logger = require('../logger/logger');

let IQOptionAPI = null;
let realClientError = null;

try {
  IQOptionAPI = require('iqoption');
} catch {
  try {
    IQOptionAPI = require('iqoption-api-lib');
  } catch (innerError) {
    realClientError = innerError;
  }
}

class IQConnector extends EventEmitter {
  constructor() {
    super();
    this.client = null;
    this.realClient = null;
    this.isConnected = false;
    this.isRealConnected = false;
    this.reconnectAttempts = 0;
    this.reconnectTimeout = null;
    this.heartbeatInterval = null;
    this.sessionToken = null;
    this.accountType = null;
    this.candleHandlers = new Map();
    this.candlesConnected = false;
    this.credentials = { email: null, password: null };
    this._connectionHandlersBound = false;
  }

  /**
   * Map candle duration (seconds) to IQ Option subscription size (minutes).
   */
  durationToCandleSize(durationSec) {
    const minutes = Math.max(1, Math.round(durationSec / 60));
    return minutes;
  }

  /**
   * Normalize IQ Option candle tick to internal OHLCV format.
   */
  normalizeCandle(tick) {
    const ts =
      typeof tick.from === 'number'
        ? tick.from * 1000
        : typeof tick.to === 'number'
          ? tick.to * 1000
          : Date.now();

    return {
      timestamp: ts,
      open: Number(tick.open),
      high: Number(tick.max ?? tick.high ?? tick.close),
      low: Number(tick.min ?? tick.low ?? tick.close),
      close: Number(tick.close),
      volume: Number(tick.volume) || 0,
      time: ts,
      candleId: tick.id != null ? tick.id : tick.from,
      from: tick.from,
    };
  }

  /**
   * Ensure WebSocket client is connected for live candle data.
   */
  async ensureCandlesConnection(email, password) {
    if (this.candlesConnected && this.realClient) return true;

    if (!IQOptionAPI) {
      throw new Error(
        realClientError
          ? `IQ Option API failed to load: ${realClientError.message}`
          : 'IQ Option API not installed'
      );
    }

    if (!email || !password) {
      throw new Error('IQ_EMAIL and IQ_PASSWORD required for live candle data');
    }

    this.realClient = new IQOptionAPI({ email, password });
    await this.realClient.login();
    await this.realClient.connect();
    this.candlesConnected = true;
    this.isRealConnected = true;
    this.bindConnectionHandlers();
    return true;
  }

  bindConnectionHandlers() {
    if (!this.realClient || this._connectionHandlersBound) return;
    this._connectionHandlersBound = true;

    const onDisconnect = () => {
      if (!this.isConnected) return;
      logger.warn('⚠️ IQ Option connection lost');
      this.isRealConnected = false;
      this.candlesConnected = false;
      this.emit('connection_lost');
      const { email, password } = this.credentials;
      if (email && password) {
        this.attemptReconnect(email, password, this.accountType);
      }
    };

    if (typeof this.realClient.on === 'function') {
      this.realClient.on('disconnect', onDisconnect);
      this.realClient.on('close', onDisconnect);
      this.realClient.on('error', (err) => {
        logger.error('IQ Option client error', err);
        this.emit('connection_error', err);
      });
    }
  }

  /**
   * Extract realized P&L from a closed IQ Option position.
   */
  extractPositionPnl(position, amount) {
    if (!position) return null;

    if (typeof position.pnl === 'number') return position.pnl;
    if (typeof position.pnl_net === 'number') return position.pnl_net;
    if (typeof position.close_profit === 'number') return position.close_profit;
    if (typeof position.sell_profit === 'number') return position.sell_profit;

    const raw = position.raw_event?.binary_options_option_changed1;
    if (raw) {
      if (raw.win === 'win' && typeof raw.profit_amount === 'number') {
        return raw.profit_amount;
      }
      if (raw.win === 'loose' || raw.win === 'lose') {
        return -amount;
      }
      if (raw.win === 'equal') return 0;
    }

    const invest = position.invest || position.amount || amount;
    if (typeof position.profit === 'number') {
      return position.profit;
    }
    if (position.close_reason === 'win' || position.result === 'win') {
      return typeof position.profit_amount === 'number' ? position.profit_amount : invest * 0.85;
    }
    if (
      position.close_reason === 'loose' ||
      position.close_reason === 'lose' ||
      position.result === 'loose'
    ) {
      return -invest;
    }

    return null;
  }

  positionMatchesOptionId(position, optionId) {
    if (!position) return false;
    const rawOptionId = position.raw_event?.binary_options_option_changed1?.option_id;
    return (
      position.id === optionId || position.external_id === optionId || rawOptionId === optionId
    );
  }

  /**
   * Wait until a binary option settles (WIN/LOSS) before returning.
   */
  async waitForOptionSettlement(optionId, amount, durationMinutes) {
    if (!this.realClient) {
      throw new Error('Real client not connected for settlement');
    }

    const timeoutMs = (durationMinutes * 60 + 45) * 1000;
    const instrumentTypes =
      durationMinutes <= 5 ? ['turbo-option', 'binary-option'] : ['binary-option', 'turbo-option'];
    const balanceInfo = this.findPreferredBalance(this.realClient.balances || []);

    return new Promise((resolve) => {
      let settled = false;

      const finish = (outcome) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(outcome);
      };

      const resolveFromPosition = (position) => {
        if (!position || position.status !== 'closed') return false;
        const pnl = this.extractPositionPnl(position, amount);
        if (pnl === null) return false;

        const result = pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'LOSS';
        finish({ result, pnl, raw: position, settledBy: 'position' });
        return true;
      };

      const onPositionChanged = (data) => {
        if (!this.positionMatchesOptionId(data, optionId)) return;
        resolveFromPosition(data);
      };

      const onSoldOptions = (data) => {
        const sold = data?.[optionId] || data?.[String(optionId)];
        if (!sold) return;
        const pnl =
          sold.win === 'win'
            ? typeof sold.profit_amount === 'number'
              ? sold.profit_amount
              : amount * 0.85
            : sold.win === 'equal'
              ? 0
              : -amount;
        finish({
          result: pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'LOSS',
          pnl,
          raw: sold,
          settledBy: 'sold-options',
        });
      };

      const cleanup = () => {
        if (typeof this.realClient.off === 'function') {
          this.realClient.off('position-changed', onPositionChanged);
          this.realClient.off('sold-options', onSoldOptions);
        }
        clearInterval(pollInterval);
        clearTimeout(timeoutHandle);
      };

      if (typeof this.realClient.on === 'function') {
        this.realClient.on('position-changed', onPositionChanged);
        this.realClient.on('sold-options', onSoldOptions);
      }

      const pollInterval = setInterval(async () => {
        if (!balanceInfo || typeof this.realClient.send !== 'function') return;
        try {
          for (const instrumentType of instrumentTypes) {
            const portfolio = await this.realClient.send('portfolio.get-positions', {
              user_balance_id: balanceInfo.id,
              instrument_types: [instrumentType],
              returnMessage: true,
            });
            const positions = portfolio?.positions || [];
            const match = positions.find((pos) => this.positionMatchesOptionId(pos, optionId));
            if (match && resolveFromPosition(match)) return;
          }
        } catch (error) {
          logger.debug('Settlement poll failed', error.message);
        }
      }, 2000);

      const timeoutHandle = setTimeout(() => {
        logger.warn(`⏱️ Settlement timeout for option ${optionId}, assuming LOSS`);
        finish({ result: 'LOSS', pnl: -amount, settledBy: 'timeout' });
      }, timeoutMs);
    });
  }

  /**
   * Connect to IQ Option WebSocket
   * @param {string} email - IQ Option email
   * @param {string} password - IQ Option password
   * @param {string} accountType - 'PRACTICE' or 'REAL'
   * @returns {Promise<boolean>} connection success
   */
  async connect(email, password, accountType = 'PRACTICE') {
    if (this.isConnected) {
      logger.warn('Already connected to IQ Option');
      return true;
    }

    try {
      logger.info('🔌 Connecting to IQ Option...');
      this.accountType = accountType;
      this.credentials = { email, password };

      this.isConnected = true;

      // Always connect real API when credentials exist (candles + optional live trades)
      if (IQOptionAPI && email && password) {
        await this.ensureCandlesConnection(email, password);
        this.client = {
          isConnected: true,
          accountType,
          balance: null,
        };
        const balance = await this.getBalance().catch(() => (config.PAPER_TRADE_MODE ? 10000 : 0));
        this.client.balance = balance;
      } else if (!config.PAPER_TRADE_MODE) {
        const message = realClientError
          ? `Real IQ Option API library failed to load: ${realClientError.message}`
          : 'Real IQ Option API library not installed. Run npm install iqoption';
        throw new Error(message);
      } else {
        this.client = {
          isConnected: true,
          accountType,
          balance: 10000,
        };
      }

      this.reconnectAttempts = 0;

      logger.success('✅ Connected to IQ Option', {
        account: accountType,
        email: email && email.includes('@') ? email.split('@')[0] + '@...' : email,
      });

      // Start heartbeat
      this.startHeartbeat();

      // Emit connection event
      this.emit('connected', { accountType });

      return true;
    } catch (error) {
      logger.error('❌ Connection failed', error);
      this.isConnected = false;
      this.attemptReconnect(email, password, accountType);
      return false;
    }
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  async attemptReconnect(email, password, accountType) {
    if (this.reconnectTimeout) return;

    if (this.reconnectAttempts >= config.RECONNECT_MAX_RETRIES) {
      logger.error('🔴 Max reconnection attempts reached. Stopping bot.');
      this.emit('fatal_error', 'Cannot reconnect to IQ Option');
      return;
    }

    this.reconnectAttempts++;
    const backoffMs = config.RECONNECT_BACKOFF_MS * Math.pow(2, this.reconnectAttempts - 1);

    logger.warn(
      `⏳ Reconnecting in ${backoffMs / 1000}s (attempt ${this.reconnectAttempts}/${config.RECONNECT_MAX_RETRIES})`
    );

    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = null;
      this.isConnected = false;
      this.isRealConnected = false;
      this.candlesConnected = false;
      this._connectionHandlersBound = false;
      await this.connect(email, password, accountType);
    }, backoffMs);
  }

  /**
   * Keep session alive with heartbeat
   */
  startHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);

    this.heartbeatInterval = setInterval(async () => {
      if (!this.isConnected) return;

      try {
        if (this.realClient && this.isRealConnected) {
          await this.getBalance();
          this.reconnectAttempts = 0;
        }
        logger.debug('💓 Heartbeat OK');
        this.emit('heartbeat');
      } catch (error) {
        logger.warn('💓 Heartbeat failed — connection may be stale', error.message);
        this.isRealConnected = false;
        this.emit('connection_lost');
        const { email, password } = this.credentials;
        if (email && password && this.reconnectAttempts < config.RECONNECT_MAX_RETRIES) {
          this.attemptReconnect(email, password, this.accountType);
        }
      }
    }, config.SESSION_HEARTBEAT_MS);
  }

  /**
   * Resolve IQ Option asset active_id from symbol, name, or environment override.
   * @param {string|number} asset
   * @returns {number}
   */
  resolveAssetIds(asset) {
    if (config.ASSET_ACTIVE_ID) {
      return [config.ASSET_ACTIVE_ID];
    }

    if (typeof asset === 'number' || /^[0-9]+$/.test(String(asset))) {
      return [Number(asset)];
    }

    if (!IQOptionAPI || typeof IQOptionAPI.assets !== 'function') {
      throw new Error(
        `Unable to resolve asset id for '${asset}'. Set ASSET_ACTIVE_ID in .env or install a compatible IQ Option API library.`
      );
    }

    const normalized = String(asset).trim().toUpperCase().replace(/\s+/g, '').replace(/\//g, '');
    const allAssets = IQOptionAPI.assets();
    if (!Array.isArray(allAssets)) {
      throw new Error(`IQ Option assets list is unavailable. Cannot resolve '${asset}'.`);
    }

    const candidates = [];
    const directByName = IQOptionAPI.assets(String(asset));
    if (directByName && directByName.active_id) {
      candidates.push(directByName.active_id);
    }

    const directByTicker = IQOptionAPI.assets(normalized);
    if (
      directByTicker &&
      directByTicker.active_id &&
      !candidates.includes(directByTicker.active_id)
    ) {
      candidates.push(directByTicker.active_id);
    }

    allAssets.forEach((item) => {
      const ticker = String(item.ticker || '').toUpperCase();
      const name = String(item.name || '')
        .toUpperCase()
        .replace(/\s+/g, '')
        .replace(/\//g, '');

      if (
        (ticker === normalized || name === normalized) &&
        item.active_id &&
        !candidates.includes(item.active_id)
      ) {
        candidates.push(item.active_id);
      }
    });

    if (candidates.length === 0) {
      throw new Error(
        `Could not resolve asset id for '${asset}'. Set ASSET_ACTIVE_ID in .env or use a supported asset ticker/name.`
      );
    }

    return candidates;
  }

  /**
   * Detect suspended active errors from IQ Option.
   * @param {Error|object|string} error
   * @returns {boolean}
   */
  isSuspendedError(error) {
    if (!error) return false;
    const message = typeof error === 'string' ? error : error.message || error.error || '';
    return /suspended/i.test(String(message));
  }

  /**
   * Convert account type into IQ Option balance type filter.
   * @param {string} accountType
   * @returns {number[]}
   */
  getBalanceTypes(accountType) {
    if (!accountType) {
      return [1, 4];
    }

    const type = String(accountType).trim().toUpperCase();
    if (type === 'REAL') return [1];
    if (type === 'PRACTICE' || type === 'DEMO') return [4];
    return [1, 4];
  }

  /**
   * Find the best balance from available IQ balances.
   * @param {Array} balances
   * @returns {object|null}
   */
  findPreferredBalance(balances) {
    if (!Array.isArray(balances)) return null;

    const balanceTypes = this.getBalanceTypes(this.accountType);
    const matches = balances.filter((balance) => balanceTypes.includes(balance.type));
    return matches.length > 0 ? matches[0] : balances[0] || null;
  }

  /**
   * Get current balance
   * @returns {Promise<number>} balance in USD
   */
  async getBalance() {
    if (!this.isConnected) throw new Error('Not connected to IQ Option');
    try {
      if (!config.PAPER_TRADE_MODE && this.realClient && this.isRealConnected) {
        let balances = null; // ← เพิ่ม let กลับมา
        if (Array.isArray(this.realClient.balances) && this.realClient.balances.length > 0) {
          balances = this.realClient.balances;
        } else if (typeof this.realClient.send === 'function') {
          balances = await this.realClient.send('get-balances', { returnMessage: true });
        }
        if (balances && Array.isArray(balances)) {
          const balanceInfo = this.findPreferredBalance(balances);
          if (balanceInfo && typeof balanceInfo.amount === 'number') {
            this.client.balance = balanceInfo.amount;
            return balanceInfo.amount;
          }
        }
      }
      return this.client?.balance || 10000;
    } catch (error) {
      logger.error('Failed to get balance', error);
      throw error;
    }
  }

  /**
   * Subscribe to live candle data
   * @param {string} asset - e.g., 'EURUSD'
   * @param {number} duration - candle duration in seconds
   * @param {function} callback - called when candle closes
   * @returns {function} unsubscribe function
   */
  subscribeToCandles(asset, duration, callback) {
    const size = this.durationToCandleSize(duration);
    const activeIds = this.resolveAssetIds(asset);
    const activeId = activeIds[0];
    const subKey = `${activeId}:${size}`;

    logger.info(`📊 Subscribing to live candles: ${asset} (active_id=${activeId}, size=${size}m)`);

    const startRealSubscription = async () => {
      if (!this.realClient || !this.candlesConnected) {
        throw new Error('Real IQ Option client not connected for candles');
      }

      let lastTickId = null;
      let buildingCandle = null;
      const historyBuffer = [];

      const onTick = (tick) => {
        if (!tick || tick.active_id !== activeId) return;
        if (tick.size && tick.size !== size) return;

        const candle = this.normalizeCandle(tick);
        const tickId = tick.id != null ? tick.id : tick.from;

        // New candle id = previous candle closed
        if (lastTickId !== null && tickId !== lastTickId && buildingCandle) {
          historyBuffer.push(buildingCandle);
          if (historyBuffer.length > config.CANDLE_BUFFER_SIZE) {
            historyBuffer.shift();
          }
          try {
            callback(buildingCandle, { closed: true });
          } catch (error) {
            logger.error('Error in candle callback', error);
          }
        }

        lastTickId = tickId;
        buildingCandle = candle;
      };

      this.realClient.on('candle-generated', onTick);
      this.candleHandlers.set(subKey, { onTick, activeId, size });

      await this.realClient.subscribe('candle-generated', { active_id: activeId, size });

      logger.success(`✅ Live candle stream active for ${asset}`);
    };

    const fallbackMock = () => {
      if (!config.PAPER_TRADE_MODE) {
        logger.error('🔴 Live mode requires real candle stream — refusing mock candles');
        return () => {};
      }
      logger.warn('⚠️ Falling back to simulated candles (paper mode only)');
      const candleInterval = setInterval(
        () => {
          const base = 1.075;
          const close = base + Math.random() * 0.001 - 0.0005;
          const mockCandle = {
            timestamp: Date.now(),
            open: close - 0.0001,
            high: close + 0.0003,
            low: close - 0.0003,
            close,
            volume: Math.floor(Math.random() * 10000),
          };
          try {
            callback(mockCandle, { closed: true });
          } catch (error) {
            logger.error('Error in candle callback', error);
          }
        },
        Math.max(60, duration) * 1000
      );

      return () => {
        clearInterval(candleInterval);
        logger.info(`📊 Unsubscribed from ${asset} (mock)`);
      };
    };

    if (this.realClient && this.candlesConnected) {
      startRealSubscription().catch((err) => {
        logger.error('Live candle subscription failed', err);
      });

      return () => {
        const handler = this.candleHandlers.get(subKey);
        if (handler && this.realClient) {
          this.realClient.off('candle-generated', handler.onTick);
          this.realClient
            .unsubscribe('candle-generated', { active_id: handler.activeId, size: handler.size })
            .catch(() => {});
          this.candleHandlers.delete(subKey);
        }
        logger.info(`📊 Unsubscribed from ${asset}`);
      };
    }

    return fallbackMock();
  }

  /**
   * Place a binary option trade
   * @param {string} asset - e.g., 'EURUSD'
   * @param {string} direction - 'CALL' or 'PUT'
   * @param {number} amount - trade amount in USD
   * @param {number} duration - option duration in minutes
   * @returns {Promise<object>} trade result
   */
  async placeTrade(asset, direction, amount, duration) {
    if (!this.isConnected) {
      throw new Error('Not connected to IQ Option');
    }

    if (!['CALL', 'PUT'].includes(direction)) {
      throw new Error(`Invalid direction: ${direction}`);
    }

    if (amount <= 0) {
      throw new Error(`Invalid trade amount: ${amount}`);
    }

    try {
      logger.info(`📈 Placing trade: ${direction} ${amount} ${asset} ${duration}m`);

      if (!config.PAPER_TRADE_MODE) {
        if (!this.realClient || !this.isRealConnected) {
          throw new Error('Real IQ Option client is not connected');
        }

        const activeIds = this.resolveAssetIds(asset);
        const balanceId = this.findPreferredBalance(this.realClient.balances || []);

        if (!balanceId) {
          throw new Error('Unable to determine the correct IQ Option balance to use for trading');
        }

        const optionTypeId = duration <= 5 ? 3 : 1;
        let option = null;
        let lastError = null;

        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        for (const activeId of activeIds) {
          const profitPercent =
            this.realClient.trading?.profits?.[
              optionTypeId === 3 ? 'turbo-option' : 'binary-option'
            ]?.[activeId];

          const openOptionRequest = {
            user_balance_id: balanceId.id,
            active_id: activeId,
            option_type_id: optionTypeId,
            direction: direction.toLowerCase(),
            expired: duration,
            price: amount,
            profit_percent: profitPercent,
            returnMessage: true,
          };

          const maxAttempts = 2;
          for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            option = await this.realClient.send('binary-options.open-option', openOptionRequest);

            if (option && option.message) {
              lastError = new Error(option.message);
              if (attempt < maxAttempts && this.isSuspendedError(option)) {
                logger.warn(
                  `⚠️ Active ${activeId} is suspended (attempt ${attempt}). Retrying once in 1s...`,
                  option.message
                );
                await sleep(1000);
                continue;
              }
              break;
            }

            if (option) {
              break;
            }
          }

          if (option && !option.message) {
            logger.info(`✅ Successfully placed order using active_id=${activeId}`);
            break;
          }

          if (this.isSuspendedError(lastError) && activeIds.length > 1) {
            logger.warn(
              `⚠️ Active ${activeId} failed. Trying next matching asset id if available.`
            );
            await sleep(1000);
            continue;
          }

          if (lastError) {
            break;
          }
        }

        if (!option) {
          throw new Error('No response received from IQ Option when placing order');
        }

        if (option && option.message) {
          throw lastError || new Error(option.message);
        }

        const orderId = option.id || option.orderId || `real_${Date.now()}`;

        logger.info(`⏳ Waiting for option ${orderId} to settle (${duration}m)...`);

        const settlement = await this.waitForOptionSettlement(orderId, amount, duration);
        const balanceAfter = await this.getBalance().catch(() => null);

        const result = {
          orderId,
          direction,
          asset,
          amount,
          timestamp: Date.now(),
          result: settlement.result,
          pnl: settlement.pnl,
          balanceAfter,
          settledBy: settlement.settledBy,
          raw: { open: option, close: settlement.raw },
        };

        logger.success(`✅ Trade settled: ${result.result}`, {
          orderId: result.orderId,
          pnl: result.pnl,
          settledBy: settlement.settledBy,
        });

        return result;
      }

      const tradeId = 'trade_' + Date.now();
      const isWin = Math.random() > 0.45;

      return new Promise((resolve) => {
        setTimeout(
          () => {
            const result = {
              orderId: tradeId,
              direction,
              asset,
              amount,
              timestamp: Date.now(),
              result: isWin ? 'WIN' : 'LOSS',
              pnl: isWin ? amount : -amount,
            };

            logger.success(`✅ Trade ${result.result}`, { orderId: tradeId, pnl: result.pnl });
            resolve(result);
          },
          duration * 60 * 1000
        );
      });
    } catch (error) {
      logger.error('Failed to place trade', error);
      throw error;
    }
  }

  /**
   * Disconnect from IQ Option
   */
  async disconnect() {
    try {
      if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
      if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

      if (this.realClient && typeof this.realClient.disconnect === 'function') {
        await this.realClient.disconnect();
      }

      this.isConnected = false;
      this.isRealConnected = false;
      this.candlesConnected = false;
      this._connectionHandlersBound = false;
      this.client = null;
      this.realClient = null;

      logger.info('🔌 Disconnected from IQ Option');
      this.emit('disconnected');

      return true;
    } catch (error) {
      logger.error('Error during disconnect', error);
      return false;
    }
  }

  /**
   * Check connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      lastConnected: new Date(),
    };
  }
}

module.exports = IQConnector;
