# ⚡ QuickSell — All-in-One Shop Management POS

A streamlined, offline-first, barcode-driven point-of-sale system for clothing shops. Built for pure speed and simplicity.

## Features

- 📦 **Inventory** — Add items with name & price, auto-generate CODE128 barcodes, print labels
- 🛒 **Billing** — Scan barcodes to instantly build a cart, apply per-item discounts
- 💳 **UPI Payment** — Auto-generated UPI QR code for contactless payments
- 📱 **WhatsApp Receipts** — Send professional receipts to customers via WhatsApp
- 📊 **Dashboard** — Real-time analytics: daily revenue, top products, monthly trends
- 🔌 **Offline-First** — Local SQLite database, no internet needed for core operations

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite |
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Barcode | JsBarcode (CODE128) |
| QR Code | qrcode (UPI) |
| Charts | Recharts |

## Quick Start

### 1. Install Dependencies
```bash
cd server && npm install
cd ../client && npm install
```

### 2. Start Backend
```bash
cd server
npm run dev
# Server runs on http://localhost:3001
```

### 3. Start Frontend
```bash
cd client
npm run dev
# App opens at http://localhost:5173
```

### 4. First Run
- Enter your shop name and UPI ID on the setup screen
- Start adding products in the Inventory tab
- Print barcode labels and stick them on clothes
- Scan barcodes at the Billing counter to create bills!

## Project Structure

```
QuickSell/
├── client/            # React frontend (Vite)
│   └── src/
│       ├── pages/     # Setup, Inventory, Billing, Dashboard
│       └── components/# Sidebar
├── server/            # Express backend
│   ├── routes/        # products, sales, dashboard, settings
│   ├── db.js          # SQLite setup
│   └── index.js       # Server entry
└── README.md
```

## License

MIT
