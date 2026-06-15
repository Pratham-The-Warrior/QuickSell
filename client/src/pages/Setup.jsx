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
      if (data.status === 'active') {
        showToast('License verification successful! Status: ACTIVE', 'success');
      } else {
        const errorMsg = data.status === 'expired_offline' || data.status === 'expired'
          ? 'License has expired.'
          : data.status === 'suspended'
            ? 'License has been suspended.'
            : 'Invalid license key.';
        showToast(`Verification failed: ${errorMsg} (Status: ${data.status.toUpperCase()})`, 'error');
      }
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
