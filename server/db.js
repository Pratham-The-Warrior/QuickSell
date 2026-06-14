const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'quicksell.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    barcode TEXT UNIQUE NOT NULL,
    price REAL NOT NULL,
    category TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    items TEXT NOT NULL,
    subtotal REAL NOT NULL,
    discount_total REAL DEFAULT 0,
    grand_total REAL NOT NULL,
    payment_method TEXT DEFAULT 'UPI',
    customer_phone TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Create indexes for fast lookups
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
  CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
`);

// Self-healing migration: Add customer_name to sales table if it doesn't exist
try {
  db.exec("ALTER TABLE sales ADD COLUMN customer_name TEXT DEFAULT ''");
} catch (e) {
  // Already exists, safe to ignore
}

module.exports = db;
