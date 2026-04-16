# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install      # Install dependencies
npm start        # Start server at http://localhost:3000
npm run dev      # Same as start
```

No build step, test runner, or linter is configured. The server runs directly with Node.js.

## Architecture

**Stack**: Node.js + Express backend, vanilla JS/HTML/CSS frontend (no framework, no bundler).

**Plugin pattern for trading services**: All trading providers extend `server/services/BaseService.js`, which defines the interface every service must implement (9 methods: `getAccount`, `getPositions`, `getOrders`, `placeMarketOrder`, `placeLimitOrder`, `cancelOrder`, `getPrice`, `getHistoricalData`). Adding a new broker means creating a new file in `server/services/` that extends `BaseService`.

**Request flow**: Frontend (`public/app.js`) → POST `/api/*` with `{service, config, ...params}` → `server/routes/trading.js` instantiates the matching service class → service calls external broker API via axios → response returns to frontend.

**Services are stateless and credential-passing**: Credentials are stored in browser localStorage and sent with every request. `server/routes/trading.js` caches service instances by a hash of the config to avoid unnecessary recreation.

**Services**:
- `MockService.js` — in-memory simulation, no API keys needed; maintains positions/orders state within the process lifetime
- `AlpacaService.js` — US stocks via Alpaca API (paper trading by default)
- `CoinbaseService.js` — crypto via Coinbase Advanced Trade API; uses HMAC-SHA256 request signing via Node's `crypto` module
- `BinanceService.js` — crypto via Binance Spot API (testnet by default)
- `OandaService.js` — forex/CFDs via OANDA V20 API (paper trading by default)

**Frontend**: `public/app.js` handles all UI logic and API calls; `public/charts.js` wraps Chart.js (loaded from CDN); credentials are persisted per-service in `localStorage`.

## Configuration

Copy `config/api-keys.example.json` to `config/api-keys.json` (gitignored) for credential reference. The app does not load this file automatically — credentials are entered in the UI and passed in request bodies. Environment variable `PORT` overrides the default port 3000.
