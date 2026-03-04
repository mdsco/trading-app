const BaseService = require('./BaseService');
const axios = require('axios');

/**
 * OANDA Trading Service
 * Forex and CFD trading platform
 * API Docs: https://developer.oanda.com/rest-live-v20/introduction/
 */
class OandaService extends BaseService {
  constructor(config) {
    super('OANDA', config);

    // Use practice account by default for safety
    this.baseUrl = config.useLive
      ? 'https://api-fxtrade.oanda.com/v3'
      : 'https://api-fxpractice.oanda.com/v3';

    this.apiKey = config.apiKey;
    this.accountId = config.accountId;
  }

  async getAccount() {
    try {
      const response = await this._request('GET', `/accounts/${this.accountId}`);
      const account = response.account;

      return {
        service: this.name,
        balance: parseFloat(account.balance).toFixed(2),
        equity: parseFloat(account.NAV).toFixed(2),
        buyingPower: parseFloat(account.marginAvailable).toFixed(2),
        currency: account.currency
      };
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async getPositions() {
    try {
      const response = await this._request('GET', `/accounts/${this.accountId}/positions`);
      const positions = response.positions || [];

      return positions
        .filter(pos => parseFloat(pos.long.units) !== 0 || parseFloat(pos.short.units) !== 0)
        .map(pos => {
          const longUnits = parseFloat(pos.long.units);
          const shortUnits = parseFloat(pos.short.units);
          const netUnits = longUnits + shortUnits;

          return {
            symbol: pos.instrument,
            quantity: Math.abs(netUnits),
            side: netUnits > 0 ? 'long' : 'short',
            entryPrice: parseFloat(netUnits > 0 ? pos.long.averagePrice : pos.short.averagePrice),
            currentPrice: 0, // Need separate price lookup
            unrealizedPL: parseFloat(pos.unrealizedPL),
            marketValue: Math.abs(netUnits)
          };
        });
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async getOrders() {
    try {
      const response = await this._request('GET', `/accounts/${this.accountId}/orders`);
      const orders = response.orders || [];

      return orders.map(order => ({
        id: order.id,
        symbol: order.instrument,
        quantity: Math.abs(parseFloat(order.units)),
        side: parseFloat(order.units) > 0 ? 'buy' : 'sell',
        type: order.type.toLowerCase().includes('market') ? 'market' : 'limit',
        status: order.state.toLowerCase(),
        limitPrice: order.price ? parseFloat(order.price) : null,
        filledPrice: null,
        createdAt: order.createTime
      }));
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async placeMarketOrder(symbol, quantity, side) {
    try {
      const instrument = this._formatSymbol(symbol);
      const units = side === 'buy' ? quantity : -quantity;

      const orderSpec = {
        order: {
          type: 'MARKET',
          instrument: instrument,
          units: units.toString()
        }
      };

      const response = await this._request('POST', `/accounts/${this.accountId}/orders`, orderSpec);

      return {
        success: true,
        order: {
          id: response.orderFillTransaction?.id || response.orderCreateTransaction?.id,
          symbol: instrument,
          quantity: Math.abs(units),
          side: side,
          type: 'market',
          status: 'filled'
        }
      };
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async placeLimitOrder(symbol, quantity, side, limitPrice) {
    try {
      const instrument = this._formatSymbol(symbol);
      const units = side === 'buy' ? quantity : -quantity;

      const orderSpec = {
        order: {
          type: 'LIMIT',
          instrument: instrument,
          units: units.toString(),
          price: limitPrice.toString(),
          timeInForce: 'GTC'
        }
      };

      const response = await this._request('POST', `/accounts/${this.accountId}/orders`, orderSpec);

      return {
        success: true,
        order: {
          id: response.orderCreateTransaction?.id,
          symbol: instrument,
          quantity: Math.abs(units),
          side: side,
          type: 'limit',
          status: 'pending',
          limitPrice: limitPrice
        }
      };
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async cancelOrder(orderId) {
    try {
      await this._request('PUT', `/accounts/${this.accountId}/orders/${orderId}/cancel`);

      return {
        success: true,
        message: `Order ${orderId} cancelled`
      };
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async getPrice(symbol) {
    try {
      const instrument = this._formatSymbol(symbol);
      const response = await this._request('GET', `/accounts/${this.accountId}/pricing`, {
        instruments: instrument
      });

      const price = response.prices[0];

      return {
        symbol: instrument,
        price: ((parseFloat(price.bids[0].price) + parseFloat(price.asks[0].price)) / 2).toFixed(5),
        bid: parseFloat(price.bids[0].price).toFixed(5),
        ask: parseFloat(price.asks[0].price).toFixed(5),
        timestamp: price.time
      };
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async getHistoricalData(symbol, interval = '1h', limit = 100) {
    try {
      const instrument = this._formatSymbol(symbol);
      const granularity = this._convertInterval(interval);

      const response = await this._request('GET', `/instruments/${instrument}/candles`, {
        granularity: granularity,
        count: limit
      });

      const candles = response.candles || [];

      return candles.map(candle => ({
        timestamp: new Date(candle.time).getTime(),
        time: candle.time,
        open: parseFloat(candle.mid.o).toFixed(5),
        high: parseFloat(candle.mid.h).toFixed(5),
        low: parseFloat(candle.mid.l).toFixed(5),
        close: parseFloat(candle.mid.c).toFixed(5),
        volume: candle.volume
      }));
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async _request(method, endpoint, data = null, params = null) {
    const config = {
      method: method,
      url: this.baseUrl + endpoint,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    };

    if (params) {
      config.params = params;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  }

  _formatSymbol(symbol) {
    // Convert symbols to OANDA format (EUR/USD -> EUR_USD)
    symbol = symbol.toUpperCase().replace('/', '_').replace('-', '_');

    // Common forex pairs
    if (!symbol.includes('_')) {
      // Assume it's like EURUSD
      if (symbol.length === 6) {
        symbol = symbol.slice(0, 3) + '_' + symbol.slice(3);
      }
    }

    return symbol;
  }

  _convertInterval(interval) {
    const map = {
      '1m': 'M1',
      '5m': 'M5',
      '15m': 'M15',
      '1h': 'H1',
      '4h': 'H4',
      '1d': 'D'
    };
    return map[interval] || 'H1';
  }

  _handleError(error) {
    if (error.response) {
      const msg = error.response.data?.errorMessage || error.response.statusText;
      return new Error(`OANDA API Error: ${msg}`);
    }
    return new Error(`OANDA Error: ${error.message}`);
  }
}

module.exports = OandaService;