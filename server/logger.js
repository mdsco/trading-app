const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'errors.log');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function logError(route, service, error) {
  const entry = {
    timestamp: new Date().toISOString(),
    route,
    service: service || 'unknown',
    message: error.message,
  };

  console.error(`[${entry.timestamp}] ${route} (${entry.service}): ${error.message}`);

  try {
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
  } catch (writeErr) {
    console.error('Failed to write to log file:', writeErr.message);
  }
}

module.exports = { logError };