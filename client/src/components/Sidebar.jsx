import { useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Package, BarChart3, Settings, Zap, Wifi } from 'lucide-react';

const navItems = [
  { path: '/billing', label: 'Billing', icon: ShoppingCart, id: 'billing' },
  { path: '/inventory', label: 'Inventory', icon: Package, id: 'inventory' },
  { path: '/dashboard', label: 'Dashboard', icon: BarChart3, id: 'dashboard' },
  { path: '/setup', label: 'Settings', icon: Settings, id: 'settings' },
];

export default function Sidebar({ settings }) {
  const location = useLocation();
  const navigate = useNavigate();
  const licenseStatus = settings?.licenseStatus || 'unlicensed';
  const isLocked = licenseStatus !== 'active';

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="sidebar sidebar-desktop">
        <div className="sidebar-brand">
          <img src="/favicon.png" alt="QuickSell" style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
          <h1>{settings?.shopName || 'QuickSell'}</h1>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
                id={`nav-${item.id}`}
              >
                <span className="sidebar-link-icon">
                  <Icon size={18} strokeWidth={2} />
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div style={{ padding: '0 var(--space-4)', marginTop: 'auto' }}>
          {isLocked ? (
            <div className="glass-card license-suspended-card" style={{
              padding: 'var(--space-3) var(--space-4)',
              fontSize: 'var(--fs-xs)',
              color: 'var(--danger-500)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: '1.5px solid var(--danger-400)',
              background: 'rgba(244, 63, 94, 0.05)',
              borderRadius: 'var(--radius-sm)'
            }}
            onClick={() => navigate('/setup')}
            role="button"
            title="License status inactive. Click to view Settings."
            >
              <Zap size={14} color="var(--danger-500)" style={{ fill: 'var(--danger-500)' }} />
              <span style={{ fontWeight: 700 }}>License Inactive</span>
            </div>
          ) : (
            <div className="glass-card" style={{
              padding: 'var(--space-3) var(--space-4)',
              fontSize: 'var(--fs-xs)',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <Wifi size={14} color="var(--success-500)" />
              Offline Ready
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-bottom-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              className={`mobile-nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="mobile-nav-icon">
                <Icon size={22} strokeWidth={location.pathname === item.path ? 2.5 : 1.8} />
              </span>
              <span className="mobile-nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
