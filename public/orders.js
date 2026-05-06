// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  await fetchServerCredentials();
  loadServiceConfig();
  setupEventListeners();
  fetchOrders();
});

function setupEventListeners() {
  document.getElementById('service-select').addEventListener('change', handleServiceChange);
  document.getElementById('refresh-btn').addEventListener('click', fetchOrders);
  document.getElementById('theme-toggle').addEventListener('click', handleThemeToggle);
}

function handleServiceChange() {
  loadServiceConfig();
  fetchOrders();
}

// Fetch Orders
async function fetchOrders() {
  showStatus('Loading orders...', 'info');
  try {
    const result = await apiCall('/orders');
    const tbody = document.getElementById('orders-body');

    if (!result.orders || result.orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="empty-message">No orders</td></tr>';
      showStatus('Orders loaded', 'success');
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
        <td>${order.createdAt ? new Date(order.createdAt).toLocaleString() : '-'}</td>
        <td>
          ${order.status === 'pending' ?
            `<button class="btn btn-cancel" onclick="cancelOrder('${order.id}')">Cancel</button>` :
            '-'}
        </td>
      </tr>
    `).join('');
    showStatus('Orders loaded', 'success');
  } catch (error) {
    showStatus(`Error fetching orders: ${error.message}`, 'error');
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
