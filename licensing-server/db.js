const { Pool } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

let useSqlite = false;
let sqliteDb = null;
let pool = null;

// Determine if we should use SQLite immediately
if (!process.env.DATABASE_URL) {
  console.warn('⚠️ DATABASE_URL not set. Falling back to local SQLite database (licensing.db).');
  useSqlite = true;
}

if (useSqlite) {
  initSqlite();
} else {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  // Test connection and initialize PostgreSQL table
  pool.connect()
    .then(async (client) => {
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS licenses (
            id VARCHAR(255) PRIMARY KEY,
            license_key VARCHAR(255) UNIQUE NOT NULL,
            shop_name VARCHAR(255) NOT NULL,
            owner_name VARCHAR(255) NOT NULL,
            status VARCHAR(50) DEFAULT 'active',
            expiry_date TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(license_key);
        `);
        console.log('✅ PostgreSQL Database connected and verified.');
      } catch (err) {
        console.error('❌ Error initializing PostgreSQL tables:', err.message);
      } finally {
        client.release();
      }
    })
    .catch((err) => {
      console.warn('⚠️ PostgreSQL connection failed. Falling back to local SQLite database (licensing.db). Error:', err.message);
      useSqlite = true;
      initSqlite();
    });
}

function initSqlite() {
  try {
    sqliteDb = new Database(path.join(__dirname, 'licensing.db'));
    // Enable WAL mode
    sqliteDb.pragma('journal_mode = WAL');
    sqliteDb.pragma('foreign_keys = ON');

    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS licenses (
        id TEXT PRIMARY KEY,
        license_key TEXT UNIQUE NOT NULL,
        shop_name TEXT NOT NULL,
        owner_name TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        expiry_date TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(license_key);
    `);
    console.log('✅ SQLite Database connected and verified.');
  } catch (err) {
    console.error('❌ Failed to initialize SQLite database:', err);
  }
}

module.exports = {
  query: async (text, params = []) => {
    if (useSqlite) {
      // Map PostgreSQL parameter placeholders ($1, $2, etc.) to SQLite placeholders (?)
      const sqliteText = text.replace(/\$[0-9]+/g, '?');
      const stmt = sqliteDb.prepare(sqliteText);
      
      if (text.trim().toUpperCase().startsWith('SELECT')) {
        const rows = stmt.all(...params);
        return { rows };
      } else {
        const info = stmt.run(...params);
        return { rows: [], changes: info.changes };
      }
    } else {
      return pool.query(text, params);
    }
  }
};

