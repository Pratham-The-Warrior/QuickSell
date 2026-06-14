const express = require('express');
const cors = require('cors');
const path = require('path');

const productsRouter = require('./routes/products');
const salesRouter = require('./routes/sales');
const dashboardRouter = require('./routes/dashboard');
const settingsRouter = require('./routes/settings');
const licenseGuard = require('./middleware/licenseGuard');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/products', productsRouter);
app.use('/api/sales', licenseGuard, salesRouter); // License required for billing
app.use('/api/dashboard', dashboardRouter);
app.use('/api/settings', settingsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend in production
app.use(express.static(path.join(__dirname, '../client/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Background subscription checker
const db = require('./db');
async function runBackgroundLicenseCheck() {
  try {
    const keyRow = db.prepare("SELECT value FROM settings WHERE key = 'licenseKey'").get();
    
    if (keyRow && keyRow.value) {
      console.log('🔄 Running background subscription check...');
      const result = await settingsRouter.verifyAndUpdateLicense(keyRow.value);
      console.log(`✅ Subscription check result: status = ${result.status}`);
    } else {
      console.log('⚠️ No license key configured. POS checkout is currently active but unlicensed.');
    }
  } catch (err) {
    console.error('❌ Background subscription check error:', err);
  }
}

// Run 5 seconds after startup
setTimeout(runBackgroundLicenseCheck, 5000);
// Periodically check every 12 hours
setInterval(runBackgroundLicenseCheck, 12 * 60 * 60 * 1000);

// Start server
const server = app.listen(PORT, () => {
  console.log(`\n  ⚡ QuickSell Server running at http://localhost:${PORT}\n`);
});

module.exports = server;
