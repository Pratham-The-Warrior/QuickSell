const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'licensing.db');
const db = new Database(dbPath);

// Enable WAL mode
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS licenses (
    id TEXT PRIMARY KEY,
    license_key TEXT UNIQUE NOT NULL,
    shop_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    expiry_date DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Create index
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(license_key);
`);

module.exports = db;
