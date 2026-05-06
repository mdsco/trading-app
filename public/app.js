// DOM Elements
const serviceSelect = document.getElementById('service-select');
const refreshBtn = document.getElementById('refresh-btn');
const orderForm = document.getElementById('order-form');
const orderTypeSelect = document.getElementById('order-type');
const limitPriceGroup = document.getElementById('limit-price-group');
const symbolInput = document.getElementById('symbol');
const currentPriceDiv = document.getElementById('current-price');
const themeToggle = document.getElementById('theme-toggle');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  await fetchServerCredentials();
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
  themeToggle.addEventListener('click', handleThemeToggle);

  // Handle order submission
  document.querySelectorAll('.btn-buy, .btn-sell').forEach(btn => {
    btn.addEventListener('click', handleOrderSubmit);
  });
}

function handleServiceChange() {
  loadServiceConfig();
  refreshAllData();
}

function handleOrderTypeChange() {
  limitPriceGroup.style.display = orderTypeSelect.value === 'limit' ? 'block' : 'none';
}

// Refresh All Data
async function refreshAllData() {
  showStatus('Refreshing data...', 'info');

  try {
    await Promise.all([
      fetchAccountData(),
      fetchPositions()
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

// Fetch Current Price
async function fetchCurrentPrice() {
  const symbol = symbolInput.value.trim();
  if (!symbol) {
    currentPriceDiv.textContent = '';
    return;
  }

  try {
    const price = await apiCall('/price', { symbol });
    currentPriceDiv.textContent = `Current Price for ${symbol}: $${price.price} (Bid: $${price.bid} / Ask: $${price.ask})`;
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

