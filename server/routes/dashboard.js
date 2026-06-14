const express = require('express');
const db = require('../db');

const router = express.Router();

// Today's summary — revenue, items sold, transaction count
router.get('/today', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const summary = db.prepare(`
      SELECT
        COALESCE(SUM(grand_total), 0) as revenue,
        COUNT(*) as transactions
      FROM sales
      WHERE date(created_at) = date(?)
    `).get(today);

    // Count total items sold today
    const sales = db.prepare(
      `SELECT items FROM sales WHERE date(created_at) = date(?)`
    ).all(today);

    let itemsSold = 0;
    sales.forEach(s => {
      const items = JSON.parse(s.items);
      items.forEach(item => { itemsSold += (item.qty || 1); });
    });

    res.json({
      revenue: summary.revenue,
      transactions: summary.transactions,
      itemsSold
    });
  } catch (err) {
    console.error('Error fetching today stats:', err);
    res.status(500).json({ error: 'Failed to fetch today stats' });
  }
});

// Monthly revenue breakdown — revenue per day for the current month
router.get('/monthly', (req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const startOfMonth = `${year}-${month}-01`;

    const data = db.prepare(`
      SELECT
        date(created_at) as date,
        SUM(grand_total) as revenue,
        COUNT(*) as transactions
      FROM sales
      WHERE date(created_at) >= date(?)
      GROUP BY date(created_at)
      ORDER BY date(created_at) ASC
    `).all(startOfMonth);

    res.json(data);
  } catch (err) {
    console.error('Error fetching monthly stats:', err);
    res.status(500).json({ error: 'Failed to fetch monthly stats' });
  }
});

// Top selling products
router.get('/top-items', (req, res) => {
  try {
    const { days } = req.query;
    const daysBack = parseInt(days) || 30;

    const sales = db.prepare(`
      SELECT items FROM sales
      WHERE date(created_at) >= date('now', ?)
    `).all(`-${daysBack} days`);

    const productMap = {};
    sales.forEach(s => {
      const items = JSON.parse(s.items);
      items.forEach(item => {
        const key = item.name || item.productId;
        if (!productMap[key]) {
          productMap[key] = { name: key, quantity: 0, revenue: 0 };
        }
        productMap[key].quantity += (item.qty || 1);
        productMap[key].revenue += (item.price * (item.qty || 1));
      });
    });

    const topItems = Object.values(productMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    res.json(topItems);
  } catch (err) {
    console.error('Error fetching top items:', err);
    res.status(500).json({ error: 'Failed to fetch top items' });
  }
});

module.exports = router;
