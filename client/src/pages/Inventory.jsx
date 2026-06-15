import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import JsBarcode from 'jsbarcode';
import Tesseract from 'tesseract.js';
import { Package, Zap, ScanLine, Upload, Printer, Trash2, Search, Check, CheckCircle, AlertTriangle, RefreshCw, Lock, X, Plus, FileText, Tag } from 'lucide-react';

const API = '/api';

const CATEGORY_ICONS = {
  'T-Shirt': (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 3h12l3 5-3 2-1-1v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9L6 10 3 8z" />
    </svg>
  ),
  'Shirt': (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 3h12l3 5-3 2-1-1v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9L6 10 3 8z" />
      <path d="M12 7v14M9 3l3 4 3-4" />
    </svg>
  ),
  'Jeans': (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 3h8l2 17a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-8h-2v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <path d="M8 3v5M16 3v5M8 6h8" />
    </svg>
  ),
  'Trousers': (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 3h8l1 17a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-9h-2v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
    </svg>
  ),
  'Jacket': (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 3h12l2 6-2 1v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V10L4 9z" />
      <path d="M12 3v18M9 3l4 6 4-6" />
    </svg>
  ),
  'Kurta': (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 3h8l2 8-2 2v8a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-8l-2-2z" />
      <path d="M12 3v5M10 3l2 2 2-2" />
    </svg>
  ),
  'Saree': (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 4h12l2 6-4 12H6z" />
      <path d="M6 10s4-2 6 0 4 2 6 0M8 4l8 12" />
    </svg>
  ),
  'Dress': (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3L6 9l-2 12h16L18 9z" />
      <path d="M9 3c1.5 2 4.5 2 6 0" />
    </svg>
  ),
  'Hoodie': (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 5h12l3 5-3 2-1-1v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V11L6 12 3 10z" />
      <path d="M10 5s1-3 2-3 2 3 2 3" />
      <path d="M12 12v6M9 18h6" />
    </svg>
  ),
  'Shorts': (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 3h12l1 9a1 1 0 0 1-1 1h-3v-2h-2v2H9a1 1 0 0 1-1-1z" />
    </svg>
  ),
  'Sweater': (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 4h12l2 5-2 2v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V11L4 9z" />
      <path d="M6 8h12M6 12h12M6 16h12" />
    </svg>
  ),
  'Lehenga': (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 4L6 10l-4 11h20L18 10z" />
      <path d="M4 18h18M8 14h8" />
    </svg>
  ),
};

const CATEGORIES = [
  { name: 'T-Shirt', iconKey: 'T-Shirt' },
  { name: 'Shirt', iconKey: 'Shirt' },
  { name: 'Jeans', iconKey: 'Jeans' },
  { name: 'Trousers', iconKey: 'Trousers' },
  { name: 'Jacket', iconKey: 'Jacket' },
  { name: 'Kurta', iconKey: 'Kurta' },
  { name: 'Saree', iconKey: 'Saree' },
  { name: 'Dress', iconKey: 'Dress' },
  { name: 'Hoodie', iconKey: 'Hoodie' },
  { name: 'Shorts', iconKey: 'Shorts' },
  { name: 'Sweater', iconKey: 'Sweater' },
  { name: 'Lehenga', iconKey: 'Lehenga' },
];

