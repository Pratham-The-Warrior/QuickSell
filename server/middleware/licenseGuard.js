/**
 * License Guard Middleware
 * Blocks write operations on critical routes when license is not active.
 * Read-only endpoints (GET) always pass through so the shopkeeper can
 * still view their data even if the license lapses.
 */
const db = require('../db');

// Statuses that allow full operation
const ALLOWED_STATUSES = new Set(['active']);

function licenseGuard(req, res, next) {
  // Allow all GET / read requests — never lock a shopkeeper out of viewing data
  if (req.method === 'GET') return next();

  try {
    const statusRow = db.prepare("SELECT value FROM settings WHERE key = 'licenseStatus'").get();
    const status = statusRow ? statusRow.value : 'unlicensed';

    if (ALLOWED_STATUSES.has(status)) {
      return next();
    }

    // License is expired / suspended / expired_offline
    const expiryRow = db.prepare("SELECT value FROM settings WHERE key = 'licenseExpiry'").get();
    const expiry = expiryRow ? expiryRow.value : null;

    console.warn(`⛔ License guard blocked ${req.method} ${req.originalUrl} — status: ${status}`);

    return res.status(403).json({
      error: 'License not active',
      licenseStatus: status,
      licenseExpiry: expiry,
      message: status === 'suspended'
        ? 'Your subscription has been suspended. Please contact support.'
        : status === 'expired' || status === 'expired_offline'
          ? 'Your subscription has expired. Please renew to continue billing.'
          : 'License verification required. Please check your license key in Settings.'
    });
  } catch (err) {
    console.error('License guard error:', err);
    // Fail-open on unexpected errors so the shop can keep running
    return next();
  }
}

module.exports = licenseGuard;
