const express = require('express');
const router = express.Router();

// Service factory
const MockService = require('../services/MockService');
const AlpacaService = require('../services/AlpacaService');
const CoinbaseService = require('../services/CoinbaseService');
const BinanceService = require('../services/BinanceService');
const OandaService = require('../services/OandaService');

// Store active service instances
const services = {};

/**
 * Initialize a trading service
 */
function getService(serviceName, config) {
  const key = `${serviceName}_${JSON.stringify(config)}`;

  if (!services[key]) {
    switch (serviceName.toLowerCase()) {
      case 'mock':
        services[key] = new MockService(config);
        break;
      case 'alpaca':
        services[key] = new AlpacaService(config);
        break;
      case 'coinbase':
        services[key] = new CoinbaseService(config);
        break;
      case 'binance':
        services[key] = new BinanceService(config);
        break;
      case 'oanda':
        services[key] = new OandaService(config);
        break;
      default:
        throw new Error(`Unknown service: ${serviceName}`);
    }
  }

  return services[key];
}

/**
 * GET /api/services
 * Get list of available trading services
 */
router.get('/services', (req, res) => {
  res.json({
    services: [
      {
        name: 'Mock',
        id: 'mock',
        description: 'Simulated trading (no real money)',
        assetTypes: ['stocks', 'crypto', 'forex']
      },
      {
        name: 'Alpaca',
        id: 'alpaca',
        description: 'US Stock trading',
        assetTypes: ['stocks']
      },
      {
        name: 'Coinbase',
        id: 'coinbase',
        description: 'Cryptocurrency trading',
        assetTypes: ['crypto']
      },
      {
        name: 'Binance',
        id: 'binance',
        description: 'Cryptocurrency trading',
        assetTypes: ['crypto']
      },
      {
        name: 'OANDA',
        id: 'oanda',
        description: 'Forex & CFD trading',
        assetTypes: ['forex']
      }
    ]
  });
});

/**
 * POST /api/account
 * Get account information
 */
router.post('/account', async (req, res) => {
  try {
    const { service, config } = req.body;
    const tradingService = getService(service, config);
    const account = await tradingService.getAccount();
    res.json(account);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/positions
 * Get current positions
 */
router.post('/positions', async (req, res) => {
  try {
    const { service, config } = req.body;
    const tradingService = getService(service, config);
    const positions = await tradingService.getPositions();
    res.json({ positions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/orders
 * Get order history
 */
router.post('/orders', async (req, res) => {
  try {
    const { service, config } = req.body;
    const tradingService = getService(service, config);
    const orders = await tradingService.getOrders();
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/order/market
 * Place a market order
 */
router.post('/order/market', async (req, res) => {
  try {
    const { service, config, symbol, quantity, side } = req.body;
    const tradingService = getService(service, config);
    const result = await tradingService.placeMarketOrder(symbol, quantity, side);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/order/limit
 * Place a limit order
 */
router.post('/order/limit', async (req, res) => {
  try {
    const { service, config, symbol, quantity, side, limitPrice } = req.body;
    const tradingService = getService(service, config);
    const result = await tradingService.placeLimitOrder(symbol, quantity, side, limitPrice);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/order/cancel
 * Cancel an order
 */
router.post('/order/cancel', async (req, res) => {
  try {
    const { service, config, orderId } = req.body;
    const tradingService = getService(service, config);
    const result = await tradingService.cancelOrder(orderId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/price
 * Get current price for a symbol
 */
router.post('/price', async (req, res) => {
  try {
    const { service, config, symbol } = req.body;
    const tradingService = getService(service, config);
    const price = await tradingService.getPrice(symbol);
    res.json(price);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/historical
 * Get historical price data
 */
router.post('/historical', async (req, res) => {
  try {
    const { service, config, symbol, interval, limit } = req.body;
    const tradingService = getService(service, config);
    const data = await tradingService.getHistoricalData(symbol, interval, limit);
    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;