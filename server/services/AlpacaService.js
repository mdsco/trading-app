const BaseService = require('./BaseService');
const axios = require('axios');

/**
 * Alpaca Trading Service
 * US Stock trading platform with commission-free trades
 * API Docs: https://alpaca.markets/docs/
 */
class AlpacaService extends BaseService {
  constructor(config) {
    super('Alpaca', config);

    // Use paper trading by default for safety
    this.baseUrl = config.usePaper !== false
      ? 'https://paper-api.alpaca.markets'
      : 'https://api.alpaca.markets';

    this.dataUrl = 'https://data.alpaca.markets';

    this.headers = {
      'APCA-API-KEY-ID': config.apiKey,
      'APCA-API-SECRET-KEY': config.apiSecret
    };
  }

  async getAccount() {
    try {
      const response = await axios.get(`${this.baseUrl}/v2/account`, { headers: this.headers });
      const data = response.data;

      return {
        service: this.name,
        balance: parseFloat(data.cash).toFixed(2),
        equity: parseFloat(data.equity).toFixed(2),
        buyingPower: parseFloat(data.buying_power).toFixed(2),
        currency: data.currency
      };
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async getPositions() {
    try {
      const response = await axios.get(`${this.baseUrl}/v2/positions`, { headers: this.headers });

      return response.data.map(pos => ({
        symbol: pos.symbol,
        quantity: parseFloat(pos.qty),
        side: parseFloat(pos.qty) > 0 ? 'long' : 'short',
        entryPrice: parseFloat(pos.avg_entry_price),
        currentPrice: parseFloat(pos.current_price),
        unrealizedPL: parseFloat(pos.unrealized_pl),
        marketValue: parseFloat(pos.market_value)
      }));
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async getOrders() {
    try {
      const response = await axios.get(`${this.baseUrl}/v2/orders`, {
        headers: this.headers,
        params: { status: 'all', limit: 50 }
      });

      return response.data.map(order => ({
        id: order.id,
        symbol: order.symbol,
        quantity: parseFloat(order.qty),
        side: order.side,
        type: order.type,
        status: order.status,
        limitPrice: order.limit_price ? parseFloat(order.limit_price) : null,
        filledPrice: order.filled_avg_price ? parseFloat(order.filled_avg_price) : null,
        createdAt: order.created_at
      }));
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async placeMarketOrder(symbol, quantity, side) {
    try {
      const response = await axios.post(`${this.baseUrl}/v2/orders`, {
        symbol: symbol.toUpperCase(),
        qty: quantity,
        side: side,
        type: 'market',
        time_in_force: 'day'
      }, { headers: this.headers });

      return {
        success: true,
        order: {
          id: response.data.id,
          symbol: response.data.symbol,
          quantity: parseFloat(response.data.qty),
          side: response.data.side,
          type: response.data.type,
          status: response.data.status
        }
      };
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async placeLimitOrder(symbol, quantity, side, limitPrice) {
    try {
      const response = await axios.post(`${this.baseUrl}/v2/orders`, {
        symbol: symbol.toUpperCase(),
        qty: quantity,
        side: side,
        type: 'limit',
        limit_price: limitPrice,
        time_in_force: 'gtc'
      }, { headers: this.headers });

      return {
        success: true,
        order: {
          id: response.data.id,
          symbol: response.data.symbol,
          quantity: parseFloat(response.data.qty),
          side: response.data.side,
          type: response.data.type,
          status: response.data.status,
          limitPrice: parseFloat(response.data.limit_price)
        }
      };
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async cancelOrder(orderId) {
    try {
      await axios.delete(`${this.baseUrl}/v2/orders/${orderId}`, { headers: this.headers });

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
      const response = await axios.get(`${this.dataUrl}/v2/stocks/${symbol.toUpperCase()}/quotes/latest`, {
        headers: this.headers
      });

      const quote = response.data.quote;

      return {
        symbol: symbol.toUpperCase(),
        price: ((quote.ap + quote.bp) / 2).toFixed(2),
        bid: quote.bp.toFixed(2),
        ask: quote.ap.toFixed(2),
        timestamp: quote.t
      };
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async getHistoricalData(symbol, interval = '1h', limit = 100) {
    try {
      const timeframe = this._convertInterval(interval);
      const end = new Date();
      const start = new Date(end - limit * this._intervalToMs(interval));

      const response = await axios.get(`${this.dataUrl}/v2/stocks/${symbol.toUpperCase()}/bars`, {
        headers: this.headers,
        params: {
          timeframe: timeframe,
          start: start.toISOString(),
          end: end.toISOString(),
          limit: limit
        }
      });

      return response.data.bars.map(bar => ({
        timestamp: new Date(bar.t).getTime(),
        time: bar.t,
        open: parseFloat(bar.o).toFixed(2),
        high: parseFloat(bar.h).toFixed(2),
        low: parseFloat(bar.l).toFixed(2),
        close: parseFloat(bar.c).toFixed(2),
        volume: bar.v
      }));
    } catch (error) {
      throw this._handleError(error);
    }
  }

  _convertInterval(interval) {
    const map = {
      '1m': '1Min',
      '5m': '5Min',
      '15m': '15Min',
      '1h': '1Hour',
      '1d': '1Day'
    };
    return map[interval] || '1Hour';
  }

  _intervalToMs(interval) {
    const unit = interval.slice(-1);
    const value = parseInt(interval.slice(0, -1));

    const ms = {
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000
    };

    return (ms[unit] || ms['h']) * value;
  }

  _handleError(error) {
    if (error.response) {
      return new Error(`Alpaca API Error: ${error.response.data.message || error.response.statusText}`);
    }
    return new Error(`Alpaca Error: ${error.message}`);
  }
}

module.exports = AlpacaService;