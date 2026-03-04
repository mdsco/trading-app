// Chart.js Configuration and Management

let priceChart = null;

// Initialize chart on page load
document.addEventListener('DOMContentLoaded', () => {
  initializeChart();
  setupChartControls();
});

// Initialize empty chart
function initializeChart() {
  const ctx = document.getElementById('price-chart').getContext('2d');

  priceChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Price',
        data: [],
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += '$' + context.parsed.y.toFixed(2);
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Time'
          },
          ticks: {
            maxRotation: 45,
            minRotation: 45
          }
        },
        y: {
          display: true,
          title: {
            display: true,
            text: 'Price (USD)'
          },
          ticks: {
            callback: function(value) {
              return '$' + value.toFixed(2);
            }
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    }
  });
}

// Setup chart controls
function setupChartControls() {
  const loadChartBtn = document.getElementById('load-chart-btn');
  loadChartBtn.addEventListener('click', loadChartData);

  // Allow loading chart with Enter key
  const chartSymbolInput = document.getElementById('chart-symbol');
  chartSymbolInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      loadChartData();
    }
  });
}

// Load chart data from API
async function loadChartData() {
  const symbol = document.getElementById('chart-symbol').value.trim();
  const interval = document.getElementById('chart-interval').value;

  if (!symbol) {
    showStatus('Please enter a symbol for the chart', 'error');
    return;
  }

  try {
    showStatus(`Loading chart data for ${symbol}...`, 'info');

    const result = await apiCall('/historical', {
      symbol,
      interval,
      limit: 100
    });

    if (!result.data || result.data.length === 0) {
      showStatus('No chart data available', 'error');
      return;
    }

    updateChart(result.data, symbol);
    showStatus(`Chart loaded for ${symbol}`, 'success');
  } catch (error) {
    showStatus(`Error loading chart: ${error.message}`, 'error');
  }
}

// Update chart with new data
function updateChart(data, symbol) {
  // Prepare labels (timestamps)
  const labels = data.map(candle => {
    const date = new Date(candle.timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  });

  // Extract close prices
  const prices = data.map(candle => parseFloat(candle.close));

  // Update chart
  priceChart.data.labels = labels;
  priceChart.data.datasets[0].label = `${symbol} Price`;
  priceChart.data.datasets[0].data = prices;

  // Optional: Add candlestick visualization
  if (data.length > 0 && data[0].open && data[0].high && data[0].low) {
    addCandlestickData(data, symbol);
  }

  priceChart.update();
}

// Add candlestick visualization (using high/low range)
function addCandlestickData(data, symbol) {
  const highs = data.map(candle => parseFloat(candle.high));
  const lows = data.map(candle => parseFloat(candle.low));
  const opens = data.map(candle => parseFloat(candle.open));
  const closes = data.map(candle => parseFloat(candle.close));

  // Remove old datasets
  priceChart.data.datasets = [];

  // Add high line
  priceChart.data.datasets.push({
    label: 'High',
    data: highs,
    borderColor: 'rgba(40, 167, 69, 0.5)',
    backgroundColor: 'rgba(40, 167, 69, 0.05)',
    borderWidth: 1,
    tension: 0.4,
    fill: false,
    pointRadius: 0
  });

  // Add close line (main)
  priceChart.data.datasets.push({
    label: `${symbol} Close`,
    data: closes,
    borderColor: '#667eea',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderWidth: 2,
    tension: 0.4,
    fill: true,
    pointRadius: 1
  });

  // Add low line
  priceChart.data.datasets.push({
    label: 'Low',
    data: lows,
    borderColor: 'rgba(220, 53, 69, 0.5)',
    backgroundColor: 'rgba(220, 53, 69, 0.05)',
    borderWidth: 1,
    tension: 0.4,
    fill: false,
    pointRadius: 0
  });
}

// Auto-refresh chart (optional - call this if you want live updates)
function startChartAutoRefresh(intervalSeconds = 60) {
  setInterval(() => {
    const symbol = document.getElementById('chart-symbol').value.trim();
    if (symbol) {
      loadChartData();
    }
  }, intervalSeconds * 1000);
}

// Utility: Convert chart data to candlestick format
function convertToCandlestick(data) {
  return data.map(candle => ({
    x: new Date(candle.timestamp).getTime(),
    o: parseFloat(candle.open),
    h: parseFloat(candle.high),
    l: parseFloat(candle.low),
    c: parseFloat(candle.close)
  }));
}