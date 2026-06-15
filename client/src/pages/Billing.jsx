import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { ShoppingCart, FileText, Phone, Smartphone, Send, CreditCard, CheckCircle, Search, Trash2, ArrowLeft } from 'lucide-react';

const API = '/api';

export default function Billing({ settings }) {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [scanInput, setScanInput] = useState('');
  const [toast, setToast] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [cashReceived, setCashReceived] = useState('');
  const scanInputRef = useRef(null);

  const licenseStatus = settings?.licenseStatus || 'unlicensed';
  const isLocked = licenseStatus !== 'active';

  // Keep scanner input focused
  useEffect(() => {
    if (!showPayment && !showReceipt && !isLocked) {
      scanInputRef.current?.focus();
    }
  }, [showPayment, showReceipt, cart, isLocked]);

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discountTotal = cart.reduce((sum, item) => {
    const discountAmount = (item.price * item.qty * (item.discount || 0)) / 100;
    return sum + discountAmount;
  }, 0);
  const grandTotal = subtotal - discountTotal;

  // Generate UPI QR
  useEffect(() => {
    if (showPayment && grandTotal > 0 && settings?.upiId) {
      const upiUrl = `upi://pay?pa=${encodeURIComponent(settings.upiId)}&pn=${encodeURIComponent(settings.shopName || 'Shop')}&am=${grandTotal.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Bill - ${settings.shopName || 'QuickSell'}`)}`;

      QRCode.toDataURL(upiUrl, {
        width: 280,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('QR generation error:', err));
    }
  }, [showPayment, grandTotal, settings]);

  // Handle barcode scan (scanners type characters + Enter)
  async function handleScan(e) {
    if (e.key !== 'Enter' || !scanInput.trim()) return;

    const barcode = scanInput.trim();
    setScanInput('');

    try {
      const res = await fetch(`${API}/products/barcode/${encodeURIComponent(barcode)}`);
      if (!res.ok) {
        showToast('❌ Product not found!', 'error');
        return;
      }

      const product = await res.json();

      setCart(prev => {
        const existing = prev.find(item => item.productId === product.id);
        if (existing) {
          return prev.map(item =>
            item.productId === product.id
              ? { ...item, qty: item.qty + 1 }
              : item
          );
        }
        return [...prev, {
          productId: product.id,
          name: product.name,
          price: product.price,
          barcode: product.barcode,
          qty: 1,
          discount: 0,
        }];
      });

      showToast(`✅ ${product.name} — ₹${product.price}`);
    } catch {
      showToast('❌ Scanner error', 'error');
    }
  }

  function updateQty(productId, delta) {
    setCart(prev =>
      prev
        .map(item =>
          item.productId === productId
            ? { ...item, qty: Math.max(0, item.qty + delta) }
            : item
        )
        .filter(item => item.qty > 0)
    );
  }

  function updateDiscount(productId, discount) {
    const val = Math.min(100, Math.max(0, parseFloat(discount) || 0));
    setCart(prev =>
      prev.map(item =>
        item.productId === productId ? { ...item, discount: val } : item
      )
    );
  }

  function removeItem(productId) {
    setCart(prev => prev.filter(item => item.productId !== productId));
  }

  function clearCart() {
    setCart([]);
    setShowPayment(false);
    setShowReceipt(false);
    setCompletedSale(null);
    setCustomerPhone('');
    setCustomerName('');
    setPaymentMethod('UPI');
    setCashReceived('');
    scanInputRef.current?.focus();
  }

  async function handlePaymentConfirmed() {
    try {
      const saleData = {
        items: cart.map(item => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          qty: item.qty,
          discount: item.discount,
        })),
        subtotal,
        discount_total: discountTotal,
        grand_total: grandTotal,
        payment_method: paymentMethod,
        customer_phone: customerPhone,
        customer_name: customerName,
      };

      const res = await fetch(`${API}/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record sale');
      }

      setCompletedSale(data);
      setShowPayment(false);
      setShowReceipt(true);
      showToast('💰 Payment recorded!');
    } catch (err) {
      showToast(`❌ ${err.message}`, 'error');
    }
  }

  function generateReceiptText() {
    if (!completedSale) return '';
    const items = completedSale.items || cart;
    const date = new Date(completedSale.created_at || Date.now());
    const dateStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    let text = `🧾 *${settings?.shopName || 'QuickSell'}*\n`;
    if (completedSale.customer_name) {
      text += `👤 Customer: ${completedSale.customer_name}\n`;
    }
    if (completedSale.customer_phone) {
      text += `📱 Phone: ${completedSale.customer_phone}\n`;
    }
    text += `📅 ${dateStr} | ${timeStr}\n`;
    text += `━━━━━━━━━━━━━━━━\n`;

    items.forEach(item => {
      const total = item.price * item.qty;
      const disc = item.discount ? ` (-${item.discount}%)` : '';
      text += `▪ ${item.name} x${item.qty} — ₹${total.toFixed(0)}${disc}\n`;
    });

    text += `━━━━━━━━━━━━━━━━\n`;
    if (completedSale.discount_total > 0) {
      text += `Discount: -₹${completedSale.discount_total.toFixed(0)}\n`;
    }
    text += `*Total: ₹${completedSale.grand_total.toFixed(0)}*\n`;
    text += `✅ Paid via ${completedSale.payment_method || 'UPI'}\n`;
    text += `\nThank you for shopping! 🙏`;

    return text;
  }

  function sendWhatsApp() {
    const text = generateReceiptText();
    const phone = customerPhone.replace(/\D/g, '');
    const phoneWithCountry = phone.startsWith('91') ? phone : `91${phone}`;
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }

  // ---- Receipt View ----
  if (showReceipt && completedSale) {
    const items = completedSale.items || [];
    const saleDate = new Date(completedSale.created_at || Date.now());

    return (
      <div className="animate-in">
        <div className="page-header">
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={28} color="var(--primary-500)" /> Receipt
          </h2>
          <p className="page-subtitle">Sale completed successfully!</p>
        </div>

        <div className="checkout-success-card">
          {/* Left: Receipt Preview (Thermal Ticket Style) */}
          <div className="checkout-success-receipt-pane print-area">
            <div className="receipt" style={{ margin: 0, padding: 'var(--space-5)', width: '100%', maxWidth: 330, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', animation: 'fadeInUp 0.4s ease' }}>
              <div className="receipt-header" style={{ borderBottom: '1.5px dashed #e5e7eb' }}>
                <div className="receipt-shop-name">{settings?.shopName || 'QuickSell'}</div>
                {settings?.phone && (
                  <div style={{ fontSize: 'var(--fs-xs)', color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 4 }}>
                    <Phone size={11} /> {settings.phone}
                  </div>
                )}
                <div className="receipt-date">
                  {saleDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} &nbsp;
                  {saleDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </div>
                {(completedSale.customer_name || completedSale.customer_phone) && (
                  <div style={{
                    marginTop: 10,
                    padding: '8px 0',
                    borderTop: '1.5px dashed #e5e7eb',
                    borderBottom: '1.5px dashed #e5e7eb',
                    fontSize: 'var(--fs-xs)',
                    color: 'var(--text-secondary)',
                    textAlign: 'left'
                  }}>
                    {completedSale.customer_name && <div><strong>Customer:</strong> {completedSale.customer_name}</div>}
                    {completedSale.customer_phone && <div><strong>Phone:</strong> {completedSale.customer_phone}</div>}
                  </div>
                )}
              </div>

              <div className="receipt-items" style={{ borderBottom: '1.5px dashed #e5e7eb' }}>
                {items.map((item, i) => {
                  const lineTotal = item.price * item.qty;
                  const discountAmt = (lineTotal * (item.discount || 0)) / 100;
                  return (
                    <div key={i}>
                      <div className="receipt-item" style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)', padding: 'var(--space-2) 0', borderBottom: '1px dashed #f3f4f6' }}>
                        <span style={{ flex: 1, wordBreak: 'break-word', textAlign: 'left', color: 'var(--text-primary)' }}>{item.name} × {item.qty}</span>
                        <span style={{ fontWeight: 700, flexShrink: 0, textAlign: 'right', color: 'var(--text-primary)' }}>₹{lineTotal.toFixed(0)}</span>
                      </div>
                      {item.discount > 0 && (
                        <div className="receipt-item" style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)', padding: '2px 0', fontSize: 'var(--fs-xs)', color: 'var(--danger-500)' }}>
                          <span style={{ flex: 1, paddingLeft: 12, textAlign: 'left' }}>Discount ({item.discount}%)</span>
                          <span style={{ fontWeight: 600, flexShrink: 0, textAlign: 'right' }}>-₹{discountAmt.toFixed(0)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {completedSale.discount_total > 0 && (
                <div className="receipt-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: 'var(--danger-500)', fontWeight: 600 }}>
                  <span>Total Discount</span>
                  <span>-₹{completedSale.discount_total.toFixed(0)}</span>
                </div>
              )}

              <div className="receipt-total" style={{ marginTop: 8 }}>
                Total: ₹{completedSale.grand_total.toFixed(0)}
              </div>

              <div className="receipt-footer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, borderTop: '1.5px dashed #e5e7eb', marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--success-500)', fontWeight: 600 }}>
                  <CheckCircle size={14} /> Paid via {completedSale.payment_method || 'UPI'}
                </div>
                <div>Thank you for shopping!</div>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="checkout-success-actions-pane">
            <h3 style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Smartphone size={20} color="var(--primary-500)" /> Share Receipt
            </h3>

            <div className="form-group">
              <label className="form-label" htmlFor="bill-customer-phone">Customer WhatsApp Number (Optional)</label>
              <input
                id="bill-customer-phone"
                className="form-input"
                type="tel"
                placeholder="e.g. 9876543210"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
              />
            </div>

            <button
              className="btn btn-whatsapp btn-lg btn-block"
              onClick={sendWhatsApp}
              disabled={!customerPhone.trim()}
              id="bill-whatsapp-btn"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Send size={18} /> Send on WhatsApp
            </button>

            <button
              className="btn btn-ghost btn-block"
              onClick={() => window.print()}
              id="bill-print-btn"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: -4 }}
            >
              <FileText size={16} /> Print Receipt
            </button>

            <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: 'var(--space-2) 0' }} />

            <button className="btn btn-primary btn-lg btn-block" onClick={clearCart} id="bill-new-sale-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <ShoppingCart size={18} /> New Sale
            </button>
          </div>
        </div>

        {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
      </div>
    );
  }

  // ---- Payment View ----
  if (showPayment) {
    return (
      <div className="animate-in">
        <div className="page-header">
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CreditCard size={28} color="var(--primary-500)" /> Payment
          </h2>
          <p className="page-subtitle">
            {paymentMethod === 'UPI' ? 'Customer scans QR to pay via UPI' : 'Collect cash from the customer and return any change'}
          </p>
        </div>

        <div className="glass-card" style={{ maxWidth: 500, margin: '0 auto', overflow: 'hidden' }}>
          <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Amount to Pay</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 'var(--space-5)' }}>₹{grandTotal.toFixed(0)}</div>

            {/* Payment Method Selector */}
            <div style={{ display: 'flex', width: '100%', gap: 8, marginBottom: 'var(--space-6)', background: 'var(--bg-surface)', padding: 4, borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
              <button
                className="btn btn-block"
                onClick={() => setPaymentMethod('UPI')}
                style={{
                  flex: 1,
                  background: paymentMethod === 'UPI' ? 'var(--primary-500)' : 'transparent',
                  color: paymentMethod === 'UPI' ? 'white' : 'var(--text-secondary)',
                  border: 'none',
                  boxShadow: paymentMethod === 'UPI' ? '0 2px 8px var(--primary-glow)' : 'none',
                  padding: '10px',
                  fontWeight: 600,
                  fontSize: 'var(--fs-sm)',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'all var(--duration-fast) var(--ease-out)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <Smartphone size={16} /> UPI
              </button>
              <button
                className="btn btn-block"
                onClick={() => setPaymentMethod('Cash')}
                style={{
                  flex: 1,
                  background: paymentMethod === 'Cash' ? 'var(--primary-500)' : 'transparent',
                  color: paymentMethod === 'Cash' ? 'white' : 'var(--text-secondary)',
                  border: 'none',
                  boxShadow: paymentMethod === 'Cash' ? '0 2px 8px var(--primary-glow)' : 'none',
                  padding: '10px',
                  fontWeight: 600,
                  fontSize: 'var(--fs-sm)',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'all var(--duration-fast) var(--ease-out)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <CreditCard size={16} /> Cash
              </button>
            </div>

            {/* Dynamic UI based on chosen payment method */}
            {paymentMethod === 'UPI' ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginBottom: 'var(--space-4)' }}>
                {qrDataUrl ? (
                  <div style={{ border: '1.5px solid var(--glass-border)', padding: 12, borderRadius: 'var(--radius-md)', background: 'white', display: 'inline-flex', marginBottom: 'var(--space-3)', boxShadow: 'var(--shadow-sm)' }}>
                    <img src={qrDataUrl} alt="UPI QR Code" width={220} height={220} />
                  </div>
                ) : (
                  <p className="text-muted" style={{ padding: 'var(--space-6) 0' }}>Generating QR code...</p>
                )}
                {settings?.upiId ? (
                  <p className="text-secondary" style={{ fontSize: 'var(--fs-sm)', textAlign: 'center' }}>
                    Scan QR with any UPI app • <strong style={{ color: 'var(--text-primary)' }}>{settings.upiId}</strong>
                  </p>
                ) : (
                  <p className="text-muted" style={{ fontSize: 'var(--fs-xs)', color: 'var(--danger-500)', textAlign: 'center' }}>
                    ⚠️ UPI ID not set in Settings! Please set up UPI in Settings.
                  </p>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 'var(--fs-xs)', marginBottom: 4 }}>Cash Received (₹)</label>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="Enter amount customer gave..."
                    value={cashReceived}
                    onChange={e => setCashReceived(e.target.value)}
                    style={{ fontSize: 'var(--fs-lg)', textAlign: 'center', fontWeight: 700, padding: '10px 14px' }}
                  />
                </div>
                {cashReceived && parseFloat(cashReceived) >= grandTotal && (
                  <div style={{
                    padding: 'var(--space-3) var(--space-4)',
                    background: 'var(--success-50)',
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px dashed var(--success-400)',
                    textAlign: 'center',
                    animation: 'fadeIn var(--duration-normal) var(--ease-out)'
                  }}>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--success-600)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Change to Return</div>
                    <div style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--success-600)', marginTop: 2 }}>
                      ₹{(parseFloat(cashReceived) - grandTotal).toFixed(0)}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="form-group" style={{ width: '100%' }}>
              <label className="form-label" htmlFor="pay-customer-phone">Customer Phone (Optional)</label>
              <input
                id="pay-customer-phone"
                className="form-input"
                type="tel"
                placeholder="e.g. 9876543210"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
              />
            </div>

            <button
              className="btn btn-success btn-lg btn-block"
              onClick={handlePaymentConfirmed}
              id="pay-confirm-btn"
              style={{ fontSize: 'var(--fs-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 'var(--space-2)' }}
            >
              <CheckCircle size={20} strokeWidth={2.5} /> Payment Received
            </button>

            <button
              className="btn btn-ghost"
              onClick={() => setShowPayment(false)}
              id="pay-back-btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 'var(--space-3)' }}
            >
              <ArrowLeft size={16} /> Back to Cart
            </button>
          </div>
        </div>

        {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
      </div>
    );
  }

  // ---- Main Billing View ----
  return (
    <div className="animate-in">
      <div className="page-header">
        <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShoppingCart size={28} color="var(--primary-500)" /> Billing
        </h2>
        <p className="page-subtitle">Scan barcodes to add items • Apply discounts • Collect payment</p>
      </div>

      <div className="split-layout" style={{ position: 'relative' }}>
        {isLocked && (
          <div style={{
            position: 'absolute',
            inset: -16,
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(10px)',
            borderRadius: 'var(--radius-xl)',
            zIndex: 900,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-6)',
            textAlign: 'center',
            animation: 'fadeIn var(--duration-normal) var(--ease-out)'
          }}>
            <div className="glass-card" style={{ maxWidth: 460, padding: 'var(--space-8)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)', boxShadow: 'var(--shadow-lg)', border: '1.5px solid var(--danger-500)' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(244, 63, 94, 0.1)', color: 'var(--danger-500)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: 4
              }}>
                🔒
              </div>
              <h3 style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>POS Checkout Locked</h3>
              <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Your QuickSell subscription is currently inactive or suspended. Please contact the system administrator to renew or reactivate your cashier registers.
              </p>
              {settings?.licenseKey && (
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                  License: {settings.licenseKey}
                </div>
              )}
              <button
                className="btn btn-primary"
                onClick={() => navigate('/setup')}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 'var(--space-2)' }}
              >
                Go to Settings to Renew
              </button>
            </div>
          </div>
        )}

        {/* Left — Scanner + Cart Items */}
        <div>
          {/* Scanner Status Indicator */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, padding: '0 4px' }}>
            <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: isLocked ? 'var(--danger-500)' : 'var(--success-500)', display: 'inline-block',
                boxShadow: `0 0 8px ${isLocked ? 'var(--danger-500)' : 'var(--success-500)'}`,
              }}></span>
              {isLocked ? 'BARCODE READER LOCKED' : 'BARCODE READER ACTIVE'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {isLocked ? 'Subscription issue detected' : 'Auto-focus kept on search box'}
            </span>
          </div>

          {/* Scanner Input */}
          <div className="scanner-input-wrapper" style={{ display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span className="scanner-input-icon" style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                <Search size={20} strokeWidth={1.8} />
              </span>
              <input
                ref={scanInputRef}
                className={`scanner-input ${cart.length === 0 && !isLocked ? 'scan-pulse' : ''}`}
                type="text"
                placeholder={isLocked ? "Checkouts locked. See Settings..." : "Scan barcode or type code..."}
                value={scanInput}
                onChange={e => setScanInput(e.target.value)}
                onKeyDown={handleScan}
                id="bill-scanner-input"
                disabled={isLocked}
                autoFocus={!isLocked}
                style={{ paddingLeft: '40px', width: '100%' }}
              />
            </div>
            <button 
              className="btn btn-primary" 
              disabled={!scanInput.trim() || isLocked}
              onClick={() => handleScan({ key: 'Enter' })}
              style={{ padding: '0 20px' }}
            >
              Add
            </button>
          </div>

          {/* Cart Items */}
          {cart.length === 0 ? (
            <div className="glass-card">
              <div className="empty-state">
                <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-3)' }}>
                  <ShoppingCart size={48} strokeWidth={1.2} color="var(--text-muted)" />
                </div>
                <div className="empty-state-text">Cart is empty</div>
                <div className="empty-state-hint">Point the scanner at a barcode label to begin</div>
              </div>
            </div>
          ) : (
            <div className="glass-card" style={{ overflow: 'hidden' }}>
              {cart.map((item, idx) => {
                const lineTotal = item.price * item.qty;
                const discountAmt = (lineTotal * (item.discount || 0)) / 100;
                const afterDiscount = lineTotal - discountAmt;

                return (
                  <div key={item.productId} className="cart-item" style={{ animationDelay: `${idx * 50}ms` }}>
                    <div className="cart-item-info">
                      <div className="cart-item-name">{item.name}</div>
                      <div className="cart-item-price">
                        ₹{item.price.toFixed(0)} each
                        {item.discount > 0 && (
                          <span style={{ color: 'var(--warning-400)', marginLeft: 8 }}>
                            -{item.discount}% = ₹{afterDiscount.toFixed(0)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="cart-item-actions">
                      {/* Discount */}
                      <div className="discount-input-wrapper">
                        <input
                          className="discount-input"
                          type="number"
                          min="0"
                          max="100"
                          placeholder="%"
                          value={item.discount || ''}
                          onChange={e => updateDiscount(item.productId, e.target.value)}
                          title="Discount %"
                        />
                        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>%</span>
                      </div>

                      {/* Quantity */}
                      <div className="qty-control">
                        <button className="qty-btn" onClick={() => updateQty(item.productId, -1)}>−</button>
                        <span className="qty-value">{item.qty}</span>
                        <button className="qty-btn" onClick={() => updateQty(item.productId, 1)}>+</button>
                      </div>

                      {/* Remove */}
                      <button
                        className="btn btn-ghost btn-icon"
                        onClick={() => removeItem(item.productId)}
                        title="Remove item"
                        style={{ color: 'var(--danger-500)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right — Totals & Customer Details */}
        <div className="glass-card" style={{ position: 'sticky', top: 'var(--space-8)' }}>
          <div className="card-padding" style={{ borderBottom: '1px solid var(--glass-border)' }}>
            <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 700, marginBottom: 'var(--space-3)', color: 'var(--text-secondary)' }}>
              Customer Details
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 'var(--fs-xs)', marginBottom: 4 }}>Customer Name (Optional)</label>
                <input
                  id="bill-customer-name"
                  className="form-input"
                  type="text"
                  placeholder="e.g. Rajesh Kumar"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  style={{ padding: '8px 12px', fontSize: 'var(--fs-sm)' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 'var(--fs-xs)', marginBottom: 4 }}>Phone Number (Optional)</label>
                <input
                  id="bill-customer-phone"
                  className="form-input"
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  style={{ padding: '8px 12px', fontSize: 'var(--fs-sm)' }}
                />
              </div>
            </div>
          </div>

          <div className="card-padding">
            <h3 style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, marginBottom: 'var(--space-5)' }}>
              Order Summary
            </h3>

            <div className="cart-total-row">
              <span>Items</span>
              <span>{cart.reduce((s, i) => s + i.qty, 0)}</span>
            </div>

            <div className="cart-total-row">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(0)}</span>
            </div>

            {discountTotal > 0 && (
              <div className="cart-total-row" style={{ color: 'var(--warning-400)' }}>
                <span>Discount</span>
                <span>-₹{discountTotal.toFixed(0)}</span>
              </div>
            )}

            <div className="cart-total-row grand">
              <span>Total</span>
              <span style={{ color: 'var(--success-400)' }}>₹{grandTotal.toFixed(0)}</span>
            </div>
          </div>

          <div style={{ padding: '0 var(--space-5) var(--space-5)' }}>
            <button
              className="btn btn-success btn-lg btn-block"
              disabled={cart.length === 0}
              onClick={() => setShowPayment(true)}
              id="bill-proceed-pay-btn"
              style={{ marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <CreditCard size={18} /> Proceed to Pay
            </button>

            <button
              className="btn btn-ghost btn-block"
              onClick={clearCart}
              disabled={cart.length === 0}
              id="bill-clear-btn"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--danger-500)' }}
            >
              <Trash2 size={16} /> Clear Cart
            </button>
          </div>
        </div>
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
