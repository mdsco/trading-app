// Shared state and utilities used by all pages

let currentService = 'mock';
let serviceConfig = {};
let serverAvailableCredentials = {};

// Fetch which services have server-side credentials pre-loaded
async function fetchServerCredentials() {
  try {
    const response = await fetch('/api/credentials');
    const data = await response.json();
    serverAvailableCredentials = data.available || {};
  } catch (e) {
    // If unavailable, fall back to localStorage / prompting
  }
}

// Service Configuration
function loadServiceConfig() {
  currentService = document.getElementById('service-select').value;

  if (currentService === 'mock') {
    serviceConfig = {};
    return;
  }

  // Server has credentials for this service — no client config needed
  if (serverAvailableCredentials[currentService]) {
    serviceConfig = {};
    return;
  }

  // Fall back to localStorage or prompt
  const savedConfig = localStorage.getItem(`config_${currentService}`);
  if (savedConfig) {
    serviceConfig = JSON.parse(savedConfig);
  } else {
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
        document.getElementById('service-select').value = 'mock';
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

// Theme / Dark Mode
function initTheme() {
  const saved = localStorage.getItem('theme_preference');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = saved !== null ? saved === 'dark' : prefersDark;
  applyTheme(isDark);
}

function applyTheme(isDark) {
  const themeToggle = document.getElementById('theme-toggle');
  document.body.classList.toggle('dark-mode', isDark);
  themeToggle.textContent = isDark ? '🌙' : '☀️';
  themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
}

function handleThemeToggle() {
  const isDark = !document.body.classList.contains('dark-mode');
  applyTheme(isDark);
  localStorage.setItem('theme_preference', isDark ? 'dark' : 'light');
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
