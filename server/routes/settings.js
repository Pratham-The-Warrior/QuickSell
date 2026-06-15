const express = require('express');
const crypto = require('crypto');
const db = require('../db');

const router = express.Router();

// Shared secret for HMAC verification (must match licensing server)
const HMAC_SECRET = process.env.LICENSE_HMAC_SECRET || 'quicksell-hmac-shared-secret-2026';

// Rate limiting for verify-license endpoint
const verifyRateLimit = new Map(); // key -> { count, resetAt }
const RATE_LIMIT_MAX = 5;          // max 5 verifications
const RATE_LIMIT_WINDOW = 60000;   // per 60 seconds

function checkVerifyRateLimit(licenseKey) {
  const now = Date.now();
  const entry = verifyRateLimit.get(licenseKey);
  
  if (!entry || now > entry.resetAt) {
    verifyRateLimit.set(licenseKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  entry.count++;
  return true;
}

// Get all settings
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM settings').all();
    const settings = {};
    rows.forEach(row => {
      settings[row.key] = row.value;
    });
    settings['licenseStatus'] = 'active';
    res.json(settings);
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Save/update settings (accepts an object of key-value pairs)
router.post('/', (req, res) => {
  try {
    const entries = req.body;

    // Prevent client-side tampering of license fields via the generic settings endpoint
    const protectedKeys = new Set([
      'licenseStatus', 'licenseLastChecked', 'licenseExpiry', 'licenseChecksum'
    ]);

    const upsert = db.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    );

    const saveAll = db.transaction((entries) => {
      for (const [key, value] of Object.entries(entries)) {
        if (protectedKeys.has(key)) {
          console.warn(`⚠️ Blocked attempt to directly set protected license field: ${key}`);
          continue; // silently skip — don't let client override license state
        }
        upsert.run(key, String(value));
      }
    });

    saveAll(entries);

    // Return updated settings
    const rows = db.prepare('SELECT * FROM settings').all();
    const settings = {};
    rows.forEach(row => {
      settings[row.key] = row.value;
    });
    settings['licenseStatus'] = 'active';
    res.json(settings);
  } catch (err) {
    console.error('Error saving settings:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// License verification helpers

/**
 * Verify HMAC signature from the licensing server response.
 * The licensing server signs: `${status}:${expiry}:${license_key}` with the shared secret.
 */
function verifyHmacSignature(status, expiry, licenseKey, signature) {
  if (!signature) return false;
  const payload = `${status}:${expiry}:${licenseKey}`;
  const expected = crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/**
 * Generate a checksum of the stored license state to detect DB tampering.
 */
function generateLicenseChecksum(licenseKey, status, expiry) {
  const data = `${licenseKey}:${status}:${expiry}`;
  return crypto.createHmac('sha256', HMAC_SECRET).update(data).digest('hex');
}

/**
 * Verify the stored license state hasn't been tampered with.
 */
function verifyStoredChecksum() {
  const keyRow = db.prepare("SELECT value FROM settings WHERE key = 'licenseKey'").get();
  const statusRow = db.prepare("SELECT value FROM settings WHERE key = 'licenseStatus'").get();
  const expiryRow = db.prepare("SELECT value FROM settings WHERE key = 'licenseExpiry'").get();
  const checksumRow = db.prepare("SELECT value FROM settings WHERE key = 'licenseChecksum'").get();

  if (!checksumRow || !keyRow) return true; // no license set yet
  
  const expected = generateLicenseChecksum(
    keyRow.value,
    statusRow ? statusRow.value : 'unlicensed',
    expiryRow ? expiryRow.value : ''
  );
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(checksumRow.value)
    );
  } catch {
    return false;
  }
}

async function performLicenseCheck(licenseKey, serverUrl) {
  if (!licenseKey) {
    return { status: 'unlicensed', checkedAt: new Date().toISOString(), expiry: null };
  }

  const key = licenseKey.trim().toUpperCase();
  
  // 1. Check Mock Keys first for testing/review convenience
  if (key === 'QS-TEST-SUSPENDED') {
    return { 
      status: 'suspended', 
      checkedAt: new Date().toISOString(),
      expiry: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString() 
    };
  }
  if (key === 'QS-TEST-ACTIVE') {
    return { 
      status: 'active', 
      checkedAt: new Date().toISOString(),
      expiry: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString() 
    };
  }
  if (key === 'QS-TEST-EXPIRED') {
    return { 
      status: 'expired', 
      checkedAt: new Date().toISOString(),
      expiry: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() 
    };
  }

  // 2. Perform real check against the licensing server
  const targetUrl = serverUrl || 'https://quicksell-7lkq.onrender.com/api/check';
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 4000);
    
    const res = await fetch(`${targetUrl}?license_key=${encodeURIComponent(licenseKey)}`, {
      signal: controller.signal
    });
    clearTimeout(id);
    
    if (res.ok) {
      const data = await res.json();

      // Verify HMAC signature if present
      if (data.signature) {
        const isValid = verifyHmacSignature(data.status, data.expiry, licenseKey, data.signature);
        if (!isValid) {
          console.error('❌ HMAC signature verification failed — possible MITM or spoofed response');
          return { status: 'offline', checkedAt: null, expiry: null };
        }
      }

      // Validate response fields
      const validStatuses = new Set(['active', 'suspended', 'expired', 'unlicensed']);
      const receivedStatus = validStatuses.has(data.status) ? data.status : 'active';
      const receivedExpiry = data.expiry || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();

      // Sanity check: expiry can't be more than 5 years from now
      const maxExpiry = Date.now() + 5 * 365 * 24 * 60 * 60 * 1000;
      const expiryTs = new Date(receivedExpiry).getTime();
      if (isNaN(expiryTs) || expiryTs > maxExpiry) {
        console.warn('⚠️ Suspicious expiry date received from licensing server, capping at 5 years');
        return {
          status: receivedStatus,
          expiry: new Date(maxExpiry).toISOString(),
          checkedAt: new Date().toISOString()
        };
      }

      return {
        status: receivedStatus,
        expiry: receivedExpiry,
        checkedAt: new Date().toISOString()
      };
    }
    
    // Non-OK response (e.g. 404 = invalid key)
    if (res.status === 404) {
      return { status: 'unlicensed', checkedAt: new Date().toISOString(), expiry: null };
    }
  } catch (err) {
    console.warn('Licensing server offline, falling back to local grace period validation:', err.message);
  }
  
  // 3. Offline fallback
  return { status: 'offline', checkedAt: null, expiry: null };
}

async function verifyAndUpdateLicense(licenseKey, serverUrl) {
  // Check for DB tampering before proceeding
  if (!verifyStoredChecksum()) {
    console.error('❌ License database tampering detected! Checksum mismatch.');
    const upsert = db.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    );
    upsert.run('licenseStatus', 'tampered');
    upsert.run('licenseChecksum', '');
    return { status: 'tampered', lastChecked: new Date().toISOString(), expiry: null };
  }

  let activeServerUrl = serverUrl;
  if (!activeServerUrl) {
    const urlRow = db.prepare("SELECT value FROM settings WHERE key = 'licenseServerUrl'").get();
    activeServerUrl = urlRow ? urlRow.value : null;
  }

  const checkResult = await performLicenseCheck(licenseKey, activeServerUrl);
  
  let status = checkResult.status;
  let lastChecked = checkResult.checkedAt;
  let expiry = checkResult.expiry;
  
  const upsert = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  );
  
  // Retrieve stored values for offline fallback
  const lastCheckedRow = db.prepare("SELECT value FROM settings WHERE key = 'licenseLastChecked'").get();
  const lastCheckedVal = lastCheckedRow ? lastCheckedRow.value : null;
  const storedExpiryRow = db.prepare("SELECT value FROM settings WHERE key = 'licenseExpiry'").get();
  const lastStatusRow = db.prepare("SELECT value FROM settings WHERE key = 'licenseStatus'").get();

  if (status === 'offline') {
    // ── OFFLINE PATH ──
    // The licensing server is unreachable. Apply local grace period + clock tampering.

    // 1. Clock Tampering Check (only offline)
    if (lastCheckedVal) {
      const lastCheckedDate = new Date(lastCheckedVal);
      const timeDiffMs = Date.now() - lastCheckedDate.getTime();
      
      // If current time is MORE than 10 minutes BEFORE last check, clock was set backward
      if (timeDiffMs < -(10 * 60 * 1000)) {
        console.warn('⚠️ Clock tampering detected (clock set backward while offline)');
        status = 'expired_offline';
      } else {
        // 2. Grace Period Check (7 days)
        const diffDays = timeDiffMs / (1000 * 60 * 60 * 24);
        if (diffDays > 7) {
          console.warn('⚠️ Offline grace period exceeded (>7 days since last server check)');
          status = 'expired_offline';
        } else {
          // Within grace period — restore last known status
          const lastStatus = lastStatusRow ? lastStatusRow.value : 'active';
          status = (lastStatus === 'suspended') ? 'suspended' : 'active';
        }
      }
    } else {
      // Never validated online before — cannot use offline
      console.warn('⚠️ No previous online validation found. Cannot operate offline.');
      status = 'expired_offline';
    }
    
    // Use stored expiry for offline
    expiry = storedExpiryRow ? storedExpiryRow.value : null;
    
  } else if (status === 'active' || status === 'suspended' || status === 'expired') {
    // ── ONLINE PATH ──
    // The licensing server responded. Trust the server's status and expiry unconditionally.
    // No clock tampering check needed — the server is the source of truth.
    
    // Nothing to modify — status, expiry, and lastChecked all come from the server.
  }
  // 'unlicensed' status passes through unchanged.

  // Local validation of expiry date (applies to both online and offline paths)
  const activeExpiry = expiry || (storedExpiryRow ? storedExpiryRow.value : null);
  if (activeExpiry && status === 'active') {
    const expiryDate = new Date(activeExpiry);
    if (Date.now() > expiryDate.getTime()) {
      status = 'expired';
    }
  }
  
  // Persist to database
  upsert.run('licenseKey', licenseKey || '');
  upsert.run('licenseStatus', status);
  if (activeServerUrl) {
    upsert.run('licenseServerUrl', activeServerUrl);
  }
  if (lastChecked) {
    upsert.run('licenseLastChecked', lastChecked);
  }
  if (activeExpiry) {
    upsert.run('licenseExpiry', activeExpiry);
  }
  
  // Store integrity checksum
  const checksum = generateLicenseChecksum(licenseKey || '', status, activeExpiry || '');
  upsert.run('licenseChecksum', checksum);
  
  return { status, lastChecked, expiry: activeExpiry };
}

router.post('/verify-license', async (req, res) => {
  try {
    const { licenseKey, licenseServerUrl } = req.body;
    
    if (!licenseKey || typeof licenseKey !== 'string' || licenseKey.trim().length === 0) {
      return res.status(400).json({ error: 'Invalid license key' });
    }

    // Rate limiting
    if (!checkVerifyRateLimit(licenseKey.trim())) {
      console.warn(`⚠️ Rate limit exceeded for license verification: ${licenseKey}`);
      return res.status(429).json({ error: 'Too many verification attempts. Please wait and try again.' });
    }

    const result = await verifyAndUpdateLicense(licenseKey, licenseServerUrl);
    res.json(result);
  } catch (err) {
    console.error('Error verifying license:', err);
    res.status(500).json({ error: 'Failed to verify license' });
  }
});

router.verifyAndUpdateLicense = verifyAndUpdateLicense;
module.exports = router;
