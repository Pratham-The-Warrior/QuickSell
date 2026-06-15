import { useState, useEffect } from 'react';
import { Settings, Zap, Save, Rocket } from 'lucide-react';

const API = '/api';

export default function Setup({ onComplete, isEdit }) {
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseServerUrl, setLicenseServerUrl] = useState('');

  const [licenseStatus, setLicenseStatus] = useState('unlicensed');
  const [licenseLastChecked, setLicenseLastChecked] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [toast, setToast] = useState(null);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    if (isEdit) {
      fetch(`${API}/settings`)
        .then(r => r.json())
        .then(data => {
          setShopName(data.shopName || '');
          setOwnerName(data.ownerName || '');
          setUpiId(data.upiId || '');
          setPhone(data.phone || '');
          setLicenseKey(data.licenseKey || '');
          setLicenseServerUrl(data.licenseServerUrl || '');

          setLicenseStatus(data.licenseStatus || 'unlicensed');
          setLicenseLastChecked(data.licenseLastChecked || '');
          setLicenseExpiry(data.licenseExpiry || '');
        })
        .catch(() => {});
    }
  }, [isEdit]);

  async function handleVerifyLicense() {
    if (!licenseKey.trim()) return;
    setVerifying(true);
    try {
      const res = await fetch(`${API}/settings/verify-license`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey: licenseKey.trim(),
          licenseServerUrl: licenseServerUrl.trim()
        })
      });
      const data = await res.json();
      setLicenseStatus(data.status);
      if (data.lastChecked) {
        setLicenseLastChecked(data.lastChecked);
      }
      if (data.expiry) {
        setLicenseExpiry(data.expiry);
      }
      showToast(`License verification successful! Status: ${data.status.toUpperCase()}`);
      if (onComplete) {
        // Fetch full updated settings to propagate state
        const fullSettingsRes = await fetch(`${API}/settings`);
        const fullSettings = await fullSettingsRes.json();
        onComplete(fullSettings);
      }
    } catch (err) {
      console.error('License verification error:', err);
      showToast('Verification failed. Server is unreachable.', 'error');
    } finally {
      setVerifying(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!shopName.trim() || !upiId.trim()) return;

    setSaving(true);
    try {
      const res = await fetch(`${API}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName: shopName.trim(),
          ownerName: ownerName.trim(),
          upiId: upiId.trim(),
          phone: phone.trim(),
          licenseKey: licenseKey.trim(),
          licenseServerUrl: licenseServerUrl.trim()
        }),
      });
      const data = await res.json();
      if (onComplete) onComplete(data);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={isEdit ? '' : 'setup-container'}>
      <div className={`glass-card ${isEdit ? 'card-padding' : 'setup-card'}`}>
        {!isEdit && (
          <>
            <div className="setup-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
              <img src="/favicon.png" alt="QuickSell Logo" style={{
                width: 72,
                height: 72,
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-md)',
                objectFit: 'cover'
              }} />
            </div>
            <h2 className="setup-title">Welcome to QuickSell</h2>
            <p className="setup-subtitle">Let's set up your shop in 30 seconds</p>
          </>
        )}

        {isEdit && (
          <div className="page-header">
            <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Settings size={28} color="var(--primary-500)" /> Settings
            </h2>
            <p className="page-subtitle">Manage your shop configuration</p>
          </div>
        )}

        <form className="setup-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="setup-shop-name">Shop Name *</label>
            <input
              id="setup-shop-name"
              className="form-input form-input-lg"
              type="text"
              placeholder="e.g. QuickSell"
              value={shopName}
              onChange={e => setShopName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="setup-owner-name">Owner Name</label>
            <input
              id="setup-owner-name"
              className="form-input"
              type="text"
              placeholder="e.g. Rajesh Kumar"
              value={ownerName}
              onChange={e => setOwnerName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="setup-upi-id">UPI ID *</label>
            <input
              id="setup-upi-id"
              className="form-input form-input-lg"
              type="text"
              placeholder="e.g. shopname@upi"
              value={upiId}
              onChange={e => setUpiId(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="setup-phone">Shop Phone</label>
            <input
              id="setup-phone"
              className="form-input"
              type="tel"
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>

          {isEdit && (
            <div style={{ marginTop: 'var(--space-6)', paddingTop: 'var(--space-6)', borderTop: '1.5px solid var(--glass-border)', textAlign: 'left' }}>
              <h3 style={{ fontSize: 'var(--fs-base)', fontWeight: 700, marginBottom: 'var(--space-4)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={16} color="var(--primary-500)" /> Subscription & Licensing
              </h3>
              
              <div className="form-group">
                <label className="form-label" htmlFor="setup-license-key">License Key</label>
                <input
                  id="setup-license-key"
                  className="form-input"
                  type="text"
                  placeholder="e.g. QS-XXXX-XXXX"
                  value={licenseKey}
                  onChange={e => setLicenseKey(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginTop: 'var(--space-3)' }}>
                <label className="form-label" htmlFor="setup-server-url">Licensing Server URL</label>
                <input
                  id="setup-server-url"
                  className="form-input"
                  type="url"
                  placeholder="e.g. https://your-server.onrender.com/api/check"
                  value={licenseServerUrl}
                  onChange={e => setLicenseServerUrl(e.target.value)}
                />
              </div>



              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>LICENSING STATUS</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: licenseStatus === 'active' ? 'var(--success-500)' : ['suspended', 'expired', 'expired_offline', 'tampered'].includes(licenseStatus) ? 'var(--danger-500)' : 'var(--warning-500)',
                      boxShadow: `0 0 8px ${licenseStatus === 'active' ? 'var(--success-500)' : ['suspended', 'expired', 'expired_offline', 'tampered'].includes(licenseStatus) ? 'var(--danger-500)' : 'var(--warning-500)'}`
                    }}></span>
                    <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 'var(--fs-sm)', color: licenseStatus === 'active' ? 'var(--success-600)' : ['suspended', 'expired', 'expired_offline', 'tampered'].includes(licenseStatus) ? 'var(--danger-600)' : 'var(--warning-600)' }}>
                      {licenseStatus === 'expired_offline' ? 'OFFLINE EXPIRED' : licenseStatus === 'tampered' ? 'TAMPERED' : licenseStatus}
                    </span>
                  </div>
                </div>
                
                {licenseExpiry && (
                  <div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>EXPIRATION DATE</div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', fontWeight: 500, marginTop: 4 }}>
                      {new Date(licenseExpiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                )}

                {licenseLastChecked && (
                  <div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>LAST VERIFIED</div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', fontWeight: 500, marginTop: 4 }}>
                      {new Date(licenseLastChecked).toLocaleString('en-IN')}
                    </div>
                  </div>
                )}
                
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleVerifyLicense}
                  disabled={verifying || !licenseKey.trim()}
                  id="setup-verify-license-btn"
                  style={{ padding: '6px 12px', fontSize: 'var(--fs-xs)' }}
                >
                  {verifying ? 'Verifying...' : 'Verify License'}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || !shopName.trim() || !upiId.trim()}
            id="setup-save-btn"
            style={{ marginTop: 'var(--space-4)', display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: isEdit ? 'flex-start' : 'stretch' }}
          >
            {saving ? (
              'Saving...'
            ) : isEdit ? (
              <><Save size={18} /> Save</>
            ) : (
              <><Rocket size={18} /> Launch QuickSell</>
            )}
          </button>
        </form>
      </div>
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
