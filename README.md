# Multi-Platform Trading App

A comprehensive web-based trading application that supports multiple trading platforms including stocks, cryptocurrencies, and forex. Built with a clean, modern dashboard interface featuring real-time price charts and complete order management.

## Features

### Trading Capabilities
- **Market Orders** - Buy/sell at current market price
- **Limit Orders** - Buy/sell at specified price
- **Account Management** - View balance, equity, and buying power
- **Position Tracking** - Monitor open positions with P/L
- **Order History** - Complete order history with status tracking
- **Order Cancellation** - Cancel pending orders
- **Real-time Pricing** - Get current bid/ask prices
- **Price Charts** - Interactive charts with historical data

### Supported Trading Platforms

The app comes with **5 trading services** out of the box:

1. **Mock Service** - Simulated trading (no API keys needed)
   - Perfect for testing
   - No real money involved
   - Works immediately

2. **Alpaca** - US Stock Trading
   - Commission-free stock trading
   - Paper trading mode available
   - Real-time market data

3. **Coinbase** - Cryptocurrency Trading
   - Major cryptocurrencies (BTC, ETH, etc.)
   - Advanced trading features
   - Secure API integration

4. **Binance** - Global Crypto Exchange
   - Extensive crypto pairs
   - Testnet mode available
   - High liquidity

5. **OANDA** - Forex & CFD Trading
   - Major forex pairs
   - Practice account mode
   - Professional forex trading

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)

### Setup Steps

1. **Navigate to the project directory**
   ```bash
   cd /home/mike/Development/trading-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API keys (Optional - Skip if using Mock service)**
   ```bash
   cd config
   cp api-keys.example.json api-keys.json
   ```

   Edit `api-keys.json` and add your API credentials for the services you want to use.

4. **Start the server**
   ```bash
   npm start
   ```

5. **Open the application**

   Navigate to `http://localhost:3000` in your web browser

## Configuration

### API Keys Setup

Each trading service requires API credentials. Here's how to get them:

