const fs = require('fs');
const path = require('path');

// Detect port from server.js or .env
function detectPort() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    const match = env.match(/^PORT\s*=\s*(\d+)/m);
    if (match) return match[1];
  }
  // Fallback to server default
  return 5000;
}

const port = detectPort();
const url = `http://localhost:${port}/api/attendance/analytics`;

async function main() {
  try {
    const res = await fetch(url);
    console.log('Status:', res.status, res.statusText);
    const data = await res.json();
    console.log('Raw Analytics Fetch Response:', data);
    console.dir(data, { depth: null, colors: true });
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}

main();
