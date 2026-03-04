const BaseService = require('./BaseService');
const axios = require('axios');
const crypto = require('crypto');

/**
 * Binance Trading Service
 * Global cryptocurrency exchange
 * API Docs: https://binance-docs.github.io/apidocs/spot/en/
 */
class BinanceService extends BaseService {
  constructor(config) {
    super('Binance', config);

    this.baseUrl = config.testnet
      ? 'https://testnet.binance.vision/api'
      : 'https://api.binance.com/api';

    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
  }

  async getAccount() {
    try {
      const response = await this._request('GET', '/v3/account');

      const usdtBalance = response.balances.find(b => b.asset === 'USDT');
      const balance = parseFloat(usdtBalance?.free || 0);

      return {
        service: this.name,
        balance: balance.toFixed(2),
        equity: balance.toFixed(2),
        buyingPower: balance.toFixed(2),
        currency: 'USDT'
      };
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async getPositions() {
    try {
      const response = await this._request('GET', '/v3/account');
      const positions = [];

      for (const balance of response.balances) {
        const free = parseFloat(balance.free);
        const locked = parseFloat(balance.locked);
        const total = free + locked;

        if (total > 0 && balance.asset !== 'USDT') {
          positions.push({
            symbol: `${balance.asset}USDT`,
            quantity: total,
            side: 'long',
            entryPrice: 0,
            currentPrice: 0,
            unrealizedPL: 0,
            marketValue: total
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
      // Get open orders
      const openOrders = await this._request('GET', '/v3/openOrders');

      return openOrders.map(order => ({
        id: order.orderId.toString(),
        symbol: order.symbol,
        quantity: parseFloat(order.origQty),
        side: order.side.toLowerCase(),
        type: order.type.toLowerCase(),
        status: order.status.toLowerCase(),
        limitPrice: order.price ? parseFloat(order.price) : null,
        filledPrice: order.price ? parseFloat(order.price) : null,
        createdAt: new Date(order.time).toISOString()
      }));
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async placeMarketOrder(symbol, quantity, side) {
    try {
      const formattedSymbol = this._formatSymbol(symbol);

      const params = {
        symbol: formattedSymbol,
        side: side.toUpperCase(),
        type: 'MARKET',
        quantity: quantity
      };

      const response = await this._request('POST', '/v3/order', params);

      return {
        success: true,
        order: {
          id: response.orderId.toString(),
          symbol: response.symbol,
          quantity: parseFloat(response.origQty),
          side: side,
          type: 'market',
          status: response.status.toLowerCase()
        }
      };
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async placeLimitOrder(symbol, quantity, side, limitPrice) {
    try {
      const formattedSymbol = this._formatSymbol(symbol);

      const params = {
        symbol: formattedSymbol,
        side: side.toUpperCase(),
        type: 'LIMIT',
        timeInForce: 'GTC',
        quantity: quantity,
        price: limitPrice
      };

      const response = await this._request('POST', '/v3/order', params);

      return {
        success: true,
        order: {
          id: response.orderId.toString(),
          symbol: response.symbol,
          quantity: parseFloat(response.origQty),
          side: side,
          type: 'limit',
          status: response.status.toLowerCase(),
          limitPrice: parseFloat(response.price)
        }
      };
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async cancelOrder(orderId) {
    try {
      // We need the symbol to cancel - this is a limitation
      // In production, you'd want to store symbol with order ID
      throw new Error('Cancel order requires symbol - not implemented in this version');
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async getPrice(symbol) {
    try {
      const formattedSymbol = this._formatSymbol(symbol);
      const response = await this._request('GET', '/v3/ticker/bookTicker', { symbol: formattedSymbol }, false);

      return {
        symbol: formattedSymbol,
        price: ((parseFloat(response.bidPrice) + parseFloat(response.askPrice)) / 2).toFixed(2),
        bid: parseFloat(response.bidPrice).toFixed(2),
        ask: parseFloat(response.askPrice).toFixed(2),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async getHistoricalData(symbol, interval = '1h', limit = 100) {
    try {
      const formattedSymbol = this._formatSymbol(symbol);
      const binanceInterval = this._convertInterval(interval);

      const response = await this._request('GET', '/v3/klines', {
        symbol: formattedSymbol,
        interval: binanceInterval,
        limit: limit
      }, false);

      return response.map(candle => ({
        timestamp: candle[0],
        time: new Date(candle[0]).toISOString(),
        open: parseFloat(candle[1]).toFixed(2),
        high: parseFloat(candle[2]).toFixed(2),
        low: parseFloat(candle[3]).toFixed(2),
        close: parseFloat(candle[4]).toFixed(2),
        volume: parseFloat(candle[5])
      }));
    } catch (error) {
      throw this._handleError(error);
    }
  }

  async _request(method, endpoint, params = {}, signed = true) {
    if (signed) {
      params.timestamp = Date.now();
      params.recvWindow = 5000;

      const queryString = new URLSearchParams(params).toString();
      const signature = crypto
        .createHmac('sha256', this.apiSecret)
        .update(queryString)
        .digest('hex');

      params.signature = signature;
    }

    const config = {
      method: method,
      url: this.baseUrl + endpoint,
      headers: {
        'X-MBX-APIKEY': this.apiKey
      }
    };

    if (method === 'GET') {
      config.params = params;
    } else {
      config.data = params;
    }

    const response = await axios(config);
    return response.data;
  }

  _formatSymbol(symbol) {
    // Remove dash if present and ensure USDT pairing
    symbol = symbol.replace('-', '').toUpperCase();
    if (!symbol.endsWith('USDT')) {
      if (symbol.endsWith('USD')) {
        symbol = symbol.replace('USD', 'USDT');
      } else {
        symbol = symbol + 'USDT';
      }
    }
    return symbol;
  }

  _convertInterval(interval) {
    const map = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '1h': '1h',
      '4h': '4h',
      '1d': '1d'
    };
    return map[interval] || '1h';
  }

  _handleError(error) {
    if (error.response) {
      const msg = error.response.data?.msg || error.response.statusText;
      return new Error(`Binance API Error: ${msg}`);
    }
    return new Error(`Binance Error: ${error.message}`);
  }
}

module.exports = BinanceService;