// Parse OCR result (with word-level confidence) to extract line items
function parseBillResult(ocrData) {
  const lines = ocrData.lines || [];
  const items = [];

  for (const line of lines) {
    const lineText = line.text.trim();
    if (!lineText) continue;

    // Compute average confidence for this line's words
    const wordConfs = (line.words || []).map(w => w.confidence);
    const lineConfidence = wordConfs.length > 0
      ? Math.round(wordConfs.reduce((a, b) => a + b, 0) / wordConfs.length)
      : 0;

    // Extract numbers from the line
    const numbers = [];
    const numberPattern = /(\d+(?:[.,]\d{1,2})?)/g;
    let match;
    while ((match = numberPattern.exec(lineText)) !== null) {
      // Find the confidence of the word containing this number
      const numStr = match[1];
      const numWord = (line.words || []).find(w => w.text.includes(numStr));
      const conf = numWord ? numWord.confidence : lineConfidence;
      numbers.push({ value: parseFloat(numStr.replace(',', '')), index: match.index, confidence: conf });
    }

    if (numbers.length === 0) continue;

    // Get name text (everything before the first number)
    let name = lineText.substring(0, numbers[0].index).trim();
    name = name.replace(/^[\-\.\*\#\|\[\]]+/, '').replace(/[\-\.\*\#\|\[\]]+$/, '').trim();

    const lowerName = name.toLowerCase();
    if (name.length < 2) continue;
    if (/^(total|sub\s*total|subtotal|grand|tax|gst|cgst|sgst|igst|discount|amount|qty|quantity|rate|price|s\.?no|sr|sl|hsn|sac|bill|invoice|date|time|no\.|cash|upi|net|gross|round|mr|ms|ph|mob|addr)/i.test(lowerName)) continue;

    // Determine qty and price
    let qty = 1;
    let price = 0;
    let priceConfidence = 0;

    if (numbers.length >= 3) {
      qty = Math.max(1, Math.round(numbers[0].value));
      price = numbers[1].value;
      priceConfidence = numbers[1].confidence;
    } else if (numbers.length === 2) {
      if (numbers[0].value <= 100 && numbers[1].value > numbers[0].value) {
        qty = Math.max(1, Math.round(numbers[0].value));
        price = numbers[1].value;
        priceConfidence = numbers[1].confidence;
      } else {
        price = numbers[0].value;
        priceConfidence = numbers[0].confidence;
        if (numbers[1].value > price && price > 0) {
          const impliedQty = Math.round(numbers[1].value / price);
          if (impliedQty > 0 && impliedQty <= 100) qty = impliedQty;
        }
      }
    } else {
      price = numbers[0].value;
      priceConfidence = numbers[0].confidence;
    }

    if (price <= 0 || price > 100000) continue;
    if (qty <= 0 || qty > 500) continue;

    items.push({
      name,
      price: Math.round(price),
      qty,
      selected: true,
      verified: false,  // MUST be verified by user before adding
      confidence: lineConfidence,
      priceConfidence: Math.round(priceConfidence),
      rawLine: lineText,
    });
  }

  return items;
}

export default function Inventory({ settings }) {
  const navigate = useNavigate();
  const licenseStatus = settings?.licenseStatus || 'unlicensed';
  const isLocked = licenseStatus !== 'active';

  const [tab, setTab] = useState('quick');       // 'quick' | 'scan'
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Quick Add state
  const [selectedCategory, setSelectedCategory] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [printQueue, setPrintQueue] = useState([]);
  const [adding, setAdding] = useState(false);
  const barcodeRefs = useRef({});
  const priceInputRef = useRef(null);

  // Bill Scanner state
  const [billImage, setBillImage] = useState(null);
  const [billPreview, setBillPreview] = useState('');
  const [scanning, setScanning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState('');
  const [extractedItems, setExtractedItems] = useState([]);
  const [dragover, setDragover] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { fetchProducts(); }, []);

  useEffect(() => {
    if (printQueue.length > 0) {
      printQueue.forEach(p => {
        const el = barcodeRefs.current[p.id];
        if (el) {
          try {
            JsBarcode(el, p.barcode, {
              format: 'CODE128', width: 1.8, height: 50,
              displayValue: true, fontSize: 11, font: 'Inter',
              margin: 6, background: 'transparent', lineColor: '#111',
            });
          } catch { /* ignore */ }
        }
      });
    }
  }, [printQueue]);

  function clearPrintQueue() {
    setPrintQueue([]);
  }

  function removeFromPrintQueue(id) {
    setPrintQueue(prev => prev.filter(p => p.id !== id));
  }

  async function fetchProducts() {
    try {
      const res = await fetch(`${API}/products${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      setProducts(await res.json());
    } catch { /* ignore */ }
  }

  useEffect(() => {
    const t = setTimeout(fetchProducts, 300);
    return () => clearTimeout(t);
  }, [search]);

  // ===================== QUICK ADD =====================

  function handleCategoryClick(cat) {
    setSelectedCategory(cat);
    setTimeout(() => priceInputRef.current?.focus(), 50);
  }

  async function handleQuickAdd() {
    if (!selectedCategory || !price) return;
    setAdding(true);
    const qty = Math.max(1, parseInt(quantity) || 1);

    try {
      if (qty === 1) {
        const res = await fetch(`${API}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: selectedCategory, price: parseFloat(price), category: selectedCategory }),
        });
        const product = await res.json();
        setPrintQueue(prev => [...prev, product]);
        showToast(`✅ ${selectedCategory} added!`);
      } else {
        const res = await fetch(`${API}/products/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: selectedCategory, price: parseFloat(price), quantity: qty }),
        });
        const data = await res.json();
        setPrintQueue(prev => [...prev, ...(data.products || [])]);
        showToast(`✅ ${data.count}× ${selectedCategory} added!`);
      }
      setPrice('');
      setQuantity('1');
      setSelectedCategory('');
      fetchProducts();
    } catch {
      showToast('❌ Failed to add', 'error');
    } finally {
      setAdding(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleQuickAdd();
  }

  // ===================== BILL SCANNER =====================

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) loadBillImage(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragover(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadBillImage(file);
  }

  function loadBillImage(file) {
    if (!file.type.startsWith('image/')) {
      showToast('❌ Please upload an image', 'error');
      return;
    }
    setBillImage(file);
    setBillPreview(URL.createObjectURL(file));
    setExtractedItems([]);
  }

  async function runOCR() {
    if (!billImage) return;
    setScanning(true);
    setOcrProgress(0);
    setOcrStatus('Loading OCR engine...');
    setExtractedItems([]);

    try {
      const result = await Tesseract.recognize(billImage, 'eng+hin', {
        logger: m => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
            setOcrStatus('Reading bill...');
          } else if (m.status === 'loading language traineddata') {
            setOcrStatus('Loading language data...');
            setOcrProgress(Math.round(m.progress * 50));
          } else {
            setOcrStatus(m.status);
          }
        },
      });

      const items = parseBillResult(result.data);

      if (items.length === 0) {
        showToast('⚠️ No items detected — try a clearer photo', 'error');
        setOcrStatus('No items found. Try a clearer image.');
      } else {
        setExtractedItems(items);
        const avgConf = Math.round(items.reduce((s, i) => s + i.confidence, 0) / items.length);
        setOcrStatus(`Found ${items.length} items (avg. confidence: ${avgConf}%)`);
        showToast(`📋 Found ${items.length} items — verify prices before adding!`);
      }
    } catch (err) {
      console.error('OCR error:', err);
      showToast('❌ OCR failed', 'error');
      setOcrStatus('Error — try again');
    } finally {
      setScanning(false);
    }
  }

  function updateExtractedItem(index, field, value) {
    setExtractedItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      if (field === 'selected' || field === 'verified') return { ...item, [field]: value };
      if (field === 'name') return { ...item, name: value };
      // If user edits price, mark as verified (they've looked at it)
      if (field === 'price') return { ...item, price: parseFloat(value) || 0, verified: true };
      return { ...item, [field]: parseFloat(value) || 0 };
    }));
  }

  function verifyItem(index) {
    setExtractedItems(prev => prev.map((item, i) =>
      i === index ? { ...item, verified: true } : item
    ));
  }

  function verifyAll() {
    setExtractedItems(prev => prev.map(item => ({ ...item, verified: true })));
  }

  function removeExtractedItem(index) {
    setExtractedItems(prev => prev.filter((_, i) => i !== index));
  }

  async function addExtractedItems() {
    const selected = extractedItems.filter(i => i.selected && i.name && i.price > 0);
    if (selected.length === 0) {
      showToast('⚠️ No items selected', 'error');
      return;
    }
    const unverified = selected.filter(i => !i.verified);
    if (unverified.length > 0) {
      showToast(`⚠️ ${unverified.length} item(s) have unverified prices!`, 'error');
      return;
    }

    setAdding(true);
    let totalAdded = 0;
    const allProducts = [];

    try {
      for (const item of selected) {
        const qty = Math.max(1, item.qty || 1);
        if (qty === 1) {
          const res = await fetch(`${API}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: item.name, price: item.price, category: '' }),
          });
          const p = await res.json();
          allProducts.push(p);
          totalAdded += 1;
        } else {
          const res = await fetch(`${API}/products/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: item.name, price: item.price, quantity: qty }),
          });
          const data = await res.json();
          allProducts.push(...(data.products || []));
          totalAdded += data.count || qty;
        }
      }

      setPrintQueue(prev => [...prev, ...allProducts]);
      showToast(`✅ ${totalAdded} products added from bill!`);
      setExtractedItems([]);
      setBillImage(null);
      setBillPreview('');
      setTab('quick'); // Switch to quick tab to show barcodes
      fetchProducts();
    } catch {
      showToast('❌ Failed to add items', 'error');
    } finally {
      setAdding(false);
    }
  }

  function resetScanner() {
    setBillImage(null);
    setBillPreview('');
    setExtractedItems([]);
    setOcrProgress(0);
    setOcrStatus('');
    setScanning(false);
  }

  // ===================== SHARED =====================

  function requestDelete(id, name) {
    setItemToDelete({ id, name });
  }

  async function confirmDelete() {
    if (!itemToDelete) return;
    try {
      await fetch(`${API}/products/${itemToDelete.id}`, { method: 'DELETE' });
      fetchProducts();
      showToast(`🗑️ Removed`);
    } catch {
      showToast('❌ Failed', 'error');
    } finally {
      setItemToDelete(null);
    }
  }

  function handlePrintAll() {
    if (!printQueue.length) return;
    const labels = printQueue.map(p => {
      const el = barcodeRefs.current[p.id];
      const svg = el?.outerHTML || '';
      return `<div class="label"><div class="label-name">${p.name}</div>${svg}<div class="label-price">₹${p.price.toFixed(0)}</div></div>`;
    }).join('');
    const printWin = window.open('', '_blank', 'width=600,height=800');
    printWin.document.write(`<!DOCTYPE html><html><head><title>Labels</title><style>body{margin:0;padding:8mm;font-family:'Inter',sans-serif;display:flex;flex-wrap:wrap;gap:4mm}.label{border:1px dashed #ccc;padding:3mm;text-align:center;page-break-inside:avoid}.label-name{font-size:12px;font-weight:700;margin-bottom:2px}.label-price{font-size:16px;font-weight:800;margin-top:2px}svg{max-width:100%;height:auto}@media print{body{padding:2mm}.label{border:1px dotted #aaa}}</style></head><body>${labels}<script>window.onload=()=>{window.print();window.close()}<\/script></body></html>`);
    printWin.document.close();
  }

  function showToast(msg, type = 'success') {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="animate-in" style={{ position: 'relative' }}>
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
            <h3 style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>Inventory Locked</h3>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Your QuickSell subscription has expired or is suspended. Please renew your license key to manage products and supplier invoices.
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
      <div className="page-header">
        <h2 className="page-title"><Package size={28} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} /> Inventory</h2>
        <p className="page-subtitle">Add stock fast — tap & go, or scan a supplier bill</p>
      </div>

      <div className="inventory-grid">
        {/* Left Column — Add Methods */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

          {/* Tab Switcher */}
          <div className="inv-tabs">
            <button className={`inv-tab ${tab === 'quick' ? 'active' : ''}`} onClick={() => setTab('quick')} id="tab-quick">
              <Zap size={15} /> Quick Add
            </button>
            <button className={`inv-tab ${tab === 'scan' ? 'active' : ''}`} onClick={() => setTab('scan')} id="tab-scan">
              <ScanLine size={15} /> Scan Bill
            </button>
          </div>

          {/* =================== QUICK ADD TAB =================== */}
          {tab === 'quick' && (
            <>
              <div className="glass-card card-padding">
                <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 700, marginBottom: 'var(--space-4)', color: 'var(--text-secondary)' }}>
                  1. TAP CATEGORY
                </h3>
                <div className="category-grid">
                  {CATEGORIES.map(cat => {
                    const IconComponent = CATEGORY_ICONS[cat.iconKey];
                    return (
                      <button
                        key={cat.name}
                        className={`category-chip ${selectedCategory === cat.name ? 'active' : ''}`}
                        onClick={() => handleCategoryClick(cat.name)}
                      >
                        <span className="category-chip-icon">
                          {IconComponent ? <IconComponent width={18} height={18} /> : <Tag size={18} />}
                        </span>
                        <span>{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="glass-card card-padding">
                <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                  <div className="form-group" style={{ flex: 2 }}>
                    <label className="form-label">2. PRICE (₹)</label>
                    <input
                      ref={priceInputRef}
                      id="inv-price"
                      className="form-input form-input-lg"
                      type="number"
                      step="1"
                      min="0"
                      placeholder="499"
                      value={price}
                      onChange={e => setPrice(e.target.value)}
                      onKeyDown={handleKeyDown}
                      style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800, textAlign: 'center' }}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">3. QTY</label>
                    <input
                      id="inv-qty"
                      className="form-input form-input-lg"
                      type="number"
                      min="1"
                      max="500"
                      placeholder="1"
                      value={quantity}
                      onChange={e => setQuantity(e.target.value)}
                      onKeyDown={handleKeyDown}
                      style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800, textAlign: 'center' }}
                    />
                  </div>
                </div>

                <button
                  className="btn btn-primary btn-lg btn-block"
                  onClick={handleQuickAdd}
                  disabled={!selectedCategory || !price || adding}
                  id="inv-add-btn"
                  style={{ fontSize: 'var(--fs-lg)', padding: 'var(--space-4) var(--space-6)' }}
                >
                  {adding ? 'Adding...' : parseInt(quantity) > 1 ? `Add ${quantity}× ${selectedCategory || '...'}` : `Add ${selectedCategory || '...'}`}
                </button>

                {selectedCategory && (
                  <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)', background: 'rgba(99,102,241,0.08)', borderRadius: 'var(--radius-md)', fontSize: 'var(--fs-sm)', color: 'var(--primary-300)', textAlign: 'center', fontWeight: 500 }}>
                    {parseInt(quantity) > 1 ? `${quantity}× ${selectedCategory} at ₹${price || '___'} each → ${quantity} barcodes` : `1× ${selectedCategory} at ₹${price || '___'}`}
                  </div>
                )}
              </div>
            </>
          )}

          {/* =================== SCAN BILL TAB =================== */}
          {tab === 'scan' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <div className="glass-card card-padding">
                {!billImage ? (
                  <>
                    {/* Upload Zone */}
                    <div
                      className={`bill-upload-zone ${dragover ? 'dragover' : ''}`}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={e => { e.preventDefault(); setDragover(true); }}
                      onDragLeave={() => setDragover(false)}
                      onDrop={handleDrop}
                    >
                      <div className="bill-upload-icon" style={{ marginBottom: 'var(--space-2)' }}>
                        <FileText size={40} strokeWidth={1.5} color="var(--primary-400)" />
                      </div>
                      <div className="bill-upload-text">Upload Supplier Bill</div>
                      <div className="bill-upload-hint">
                        Tap to take photo or upload image • Drag & drop supported
                      </div>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                      id="bill-file-input"
                    />

                    {/* Accuracy Notice */}
                    <div style={{
                      marginTop: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)',
                      background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
                      borderRadius: 'var(--radius-md)', fontSize: 'var(--fs-sm)', color: 'var(--warning-500)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                      <span><strong>Prices will need manual verification.</strong> OCR can misread numbers. Every price must be confirmed before adding to inventory.</span>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Bill Preview + Controls */}
                    <div className="flex items-center justify-between mb-4">
                      <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FileText size={18} /> Bill Image
                      </h3>
                      <button className="btn btn-ghost btn-sm" onClick={resetScanner} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <X size={14} /> Clear
                      </button>
                    </div>

                    <img src={billPreview} alt="Supplier bill" className="bill-preview-img" />

                    {!scanning && extractedItems.length === 0 && (
                      <button
                        className="btn btn-primary btn-lg btn-block"
                        onClick={runOCR}
                        id="bill-extract-btn"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                      >
                        <Search size={18} /> Extract Items from Bill
                      </button>
                    )}

                    {scanning && (
                      <div className="ocr-progress">
                        <div className="ocr-progress-bar">
                          <div className="ocr-progress-fill" style={{ width: `${ocrProgress}%` }} />
                        </div>
                        <div className="ocr-status">{ocrStatus} — {ocrProgress}%</div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Extracted Items — Verification Panel */}
              {extractedItems.length > 0 && (
                <div className="glass-card card-padding animate-in">
                  {/* Header + Warning */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle size={20} color="var(--primary-400)" /> Review & Verify Prices
                    </h3>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <button className="btn btn-ghost btn-sm" onClick={runOCR} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <RefreshCw size={14} /> Re-scan
                      </button>
                    </div>
                  </div>

                  <div style={{
                    padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-4)',
                    background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
                    borderRadius: 'var(--radius-md)', fontSize: 'var(--fs-sm)', color: 'var(--warning-500)',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                    <span>CHECK EVERY PRICE against the bill image above. Tap ✓ to confirm each item, or edit the price directly.</span>
                  </div>

                  {/* Items Table */}
                  <div style={{ border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                    {/* Column Headers */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: '32px 1fr 110px 70px 70px 36px',
                      gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)',
                      background: 'var(--bg-surface)', borderBottom: '1px solid var(--glass-border)',
                      fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                    }}>
                      <div></div>
                      <div>Item Name</div>
                      <div style={{ textAlign: 'right' }}>Price ₹</div>
                      <div style={{ textAlign: 'center' }}>Qty</div>
                      <div style={{ textAlign: 'center' }}>Status</div>
                      <div></div>
                    </div>

                    {extractedItems.map((item, i) => {
                      const isLowConf = item.priceConfidence < 70;
                      const priceStyle = {
                        flex: 'none', width: 100, textAlign: 'right', fontWeight: 800,
                        fontSize: 'var(--fs-base)',
                        border: item.verified
                          ? '2px solid var(--success-500)'
                          : isLowConf
                            ? '2px solid var(--danger-500)'
                            : '2px solid var(--warning-500)',
                        background: item.verified
                          ? 'rgba(16,185,129,0.08)'
                          : isLowConf
                            ? 'rgba(244,63,94,0.08)'
                            : 'rgba(245,158,11,0.08)',
                        color: item.verified ? 'var(--success-400)' : 'var(--text-primary)',
                        borderRadius: 'var(--radius-sm)',
                        padding: 'var(--space-2) var(--space-3)',
                        fontFamily: 'var(--font-family)',
                        outline: 'none',
                      };

                      return (
                        <div key={i} style={{
                          display: 'grid', gridTemplateColumns: '32px 1fr 110px 70px 70px 36px',
                          gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)',
                          alignItems: 'center',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          opacity: item.selected ? 1 : 0.35,
                          transition: 'opacity 0.15s ease',
                        }}>
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={e => updateExtractedItem(i, 'selected', e.target.checked)}
                            style={{ width: 18, height: 18, accentColor: 'var(--primary-500)', cursor: 'pointer' }}
                          />

                          {/* Name */}
                          <input
                            className="extracted-input"
                            style={{ width: '100%' }}
                            value={item.name}
                            onChange={e => updateExtractedItem(i, 'name', e.target.value)}
                          />

                          {/* Price — highlighted for verification */}
                          <input
                            type="number"
                            style={priceStyle}
                            value={item.price}
                            onChange={e => updateExtractedItem(i, 'price', e.target.value)}
                            title={`Confidence: ${item.priceConfidence}%`}
                          />

                          {/* Qty */}
                          <input
                            className="extracted-input"
                            style={{ width: 60, textAlign: 'center' }}
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={e => updateExtractedItem(i, 'qty', e.target.value)}
                          />

                          {/* Verify Button */}
                          <div style={{ textAlign: 'center' }}>
                            {item.verified ? (
                              <Check size={18} strokeWidth={3} color="var(--success-500)" style={{ margin: '0 auto' }} />
                            ) : (
                              <button
                                className="btn btn-sm"
                                onClick={() => verifyItem(i)}
                                style={{
                                  background: 'rgba(245,158,11,0.12)', color: 'var(--warning-500)',
                                  border: '1px solid rgba(245,158,11,0.25)', padding: '4px 10px',
                                  fontSize: 'var(--fs-xs)', fontWeight: 700, borderRadius: 'var(--radius-sm)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 2
                                }}
                                title={`Confidence: ${item.priceConfidence}%`}
                              >
                                <Check size={12} strokeWidth={2.5} /> OK
                              </button>
                            )}
                          </div>

                          {/* Remove */}
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => removeExtractedItem(i)}
                            style={{ padding: '2px 6px', color: 'var(--danger-400)' }}
                          >✕</button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary + Actions */}
                  <div style={{ marginTop: 'var(--space-4)' }}>
                    {(() => {
                      const selected = extractedItems.filter(i => i.selected);
                      const verified = selected.filter(i => i.verified);
                      const unverified = selected.length - verified.length;
                      return (
                        <>
                          <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            marginBottom: 'var(--space-3)', padding: 'var(--space-2) 0',
                            fontSize: 'var(--fs-sm)',
                          }}>
                            <span style={{ color: 'var(--text-secondary)' }}>
                              {selected.length} selected · {verified.length} verified
                            </span>
                            {unverified > 0 && (
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={verifyAll}
                                style={{ color: 'var(--warning-500)', display: 'flex', alignItems: 'center', gap: 4 }}
                              >
                                <Check size={14} strokeWidth={2.5} /> Verify All Prices
                              </button>
                            )}
                          </div>

                          {unverified > 0 && (
                            <div style={{
                              padding: 'var(--space-2) var(--space-3)', marginBottom: 'var(--space-3)',
                              background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)',
                              borderRadius: 'var(--radius-sm)', fontSize: 'var(--fs-xs)',
                              color: 'var(--danger-500)', fontWeight: 600, textAlign: 'center',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                            }}>
                              <AlertTriangle size={14} />
                              <span>{unverified} unverified price{unverified > 1 ? 's' : ''} — confirm each price or click "Verify All"</span>
                            </div>
                          )}

                          <button
                            className="btn btn-success btn-lg btn-block"
                            onClick={addExtractedItems}
                            disabled={adding || selected.length === 0 || unverified > 0}
                            id="bill-add-all-btn"
                            style={{ opacity: unverified > 0 ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                          >
                            {adding ? (
                              <>⏳ Adding...</>
                            ) : unverified > 0 ? (
                              <><Lock size={16} /> Verify all prices first ({unverified} remaining)</>
                            ) : (
                              <><Check size={18} strokeWidth={2.5} /> Add {selected.length} Items to Inventory</>
                            )}
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Labels Ready Queue (shown in both tabs) */}
          {printQueue.length > 0 && (
            <div className="glass-card card-padding animate-in">
              <div className="flex items-center justify-between mb-4">
                <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Tag size={16} /> Labels Ready
                  <span className="badge badge-success" style={{ marginLeft: 8 }}>{printQueue.length}</span>
                </h3>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button className="btn btn-ghost btn-sm" onClick={clearPrintQueue} style={{ color: 'var(--danger-500)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Trash2 size={14} /> Clear Queue
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={handlePrintAll} id="inv-print-btn" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Printer size={14} /> Print All Labels
                  </button>
                </div>
              </div>
              <div className="barcode-scroll">
                {printQueue.map(p => (
                  <div key={p.id} className="barcode-mini-card" style={{ position: 'relative' }}>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => removeFromPrintQueue(p.id)}
                      style={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        color: 'var(--danger-400)',
                        padding: 2,
                        zIndex: 10,
                        width: 'auto',
                        height: 'auto'
                      }}
                      title="Remove label"
                    >
                      <X size={12} />
                    </button>
                    <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: '#333', textAlign: 'center', paddingRight: 12 }}>{p.name}</div>
                    <svg ref={el => { barcodeRefs.current[p.id] = el; }}></svg>
                    <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 800, color: '#111' }}>₹{p.price.toFixed(0)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column — Product List */}
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: 'var(--space-5) var(--space-5) 0' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontSize: 'var(--fs-lg)', fontWeight: 700 }}>
                All Products
                <span className="badge badge-primary" style={{ marginLeft: 8 }}>{products.length}</span>
              </h3>
            </div>
            <input
              className="form-input mb-4"
              type="text"
              placeholder="🔍 Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              id="inv-search"
            />
          </div>

          {products.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-3)' }}>
                <Package size={48} strokeWidth={1.2} color="var(--text-muted)" />
              </div>
              <div className="empty-state-text">No products yet</div>
              <div className="empty-state-hint">Select a category or scan a bill to get started</div>
            </div>
          ) : (
            <div style={{ maxHeight: 'calc(100vh - 240px)', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Barcode</th>
                    <th>Price</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td><span style={{ fontWeight: 600 }}>{p.name}</span></td>
                      <td><span className="font-mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>{p.barcode}</span></td>
                      <td><span style={{ fontWeight: 700, color: 'var(--success-400)' }}>₹{p.price.toFixed(0)}</span></td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => requestDelete(p.id, p.name)}
                          title="Remove item"
                          style={{ color: 'var(--danger-500)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: 400, padding: 'var(--space-6)', textAlign: 'center', animation: 'fadeInUp 0.2s ease-out' }}>
            <h3 style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Confirm Deletion</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
              Are you sure you want to remove "{itemToDelete.name}" from your inventory?
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setItemToDelete(null)}>Cancel</button>
              <button className="btn" style={{ flex: 1, background: 'var(--danger-500)', color: 'white', border: 'none' }} onClick={confirmDelete}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
