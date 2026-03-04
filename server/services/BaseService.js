/**
 * Base Trading Service Interface
 * All trading service implementations must extend this class
 */
class BaseService {
  constructor(name, config) {
    this.name = name;
    this.config = config;
  }

  /**
   * Get account information (balance, buying power, etc.)
   * @returns {Promise<Object>} Account details
   */
  async getAccount() {
    throw new Error('getAccount() must be implemented');
  }

  /**
   * Get current positions
   * @returns {Promise<Array>} List of positions
   */
  async getPositions() {
    throw new Error('getPositions() must be implemented');
  }

  /**
   * Get order history
   * @returns {Promise<Array>} List of orders
   */
  async getOrders() {
    throw new Error('getOrders() must be implemented');
  }

  /**
   * Place a market order
   * @param {string} symbol - Trading symbol
   * @param {number} quantity - Amount to trade
   * @param {string} side - 'buy' or 'sell'
   * @returns {Promise<Object>} Order result
   */
  async placeMarketOrder(symbol, quantity, side) {
    throw new Error('placeMarketOrder() must be implemented');
  }

  /**
   * Place a limit order
   * @param {string} symbol - Trading symbol
   * @param {number} quantity - Amount to trade
   * @param {string} side - 'buy' or 'sell'
   * @param {number} limitPrice - Limit price
   * @returns {Promise<Object>} Order result
   */
  async placeLimitOrder(symbol, quantity, side, limitPrice) {
    throw new Error('placeLimitOrder() must be implemented');
  }

  /**
   * Cancel an order
   * @param {string} orderId - Order ID to cancel
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelOrder(orderId) {
    throw new Error('cancelOrder() must be implemented');
  }

  /**
   * Get current price for a symbol
   * @param {string} symbol - Trading symbol
   * @returns {Promise<Object>} Price data
   */
  async getPrice(symbol) {
    throw new Error('getPrice() must be implemented');
  }

  /**
   * Get historical price data for charting
   * @param {string} symbol - Trading symbol
   * @param {string} interval - Time interval (1m, 5m, 1h, 1d, etc.)
   * @param {number} limit - Number of data points
   * @returns {Promise<Array>} Historical price data
   */
  async getHistoricalData(symbol, interval = '1h', limit = 100) {
    throw new Error('getHistoricalData() must be implemented');
  }
}

module.exports = BaseService;