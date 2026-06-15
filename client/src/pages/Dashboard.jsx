import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import { BarChart3, DollarSign, Package, ShoppingCart, ShoppingBag, TrendingUp, Award, Clock, Download } from 'lucide-react';

const API = '/api';

export default function Dashboard({ settings }) {
  const navigate = useNavigate();
  const licenseStatus = settings?.licenseStatus || 'unlicensed';
  const isLocked = licenseStatus !== 'active';
  const [today, setToday] = useState({ revenue: 0, transactions: 0, itemsSold: 0 });
  const [monthly, setMonthly] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    fetchAll();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchAll() {
    try {
      const [todayRes, monthlyRes, topRes, salesRes] = await Promise.all([
        fetch(`${API}/dashboard/today`),
        fetch(`${API}/dashboard/monthly`),
        fetch(`${API}/dashboard/top-items?days=30`),
        fetch(`${API}/sales?limit=10`),
      ]);

      setToday(await todayRes.json());
      setMonthly(await monthlyRes.json());
      setTopItems(await topRes.json());
      setRecentSales(await salesRes.json());
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function downloadExcel() {
    try {
      const XLSX = await import('xlsx');
      const res = await fetch(`${API}/sales?limit=1000`);
      if (!res.ok) throw new Error('Failed to fetch sales');
      const sales = await res.json();

      if (!sales.length) {
        showToast('No sales data to export yet.', 'error');
        return;
      }

      const rows = sales.map(sale => {
        const dateStr = new Date(sale.created_at).toLocaleString('en-IN');
        const itemsStr = (sale.items || []).map(i => `${i.name} (x${i.qty} @ ₹${i.price})`).join('; ');

        return {
          'Sale ID': sale.id,
          'Date & Time': dateStr,
          'Customer Name': sale.customer_name || 'Walk-in',
          'Customer Phone': sale.customer_phone || '',
          'Items Detail': itemsStr,
          'Subtotal (INR)': sale.subtotal,
          'Discount (INR)': sale.discount_total || 0,
          'Grand Total (INR)': sale.grand_total,
          'Payment Method': sale.payment_method || 'UPI'
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);

      // Auto-width columns
      const colWidths = Object.keys(rows[0] || {}).map(key => ({
        wch: Math.max(key.length, ...rows.map(r => String(r[key] || '').length).slice(0, 50)) + 2
      }));
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales');
      XLSX.writeFile(workbook, `QuickSell_Sales_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error('Excel export error:', err);
      showToast('Failed to export Excel file. Please try again.', 'error');
    }
  }


  // Format chart data
  const chartData = monthly.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    revenue: d.revenue,
    transactions: d.transactions,
  }));

  const topItemsData = topItems.slice(0, 8).map(item => ({
    name: item.name.length > 15 ? item.name.slice(0, 15) + '…' : item.name,
    quantity: item.quantity,
    revenue: item.revenue,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 14px',
        fontSize: 'var(--fs-sm)',
      }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
        {payload.map((entry, i) => (
          <div key={i} style={{ color: entry.color, display: 'flex', gap: 8 }}>
            <span>{entry.name}:</span>
            <span style={{ fontWeight: 600 }}>
              {entry.name === 'revenue' ? `₹${entry.value.toFixed(0)}` : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="animate-in">
        <div className="page-header">
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BarChart3 size={28} color="var(--primary-500)" /> Dashboard
          </h2>
          <p className="page-subtitle">Loading analytics...</p>
        </div>
      </div>
    );
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
            <h3 style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>Analytics Locked</h3>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Your QuickSell subscription has expired or is suspended. Please renew your license key to access sales records, analytics dashboards, and export CSV data.
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
        <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BarChart3 size={28} color="var(--primary-500)" /> Dashboard
        </h2>
        <p className="page-subtitle">Real-time sales analytics and performance tracking</p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid stagger-children">
        <div className="glass-card kpi-card primary">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="kpi-label">Today's Revenue</div>
              <div className="kpi-value primary">₹{today.revenue.toLocaleString('en-IN')}</div>
            </div>
            <div className="kpi-icon-bubble" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-500)', padding: 8, borderRadius: 'var(--radius-md)', display: 'flex' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div className="kpi-sub" style={{ marginTop: 'var(--space-2)' }}>Total earnings today</div>
        </div>

        <div className="glass-card kpi-card success">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="kpi-label">Items Sold</div>
              <div className="kpi-value success">{today.itemsSold}</div>
            </div>
            <div className="kpi-icon-bubble" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-500)', padding: 8, borderRadius: 'var(--radius-md)', display: 'flex' }}>
              <Package size={20} />
            </div>
          </div>
          <div className="kpi-sub" style={{ marginTop: 'var(--space-2)' }}>Products sold today</div>
        </div>

        <div className="glass-card kpi-card warning">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="kpi-label">Transactions</div>
              <div className="kpi-value warning">{today.transactions}</div>
            </div>
            <div className="kpi-icon-bubble" style={{ background: 'rgba(217, 119, 6, 0.1)', color: 'var(--warning-500)', padding: 8, borderRadius: 'var(--radius-md)', display: 'flex' }}>
              <ShoppingBag size={20} />
            </div>
          </div>
          <div className="kpi-sub" style={{ marginTop: 'var(--space-2)' }}>Bills generated today</div>
        </div>

        <div className="glass-card kpi-card primary">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="kpi-label">Avg. Bill Value</div>
              <div className="kpi-value primary">
                ₹{today.transactions > 0
                  ? Math.round(today.revenue / today.transactions).toLocaleString('en-IN')
                  : 0
                }
              </div>
            </div>
            <div className="kpi-icon-bubble" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-500)', padding: 8, borderRadius: 'var(--radius-md)', display: 'flex' }}>
              <ShoppingCart size={20} />
            </div>
          </div>
          <div className="kpi-sub" style={{ marginTop: 'var(--space-2)' }}>Per transaction</div>
        </div>
      </div>

      {/* Charts */}
      <div className="dashboard-charts" style={{ marginBottom: 'var(--space-6)' }}>
        {/* Revenue Trend */}
        <div className="glass-card chart-card">
          <div className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={18} color="var(--primary-500)" /> Revenue This Month
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fill="url(#revenueGrad)"
                  dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#818cf8', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
              <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-2)' }}>
                <TrendingUp size={44} strokeWidth={1.2} color="var(--text-muted)" />
              </div>
              <div className="empty-state-text">No sales data yet</div>
              <div className="empty-state-hint">Start billing to see your revenue chart</div>
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="glass-card chart-card">
          <div className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Award size={18} color="var(--success-500)" /> Top Products (30 days)
          </div>
          {topItemsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topItemsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  type="number"
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="quantity"
                  fill="#10b981"
                  radius={[0, 6, 6, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
              <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-2)' }}>
                <Award size={44} strokeWidth={1.2} color="var(--text-muted)" />
              </div>
              <div className="empty-state-text">No product data yet</div>
              <div className="empty-state-hint">Sell some items to see your top performers</div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Sales */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-5) var(--space-5) 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <h3 style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={20} color="var(--primary-500)" /> Recent Sales
          </h3>
          <button
            className="btn btn-ghost"
            onClick={downloadExcel}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 'var(--fs-sm)' }}
            id="dash-download-excel-btn"
          >
            <Download size={15} /> Export Excel
          </button>
        </div>

        {recentSales.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map(sale => {
                const date = new Date(sale.created_at);
                const items = sale.items || [];
                return (
                  <tr key={sale.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>
                        {date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </div>
                      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                        {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: sale.customer_name ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {sale.customer_name || 'Walk-in'}
                      </div>
                      {sale.customer_phone && (
                        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                          {sale.customer_phone}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="truncate" style={{ maxWidth: 180, display: 'block' }}>
                        {items.map(i => i.name).join(', ')}
                      </span>
                    </td>
                    <td>₹{sale.subtotal.toFixed(0)}</td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '2px 8px',
                        fontSize: 'var(--fs-xs)',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-full)',
                        background: sale.payment_method === 'Cash' ? 'rgba(217, 119, 6, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                        color: sale.payment_method === 'Cash' ? 'var(--warning-500)' : 'var(--primary-500)'
                      }}>
                        {sale.payment_method || 'UPI'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--success-500)' }}>
                        ₹{sale.grand_total.toFixed(0)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-2)' }}>
              <Clock size={44} strokeWidth={1.2} color="var(--text-muted)" />
            </div>
            <div className="empty-state-text">No sales recorded yet</div>
            <div className="empty-state-hint">Complete your first sale to see it here</div>
          </div>
        )}
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
