require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3002;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const SESSION_TOKEN = 'quicksell-super-admin-token-2026';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to check admin session token
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${SESSION_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized. Invalid admin session token.' });
  }
  next();
}

// Generate unique license key in format QS-XXXX-XXXX
async function generateUniqueKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const genSegment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  
  let key;
  let isUnique = false;
  
  while (!isUnique) {
    key = `QS-${genSegment()}-${genSegment()}`;
    const result = await db.query('SELECT 1 FROM licenses WHERE license_key = $1', [key]);
    if (result.rows.length === 0) {
      isUnique = true;
    }
  }
  return key;
}

// Shared secret for HMAC signing (must match POS server)
const HMAC_SECRET = process.env.LICENSE_HMAC_SECRET || 'quicksell-hmac-shared-secret-2026';

/**
 * Sign a license check response with HMAC-SHA256.
 * Payload: `${status}:${expiry}:${license_key}`
 */
function signResponse(status, expiry, licenseKey) {
  const payload = `${status}:${expiry}:${licenseKey}`;
  return crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
}

// ================= PUBLIC ROUTE =================

// GET /api/check - Checked periodically by POS clients
app.get('/api/check', async (req, res) => {
  const { license_key } = req.query;
  if (!license_key) {
    return res.status(400).json({ error: 'Missing license_key parameter' });
  }

  // Basic input validation
  const sanitizedKey = license_key.trim().toUpperCase();
  if (sanitizedKey.length > 20 || !/^[A-Z0-9-]+$/.test(sanitizedKey)) {
    return res.status(400).json({ error: 'Invalid license key format' });
  }

  try {
    const result = await db.query('SELECT * FROM licenses WHERE license_key = $1', [sanitizedKey]);
    const license = result.rows[0];
    
    if (!license) {
      return res.status(404).json({ status: 'unlicensed', error: 'License key not found' });
    }

    // Auto-expire check
    const expiryTime = new Date(license.expiry_date).getTime();
    const currentTime = Date.now();
    let status = license.status;

    if (status === 'active' && currentTime > expiryTime) {
      status = 'expired';
      await db.query('UPDATE licenses SET status = $1 WHERE id = $2', [status, license.id]);
    }

    const expiry = license.expiry_date;
    const signature = signResponse(status, expiry, sanitizedKey);

    res.json({
      status: status,
      expiry: expiry,
      signature: signature
    });
  } catch (err) {
    console.error('Error checking license:', err);
    res.status(500).json({ error: 'Internal server error during check' });
  }
});


// ================= ADMIN ROUTES =================

// POST /api/admin/login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ token: SESSION_TOKEN });
  } else {
    res.status(401).json({ error: 'Invalid super admin password' });
  }
});

// GET /api/admin/licenses - List all keys
app.get('/api/admin/licenses', requireAdmin, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM licenses ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching licenses:', err);
    res.status(500).json({ error: 'Failed to retrieve licenses' });
  }
});

// POST /api/admin/licenses - Generate new license key
app.post('/api/admin/licenses', requireAdmin, async (req, res) => {
  const { shopName, ownerName, months } = req.body;
  if (!shopName || !ownerName) {
    return res.status(400).json({ error: 'shopName and ownerName are required' });
  }

  const durationMonths = parseInt(months) || 6;
  const key = await generateUniqueKey();
  const id = crypto.randomUUID();
  
  // Calculate expiry date: current time + durationMonths * 30 days
  const expiryDate = new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    await db.query(`
      INSERT INTO licenses (id, license_key, shop_name, owner_name, status, expiry_date)
      VALUES ($1, $2, $3, $4, 'active', $5)
    `, [id, key, shopName.trim(), ownerName.trim(), expiryDate]);

    const newRow = await db.query('SELECT * FROM licenses WHERE id = $1', [id]);
    res.json(newRow.rows[0]);
  } catch (err) {
    console.error('Error generating license:', err);
    res.status(500).json({ error: 'Failed to generate license' });
  }
});

// PUT /api/admin/licenses/:id/status - Toggle active/suspended
app.put('/api/admin/licenses/:id/status', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (status !== 'active' && status !== 'suspended') {
    return res.status(400).json({ error: 'Invalid status. Must be active or suspended' });
  }

  try {
    const check = await db.query('SELECT 1 FROM licenses WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'License not found' });

    await db.query('UPDATE licenses SET status = $1 WHERE id = $2', [status, id]);
    const updated = await db.query('SELECT * FROM licenses WHERE id = $1', [id]);
    res.json(updated.rows[0]);
  } catch (err) {
    console.error('Error updating status:', err);
    res.status(500).json({ error: 'Failed to update license status' });
  }
});

// PUT /api/admin/licenses/:id/renew - Extend license (e.g. +6 Months)
app.put('/api/admin/licenses/:id/renew', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { months } = req.body;
  const durationMonths = parseInt(months) || 6;

  try {
    const licenseResult = await db.query('SELECT * FROM licenses WHERE id = $1', [id]);
    const license = licenseResult.rows[0];
    if (!license) return res.status(404).json({ error: 'License not found' });

    const currentExpiry = new Date(license.expiry_date).getTime();
    const baseTime = Math.max(Date.now(), currentExpiry);
    const newExpiry = new Date(baseTime + durationMonths * 30 * 24 * 60 * 60 * 1000).toISOString();

    await db.query("UPDATE licenses SET expiry_date = $1, status = 'active' WHERE id = $2", [newExpiry, id]);
    const updated = await db.query('SELECT * FROM licenses WHERE id = $1', [id]);
    res.json(updated.rows[0]);
  } catch (err) {
    console.error('Error renewing license:', err);
    res.status(500).json({ error: 'Failed to renew license' });
  }
});

// DELETE /api/admin/licenses/:id - Delete a key
app.delete('/api/admin/licenses/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const check = await db.query('SELECT 1 FROM licenses WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'License not found' });

    await db.query('DELETE FROM licenses WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting license:', err);
    res.status(500).json({ error: 'Failed to delete license' });
  }
});

// Serve the admin dashboard HTML for all non-API paths
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  🔑 QuickSell Licensing Server running at http://localhost:${PORT}`);
  console.log(`  👤 Admin Panel Dashboard accessible at http://localhost:${PORT}\n`);
});
