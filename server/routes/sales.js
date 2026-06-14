const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

// Record a completed sale
router.post('/', (req, res) => {
  try {
    const { items, subtotal, discount_total, grand_total, payment_method, customer_phone, customer_name } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items are required' });
    }

    const parsedSubtotal = parseFloat(subtotal);
    const parsedDiscount = parseFloat(discount_total || 0);
    const parsedGrandTotal = parseFloat(grand_total);

    if (isNaN(parsedSubtotal) || isNaN(parsedDiscount) || isNaN(parsedGrandTotal) || 
        parsedSubtotal < 0 || parsedDiscount < 0 || parsedGrandTotal < 0) {
      return res.status(400).json({ error: 'Totals must be valid positive numbers' });
    }

    const id = uuidv4();

    // Run insert and deletes in a single atomic transaction
    const executeSaleTransaction = db.transaction(() => {
      const stmt = db.prepare(
        `INSERT INTO sales (id, items, subtotal, discount_total, grand_total, payment_method, customer_phone, customer_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );
      stmt.run(
        id,
        JSON.stringify(items),
        parseFloat(subtotal),
        parseFloat(discount_total || 0),
        parseFloat(grand_total),
        payment_method || 'UPI',
        customer_phone || '',
        customer_name || ''
      );

      const deleteStmt = db.prepare('DELETE FROM products WHERE id = ?');
      for (const item of items) {
        deleteStmt.run(item.productId);
      }
    });

    executeSaleTransaction();

    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(id);
    sale.items = JSON.parse(sale.items);
    res.status(201).json(sale);
  } catch (err) {
    console.error('Error recording sale:', err);
    res.status(500).json({ error: 'Failed to record sale' });
  }
});

// Get all sales with optional date filtering
router.get('/', (req, res) => {
  try {
    const { from, to, limit } = req.query;
    let sales;

    if (from && to) {
      sales = db.prepare(
        `SELECT * FROM sales WHERE date(created_at) BETWEEN date(?) AND date(?)
         ORDER BY created_at DESC LIMIT ?`
      ).all(from, to, parseInt(limit) || 100);
    } else {
      sales = db.prepare(
        'SELECT * FROM sales ORDER BY created_at DESC LIMIT ?'
      ).all(parseInt(limit) || 50);
    }

    sales = sales.map(s => ({ ...s, items: JSON.parse(s.items) }));
    res.json(sales);
  } catch (err) {
    console.error('Error fetching sales:', err);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

// Get a single sale by ID (for receipt)
router.get('/:id', (req, res) => {
  try {
    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    sale.items = JSON.parse(sale.items);
    res.json(sale);
  } catch (err) {
    console.error('Error fetching sale:', err);
    res.status(500).json({ error: 'Failed to fetch sale' });
  }
});

module.exports = router;
