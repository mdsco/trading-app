// Global state
let currentService = 'mock';
let serviceConfig = {};

// DOM Elements
const serviceSelect = document.getElementById('service-select');
const refreshBtn = document.getElementById('refresh-btn');
const orderForm = document.getElementById('order-form');
const orderTypeSelect = document.getElementById('order-type');
const limitPriceGroup = document.getElementById('limit-price-group');
const symbolInput = document.getElementById('symbol');
const currentPriceDiv = document.getElementById('current-price');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadServiceConfig();
  setupEventListeners();
  refreshAllData();
});

// Setup Event Listeners
function setupEventListeners() {
  serviceSelect.addEventListener('change', handleServiceChange);
  refreshBtn.addEventListener('click', refreshAllData);
  orderTypeSelect.addEventListener('change', handleOrderTypeChange);
  symbolInput.addEventListener('blur', fetchCurrentPrice);

  // Handle order submission
  document.querySelectorAll('.btn-buy, .btn-sell').forEach(btn => {
    btn.addEventListener('click', handleOrderSubmit);
  });
}

// Service Configuration
function loadServiceConfig() {
  currentService = serviceSelect.value;

  // Load config from localStorage or use empty config for mock
  const savedConfig = localStorage.getItem(`config_${currentService}`);

  if (currentService === 'mock') {
    serviceConfig = {};
  } else if (savedConfig) {
    serviceConfig = JSON.parse(savedConfig);
  } else {
    // Prompt for API keys if not configured
    promptForConfig();
  }
}

function promptForConfig() {
  const configs = {
    alpaca: {
      apiKey: 'Enter Alpaca API Key',
      apiSecret: 'Enter Alpaca API Secret',
      usePaper: true
    },
    coinbase: {
      apiKey: 'Enter Coinbase API Key',
      apiSecret: 'Enter Coinbase API Secret'
    },
    binance: {
      apiKey: 'Enter Binance API Key',
      apiSecret: 'Enter Binance API Secret',
      testnet: true
    },
    oanda: {
      apiKey: 'Enter OANDA API Key',
      accountId: 'Enter OANDA Account ID',
      useLive: false
    }
  };

  const requiredConfig = configs[currentService];
  if (!requiredConfig) return;

  const configValues = {};
  for (const [key, prompt] of Object.entries(requiredConfig)) {
    if (typeof prompt === 'boolean') {
      configValues[key] = prompt;
    } else {
      const value = window.prompt(prompt);
      if (!value) {
        showStatus('Configuration cancelled. Using Mock service.', 'info');
        serviceSelect.value = 'mock';
        currentService = 'mock';
        serviceConfig = {};
        return;
      }
      configValues[key] = value;
    }
  }

  serviceConfig = configValues;
  localStorage.setItem(`config_${currentService}`, JSON.stringify(serviceConfig));
  showStatus(`${currentService} configured successfully!`, 'success');
}

function handleServiceChange() {
  loadServiceConfig();
  refreshAllData();
}

function handleOrderTypeChange() {
  limitPriceGroup.style.display = orderTypeSelect.value === 'limit' ? 'block' : 'none';
}