#### Alpaca (Stocks)
1. Sign up at [https://alpaca.markets/](https://alpaca.markets/)
2. Navigate to "Paper Trading" section
3. Generate API Key and Secret
4. Add to config file:
   ```json
   "alpaca": {
     "apiKey": "YOUR_KEY_HERE",
     "apiSecret": "YOUR_SECRET_HERE",
     "usePaper": true
   }
   ```

#### Coinbase (Crypto)
1. Sign up at [https://www.coinbase.com/](https://www.coinbase.com/)
2. Go to Settings > API
3. Create new API key with "trade" permissions
4. Add to config file:
   ```json
   "coinbase": {
     "apiKey": "YOUR_KEY_HERE",
     "apiSecret": "YOUR_SECRET_HERE"
   }
   ```

#### Binance (Crypto)
1. Sign up at [https://www.binance.com/](https://www.binance.com/)
2. Go to API Management in account settings
3. Create new API key
4. For testing, use testnet: [https://testnet.binance.vision/](https://testnet.binance.vision/)
5. Add to config file:
   ```json
   "binance": {
     "apiKey": "YOUR_KEY_HERE",
     "apiSecret": "YOUR_SECRET_HERE",
     "testnet": true
   }
   ```

#### OANDA (Forex)
1. Sign up at [https://www.oanda.com/](https://www.oanda.com/)
2. Create practice account
3. Generate API token
4. Find your account ID
5. Add to config file:
   ```json
   "oanda": {
     "apiKey": "YOUR_TOKEN_HERE",
     "accountId": "XXX-XXX-XXXXXXXX-XXX",
     "useLive": false
   }
   ```

### Browser Configuration

The app stores API configurations in your browser's localStorage. When you switch to a service for the first time, you'll be prompted to enter your API credentials. These are stored locally and persist across sessions.

## Usage

### Quick Start with Mock Service

1. Start the application
2. Select "Mock Trading (Demo)" from the service dropdown
3. Start trading immediately - no configuration needed!

The Mock service comes pre-loaded with:
- $100,000 virtual balance
- Popular stocks: AAPL, GOOGL, MSFT, TSLA
- Crypto: BTC-USD, ETH-USD
- Forex: EUR/USD, GBP/USD

### Placing Orders

1. **Select Trading Service** - Choose from the dropdown
2. **Enter Symbol** - e.g., AAPL, BTC-USD, EUR/USD
3. **Enter Quantity** - Amount to buy/sell
4. **Choose Order Type** - Market or Limit
5. **Click Buy or Sell** - Order is executed

### Viewing Charts

1. Enter symbol in chart section
2. Select time interval (1m, 5m, 1h, etc.)
3. Click "Load Chart"
4. View interactive price history

### Managing Positions & Orders

- **Positions Table** - Shows all open positions with P/L
- **Order History** - Complete order history
- **Cancel Orders** - Click cancel button for pending orders
- **Refresh Data** - Click refresh button to update all data

## Architecture

### Project Structure

```
trading-app/
├── config/
│   └── api-keys.example.json    # API configuration template
├── server/
│   ├── server.js                # Express server
│   ├── services/
│   │   ├── BaseService.js       # Abstract base class
│   │   ├── MockService.js       # Mock trading service
│   │   ├── AlpacaService.js     # Alpaca integration
│   │   ├── CoinbaseService.js   # Coinbase integration
│   │   ├── BinanceService.js    # Binance integration
│   │   └── OandaService.js      # OANDA integration
│   └── routes/
│       └── trading.js           # API endpoints
├── public/
│   ├── index.html               # Dashboard UI
│   ├── styles.css               # Styling
│   ├── app.js                   # Frontend logic
│   └── charts.js                # Chart.js integration
├── package.json
└── README.md
```

### Technology Stack

- **Backend**: Node.js + Express
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Charts**: Chart.js
- **HTTP Client**: Axios
- **Architecture**: Service-oriented with plugin pattern

### API Endpoints

All endpoints accept POST requests with JSON body containing:
- `service` - Service name (mock, alpaca, coinbase, binance, oanda)
- `config` - Service configuration (API keys)
- Additional parameters as needed

Available endpoints:
- `GET /api/services` - List available services
- `POST /api/account` - Get account information
- `POST /api/positions` - Get current positions
- `POST /api/orders` - Get order history
- `POST /api/order/market` - Place market order
- `POST /api/order/limit` - Place limit order
- `POST /api/order/cancel` - Cancel order
- `POST /api/price` - Get current price
- `POST /api/historical` - Get historical data

## Adding New Trading Services

The app is designed to be easily extensible. To add a new trading service:

1. **Create new service class** in `server/services/`
   ```javascript
   const BaseService = require('./BaseService');

   class NewService extends BaseService {
     constructor(config) {
       super('ServiceName', config);
     }

     async getAccount() { /* implementation */ }
     async getPositions() { /* implementation */ }
     // ... implement all required methods
   }

   module.exports = NewService;
   ```

2. **Register in routing** (`server/routes/trading.js`)
   ```javascript
   const NewService = require('../services/NewService');

   // Add to getService() function
   case 'newservice':
     services[key] = new NewService(config);
     break;
   ```

3. **Add to service list** in `GET /api/services` endpoint

4. **Update frontend** dropdown in `public/index.html`

All services must implement the methods defined in `BaseService.js`.

## Security Considerations

- **API Keys**: Never commit api-keys.json to version control
- **Testing**: Always use paper/test accounts first
- **Permissions**: Only grant necessary API permissions
- **Key Rotation**: Regularly rotate API keys
- **HTTPS**: Use HTTPS in production
- **Validation**: All inputs are validated server-side

## Development

### Running in Development Mode

```bash
npm run dev
```

Server runs on `http://localhost:3000` by default.

### Environment Variables

You can customize the port:
```bash
PORT=8080 npm start
```

### Debugging

Server logs are printed to console:
- API requests
- Errors
- Service initialization

## Troubleshooting

### "Cannot connect to service" errors
- Check API credentials in config
- Verify API keys have correct permissions
- Check if using paper/test mode settings

### Charts not loading
- Verify symbol is correct for the selected service
- Check if service supports historical data
- Try different time intervals

### Orders not executing
- Ensure sufficient buying power
- Check market hours for stock trading
- Verify symbol format (e.g., BTC-USD vs BTCUSD)

### Mock service limitations
- Simulated data only
- Price fluctuations are random
- No real market conditions

## License

MIT License - Feel free to use and modify for your needs.

## Disclaimer

This software is for educational purposes. Trading involves risk. Always:
- Start with paper/demo accounts
- Never trade with money you can't afford to lose
- Understand the risks before trading
- This software comes with no warranties

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review API documentation for your trading service
3. Verify API credentials and permissions

## Future Enhancements

Potential features to add:
- WebSocket support for real-time updates
- Advanced charting (candlesticks, indicators)
- Portfolio analytics
- Trade notifications
- Mobile responsive improvements
- Multi-account support
- Trade history export
- Stop-loss / take-profit orders