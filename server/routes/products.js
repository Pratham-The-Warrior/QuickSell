const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

// Generate a unique barcode string (QS + timestamp-based + random)
function generateBarcode() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `QS${ts}${rand}`;
}

// Generate a unique 5-digit design number (between 10000 and 99999)
function generateUniqueDesignNumber() {
  let designNo;
  let isUnique = false;
  let attempts = 0;
  
  while (!isUnique && attempts < 100) {
    designNo = Math.floor(10000 + Math.random() * 90000);
    const prefix = `D-${designNo} `;
    
    // Check if any product name starts with this prefix
    const existing = db.prepare('SELECT id FROM products WHERE name LIKE ?').get(`${prefix}%`);
    if (!existing) {
      isUnique = true;
    }
    attempts++;
  }
  return designNo;
}

// Add a new product
router.post('/', (req, res) => {
  try {
    const { name, price, category } = req.body;

    if (!name || price === undefined || price === null) {
      return res.status(400).json({ error: 'Name and price are required' });
    }
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ error: 'Price must be a valid positive number' });
    }

    const id = uuidv4();
    const barcode = generateBarcode();
    
    // Auto-generate random unique 5-digit design number (e.g. D-10293) if not already present (supports preserving 4 and 5 digit prefixes)
    const trimmedName = name.trim();
    const designNo = generateUniqueDesignNumber();
    const finalName = /^D-\d{4,5}\s/i.test(trimmedName) ? trimmedName : `D-${designNo} ${trimmedName}`;

    const stmt = db.prepare(
      'INSERT INTO products (id, name, barcode, price, category) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run(id, finalName, barcode, parsedPrice, category || '');

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.status(201).json(product);
  } catch (err) {
    console.error('Error adding product:', err);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// Bulk add products — same category & price, N quantity
router.post('/bulk', (req, res) => {
  try {
    const { category, price, quantity } = req.body;

    if (!category || price === undefined || !quantity || quantity < 1) {
      return res.status(400).json({ error: 'Category, price, and quantity are required' });
    }

    const count = Math.min(parseInt(quantity), 500); // cap at 500
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ error: 'Price must be a valid positive number' });
    }

    const stmt = db.prepare(
      'INSERT INTO products (id, name, barcode, price, category) VALUES (?, ?, ?, ?, ?)'
    );

    const products = [];
    const insertAll = db.transaction(() => {
      const usedInBatch = new Set();
      for (let i = 0; i < count; i++) {
        const id = uuidv4();
        const barcode = generateBarcode();
        
        let designNo;
        let isUnique = false;
        let attempts = 0;
        while (!isUnique && attempts < 100) {
          designNo = generateUniqueDesignNumber();
          if (!usedInBatch.has(designNo)) {
            isUnique = true;
            usedInBatch.add(designNo);
          }
          attempts++;
        }

        const name = `D-${designNo} ${category}`;
        stmt.run(id, name, barcode, parsedPrice, category);
        products.push({ id, name, barcode, price: parsedPrice, category });
      }
    });

    insertAll();
    res.status(201).json({ count: products.length, products });
  } catch (err) {
    console.error('Error bulk adding products:', err);
    res.status(500).json({ error: 'Failed to bulk add products' });
  }
});

// Get all products
router.get('/', (req, res) => {
  try {
    const { search } = req.query;
    let products;

    if (search) {
      products = db.prepare(
        'SELECT * FROM products WHERE name LIKE ? OR barcode LIKE ? ORDER BY created_at DESC'
      ).all(`%${search}%`, `%${search}%`);
    } else {
      products = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
    }

    res.json(products);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Lookup product by barcode (for scanner)
router.get('/barcode/:barcode', (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE barcode = ?').get(req.params.barcode);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (err) {
    console.error('Error looking up barcode:', err);
    res.status(500).json({ error: 'Failed to lookup barcode' });
  }
});

// Update a product
router.put('/:id', (req, res) => {
  try {
    const { name, price, category } = req.body;
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const parsedPrice = price !== undefined ? parseFloat(price) : existing.price;
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ error: 'Price must be a valid positive number' });
    }

    const stmt = db.prepare(
      'UPDATE products SET name = ?, price = ?, category = ? WHERE id = ?'
    );
    stmt.run(
      name !== undefined ? name.trim() : existing.name,
      parsedPrice,
      category !== undefined ? category : existing.category,
      id
    );

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.json(product);
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete a product
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