// API Calls
async function apiCall(endpoint, data = {}) {
  try {
    const response = await fetch(`/api${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service: currentService,
        config: serviceConfig,
        ...data
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'API request failed');
    }

    return result;
  } catch (error) {
    throw error;
  }
}

// Refresh All Data
async function refreshAllData() {
  showStatus('Refreshing data...', 'info');

  try {
    await Promise.all([
      fetchAccountData(),
      fetchPositions(),
      fetchOrders()
    ]);
    showStatus('Data refreshed successfully', 'success');
  } catch (error) {
    showStatus(`Error refreshing data: ${error.message}`, 'error');
  }
}

// Fetch Account Data
async function fetchAccountData() {
  try {
    const account = await apiCall('/account');

    document.getElementById('account-balance').textContent = `$${account.balance}`;
    document.getElementById('account-equity').textContent = `$${account.equity}`;
    document.getElementById('account-buying-power').textContent = `$${account.buyingPower}`;
    document.getElementById('account-service').textContent = account.service;
  } catch (error) {
    showStatus(`Error fetching account: ${error.message}`, 'error');
  }
}

// Fetch Positions
async function fetchPositions() {
  try {
    const result = await apiCall('/positions');
    const tbody = document.getElementById('positions-body');

    if (!result.positions || result.positions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-message">No positions</td></tr>';
      return;
    }

    tbody.innerHTML = result.positions.map(pos => `
      <tr>
        <td>${pos.symbol}</td>
        <td>${pos.quantity}</td>
        <td>${pos.side}</td>
        <td>$${pos.entryPrice}</td>
        <td>$${pos.currentPrice}</td>
        <td class="${parseFloat(pos.unrealizedPL) >= 0 ? 'profit' : 'loss'}">
          $${pos.unrealizedPL}
        </td>
      </tr>
    `).join('');
  } catch (error) {
    showStatus(`Error fetching positions: ${error.message}`, 'error');
  }
}

// Fetch Orders
async function fetchOrders() {
  try {
    const result = await apiCall('/orders');
    const tbody = document.getElementById('orders-body');

    if (!result.orders || result.orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-message">No orders</td></tr>';
      return;
    }

    tbody.innerHTML = result.orders.map(order => `
      <tr>
        <td>${order.id.substring(0, 8)}...</td>
        <td>${order.symbol}</td>
        <td>${order.quantity}</td>
        <td>${order.side}</td>
        <td>${order.type}</td>
        <td class="status-${order.status}">${order.status}</td>
        <td>$${order.filledPrice || order.limitPrice || '-'}</td>
        <td>
          ${order.status === 'pending' ?
            `<button class="btn btn-cancel" onclick="cancelOrder('${order.id}')">Cancel</button>` :
            '-'}
        </td>
      </tr>
    `).join('');
  } catch (error) {
    showStatus(`Error fetching orders: ${error.message}`, 'error');
  }
}

// Fetch Current Price
async function fetchCurrentPrice() {
  const symbol = symbolInput.value.trim();
  if (!symbol) {
    currentPriceDiv.textContent = '';
    return;
  }

  try {
    const price = await apiCall('/price', { symbol });
    currentPriceDiv.textContent = `Current Price: $${price.price} (Bid: $${price.bid} / Ask: $${price.ask})`;
  } catch (error) {
    currentPriceDiv.textContent = `Could not fetch price: ${error.message}`;
  }
}

// Handle Order Submission
async function handleOrderSubmit(e) {
  e.preventDefault();

  const side = e.target.dataset.side;
  const symbol = symbolInput.value.trim();
  const quantity = document.getElementById('quantity').value;
  const orderType = orderTypeSelect.value;

  if (!symbol || !quantity) {
    showStatus('Please fill in all required fields', 'error');
    return;
  }

  try {
    let result;

    if (orderType === 'market') {
      showStatus(`Placing ${side} market order for ${quantity} ${symbol}...`, 'info');
      result = await apiCall('/order/market', { symbol, quantity: parseFloat(quantity), side });
    } else {
      const limitPrice = document.getElementById('limit-price').value;
      if (!limitPrice) {
        showStatus('Please enter a limit price', 'error');
        return;
      }
      showStatus(`Placing ${side} limit order for ${quantity} ${symbol} at $${limitPrice}...`, 'info');
      result = await apiCall('/order/limit', {
        symbol,
        quantity: parseFloat(quantity),
        side,
        limitPrice: parseFloat(limitPrice)
      });
    }

    if (result.success) {
      showStatus(`Order placed successfully! ID: ${result.order.id}`, 'success');
      orderForm.reset();
      currentPriceDiv.textContent = '';

      // Refresh data after order
      setTimeout(refreshAllData, 1000);
    } else {
      showStatus('Order failed', 'error');
    }
  } catch (error) {
    showStatus(`Error placing order: ${error.message}`, 'error');
  }
}

// Cancel Order
async function cancelOrder(orderId) {
  if (!confirm('Are you sure you want to cancel this order?')) {
    return;
  }

  try {
    showStatus(`Cancelling order ${orderId}...`, 'info');
    const result = await apiCall('/order/cancel', { orderId });

    if (result.success) {
      showStatus('Order cancelled successfully', 'success');
      fetchOrders();
    }
  } catch (error) {
    showStatus(`Error cancelling order: ${error.message}`, 'error');
  }
}

// Status Messages
function showStatus(message, type = 'info') {
  const statusDiv = document.getElementById('status-messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `status-message status-${type}`;
  messageDiv.textContent = `${new Date().toLocaleTimeString()}: ${message}`;

  statusDiv.insertBefore(messageDiv, statusDiv.firstChild);

  // Keep only last 10 messages
  while (statusDiv.children.length > 10) {
    statusDiv.removeChild(statusDiv.lastChild);
  }
}