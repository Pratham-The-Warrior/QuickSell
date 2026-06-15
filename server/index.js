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



// Start server
const server = app.listen(PORT, () => {
  console.log(`\n  ⚡ QuickSell Server running at http://localhost:${PORT}\n`);
});

module.exports = server;
