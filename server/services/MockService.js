const BaseService = require('./BaseService');

/**
 * Mock Trading Service
 * Simulates trading for testing without real money
 */
class MockService extends BaseService {
  constructor(config) {
    super('Mock', config);

    // Simulated account data
    this.account = {
      balance: 100000,
      equity: 100000,
      buyingPower: 100000
    };

    this.positions = [];
    this.orders = [];
    this.orderIdCounter = 1;

    // Mock price data
    this.prices = {
      'AAPL': 178.50,
      'GOOGL': 142.30,
      'MSFT': 380.20,
      'TSLA': 248.90,
      'BTC-USD': 52000.00,
      'ETH-USD': 3200.00,
      'EUR/USD': 1.0850,
      'GBP/USD': 1.2650
    };
  }

  async getAccount() {
    return {
      service: this.name,
      balance: this.account.balance.toFixed(2),
      equity: this.account.equity.toFixed(2),
      buyingPower: this.account.buyingPower.toFixed(2),
      currency: 'USD'
    };
  }

  async getPositions() {
    return this.positions.map(pos => ({
      symbol: pos.symbol,
      quantity: pos.quantity,
      side: pos.side,
      entryPrice: pos.entryPrice,
      currentPrice: this.prices[pos.symbol] || pos.entryPrice,
      unrealizedPL: this._calculatePL(pos),
      marketValue: (this.prices[pos.symbol] || pos.entryPrice) * pos.quantity
    }));
  }

  async getOrders() {
    return this.orders.map(order => ({
      id: order.id,
      symbol: order.symbol,
      quantity: order.quantity,
      side: order.side,
      type: order.type,
      status: order.status,
      limitPrice: order.limitPrice,
      filledPrice: order.filledPrice,
      createdAt: order.createdAt
    }));
  }

  async placeMarketOrder(symbol, quantity, side) {
    const price = this.prices[symbol] || 100;
    const order = {
      id: `MOCK${this.orderIdCounter++}`,
      symbol,
      quantity: parseFloat(quantity),
      side,
      type: 'market',
      status: 'filled',
      limitPrice: null,
      filledPrice: price,
      createdAt: new Date().toISOString()
    };

    this.orders.unshift(order);
    this._updateAccount(order);
    this._updatePositions(order);

    return {
      success: true,
      order: order
    };
  }

  async placeLimitOrder(symbol, quantity, side, limitPrice) {
    const order = {
      id: `MOCK${this.orderIdCounter++}`,
      symbol,
      quantity: parseFloat(quantity),
      side,
      type: 'limit',
      status: 'pending',
      limitPrice: parseFloat(limitPrice),
      filledPrice: null,
      createdAt: new Date().toISOString()
    };

    this.orders.unshift(order);

    return {
      success: true,
      order: order
    };
  }

  async cancelOrder(orderId) {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'pending') {
      throw new Error('Can only cancel pending orders');
    }

    order.status = 'cancelled';

    return {
      success: true,
      message: `Order ${orderId} cancelled`
    };
  }

  async getPrice(symbol) {
    const price = this.prices[symbol] || 100;
    // Simulate small price fluctuation
    const fluctuation = (Math.random() - 0.5) * 2;
    const currentPrice = price + fluctuation;

    return {
      symbol,
      price: currentPrice.toFixed(2),
      bid: (currentPrice - 0.05).toFixed(2),
      ask: (currentPrice + 0.05).toFixed(2),
      timestamp: new Date().toISOString()
    };
  }

  async getHistoricalData(symbol, interval = '1h', limit = 100) {
    const basePrice = this.prices[symbol] || 100;
    const data = [];
    const now = Date.now();
    const intervalMs = this._intervalToMs(interval);

    for (let i = limit - 1; i >= 0; i--) {
      const timestamp = now - (i * intervalMs);
      const volatility = basePrice * 0.02;
      const open = basePrice + (Math.random() - 0.5) * volatility;
      const close = open + (Math.random() - 0.5) * volatility;
      const high = Math.max(open, close) + Math.random() * volatility * 0.5;
      const low = Math.min(open, close) - Math.random() * volatility * 0.5;
      const volume = Math.floor(Math.random() * 1000000);

      data.push({
        timestamp,
        time: new Date(timestamp).toISOString(),
        open: open.toFixed(2),
        high: high.toFixed(2),
        low: low.toFixed(2),
        close: close.toFixed(2),
        volume
      });
    }

    return data;
  }

  _calculatePL(position) {
    const currentPrice = this.prices[position.symbol] || position.entryPrice;
    const multiplier = position.side === 'buy' ? 1 : -1;
    return ((currentPrice - position.entryPrice) * position.quantity * multiplier).toFixed(2);
  }

  _updateAccount(order) {
    const cost = order.filledPrice * order.quantity;
    if (order.side === 'buy') {
      this.account.balance -= cost;
      this.account.buyingPower -= cost;
    } else {
      this.account.balance += cost;
      this.account.buyingPower += cost;
    }
    this._recalculateEquity();
  }

  _updatePositions(order) {
    const existingPos = this.positions.find(p => p.symbol === order.symbol);

    if (!existingPos) {
      if (order.side === 'buy') {
        this.positions.push({
          symbol: order.symbol,
          quantity: order.quantity,
          side: order.side,
          entryPrice: order.filledPrice
        });
      }
    } else {
      if (existingPos.side === order.side) {
        // Add to position
        const totalCost = (existingPos.entryPrice * existingPos.quantity) + (order.filledPrice * order.quantity);
        existingPos.quantity += order.quantity;
        existingPos.entryPrice = totalCost / existingPos.quantity;
      } else {
        // Reduce or close position
        existingPos.quantity -= order.quantity;
        if (existingPos.quantity <= 0) {
          this.positions = this.positions.filter(p => p.symbol !== order.symbol);
        }
      }
    }
  }

  _recalculateEquity() {
    let positionsValue = 0;
    for (const pos of this.positions) {
      const currentPrice = this.prices[pos.symbol] || pos.entryPrice;
      positionsValue += currentPrice * pos.quantity;
    }
    this.account.equity = this.account.balance + positionsValue;
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
}

module.exports = MockService;