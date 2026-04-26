const BaseService = require('./BaseService');
const axios = require('axios');
const crypto = require('crypto');

/**
 * Coinbase Advanced Trade Service
 * Cryptocurrency exchange platform
 * API Docs: https://docs.cloud.coinbase.com/advanced-trade-api/docs/
 */
class CoinbaseService extends BaseService {
  constructor(config) {
    super('Coinbase', config);

    this.baseUrl = 'https://api.coinbase.com/api/v3/brokerage';
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
  }

  async getAccount() {
    try {
      const response = await this._request('GET', '/accounts');
      const accounts = response.accounts || [];

      // Calculate total balance across all accounts
      let totalUSD = 0;
      for (const account of accounts) {
        const balance = parseFloat(account.available_balance.value || 0);
        if (account.available_balance.currency === 'USD') {
          totalUSD += balance;
        }
      }

      return {
        service: this.name,
        balance: totalUSD.toFixed(2),
        equity: totalUSD.toFixed(2),
        buyingPower: totalUSD.toFixed(2),
        currency: 'USD'
      };
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async getPositions() {
    try {
      const response = await this._request('GET', '/accounts');
      const accounts = response.accounts || [];

      const positions = [];
      for (const account of accounts) {
        const balance = parseFloat(account.available_balance.value || 0);
        if (balance > 0 && account.available_balance.currency !== 'USD') {
          positions.push({
            symbol: `${account.available_balance.currency}-USD`,
            quantity: balance,
            side: 'long',
            entryPrice: 0, // Coinbase doesn't provide cost basis easily
            currentPrice: 0, // Will need separate price lookup
            unrealizedPL: 0,
            marketValue: balance
          });
        }
      }

      return positions;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async getOrders() {
    try {
      const response = await this._request('GET', '/orders/historical/batch');
      const orders = response.orders || [];

      return orders.slice(0, 50).map(order => ({
        id: order.order_id,
        symbol: order.product_id,
        quantity: parseFloat(order.order_configuration?.market_market_ioc?.quote_size ||
                           order.order_configuration?.limit_limit_gtc?.base_size || 0),
        side: order.side,
        type: order.order_type,
        status: order.status,
        limitPrice: order.order_configuration?.limit_limit_gtc?.limit_price
                    ? parseFloat(order.order_configuration.limit_limit_gtc.limit_price)
                    : null,
        filledPrice: order.average_filled_price ? parseFloat(order.average_filled_price) : null,
        createdAt: order.created_time
      }));
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async placeMarketOrder(symbol, quantity, side) {
    try {
      const productId = this._formatSymbol(symbol);

      const orderConfig = {
        product_id: productId,
        side: side.toUpperCase(),
        order_configuration: {
          market_market_ioc: {
            quote_size: quantity.toString()
          }
        }
      };

      const response = await this._request('POST', '/orders', orderConfig);

      return {
        success: true,
        order: {
          id: response.order_id || response.success_response?.order_id,
          symbol: productId,
          quantity: parseFloat(quantity),
          side: side,
          type: 'market',
          status: 'pending'
        }
      };
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async placeLimitOrder(symbol, quantity, side, limitPrice) {
    try {
      const productId = this._formatSymbol(symbol);

      const orderConfig = {
        product_id: productId,
        side: side.toUpperCase(),
        order_configuration: {
          limit_limit_gtc: {
            base_size: quantity.toString(),
            limit_price: limitPrice.toString()
          }
        }
      };

      const response = await this._request('POST', '/orders', orderConfig);

      return {
        success: true,
        order: {
          id: response.order_id || response.success_response?.order_id,
          symbol: productId,
          quantity: parseFloat(quantity),
          side: side,
          type: 'limit',
          status: 'pending',
          limitPrice: parseFloat(limitPrice)
        }
      };
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async cancelOrder(orderId) {
    try {
      await this._request('POST', '/orders/batch_cancel', {
        order_ids: [orderId]
      });

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
      const productId = this._formatSymbol(symbol);
      const response = await this._request('GET', `/products/${productId}/ticker`);

      return {
        symbol: productId,
        price: parseFloat(response.price).toFixed(2),
        bid: parseFloat(response.best_bid || response.price).toFixed(2),
        ask: parseFloat(response.best_ask || response.price).toFixed(2),
        timestamp: response.time
      };
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async getHistoricalData(symbol, interval = '1h', limit = 100) {
    try {
      const productId = this._formatSymbol(symbol);
      const granularity = this._convertInterval(interval);
      const end = Math.floor(Date.now() / 1000);
      const start = end - (limit * this._intervalToSeconds(interval));

      const response = await this._request('GET', `/products/${productId}/candles`, null, {
        start: start.toString(),
        end: end.toString(),
        granularity: granularity
      });

      const candles = response.candles || [];

      return candles.reverse().map(candle => ({
        timestamp: parseInt(candle.start) * 1000,
        time: new Date(parseInt(candle.start) * 1000).toISOString(),
        open: parseFloat(candle.open).toFixed(2),
        high: parseFloat(candle.high).toFixed(2),
        low: parseFloat(candle.low).toFixed(2),
        close: parseFloat(candle.close).toFixed(2),
        volume: parseFloat(candle.volume)
      }));
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async _request(method, endpoint, data = null, params = null) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    const requestPath = '/api/v3/brokerage' + endpoint + queryString;
    const body = data ? JSON.stringify(data) : '';

    const message = timestamp + method + requestPath + body;
    const signature = crypto.createHmac('sha256', this.apiSecret).update(message).digest('hex');

    const headers = {
      'CB-ACCESS-KEY': this.apiKey,
      'CB-ACCESS-SIGN': signature,
      'CB-ACCESS-TIMESTAMP': timestamp,
      'Content-Type': 'application/json'
    };

    const config = {
      method: method,
      url: this.baseUrl + endpoint,
      headers: headers
    };

    if (params) config.params = params;
    if (data) config.data = data;

    const response = await axios(config);
    return response.data;
  }

  _formatSymbol(symbol) {
    // Convert symbols like BTC-USD or BTCUSD to BTC-USD
    if (symbol.includes('-')) return symbol.toUpperCase();
    if (symbol.endsWith('USD')) {
      return `${symbol.slice(0, -3)}-USD`;
    }
    return `${symbol}-USD`.toUpperCase();
  }

  _convertInterval(interval) {
    const map = {
      '1m': 'ONE_MINUTE',
      '5m': 'FIVE_MINUTE',
      '15m': 'FIFTEEN_MINUTE',
      '1h': 'ONE_HOUR',
      '6h': 'SIX_HOUR',
      '1d': 'ONE_DAY'
    };
    return map[interval] || 'ONE_HOUR';
  }

  _intervalToSeconds(interval) {
    const unit = interval.slice(-1);
    const value = parseInt(interval.slice(0, -1));

    const seconds = {
      'm': 60,
      'h': 3600,
      'd': 86400
    };

    return (seconds[unit] || seconds['h']) * value;
  }

  _handleError(error) {
    if (error.response) {
      const msg = error.response.data?.message || error.response.data?.error || error.response.statusText;
      return new Error(`Coinbase API Error: ${msg}`);
    }
    return new Error(`Coinbase Error: ${error.message}`);
  }
}

module.exports = CoinbaseService;