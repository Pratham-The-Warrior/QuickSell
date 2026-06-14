import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Zap } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Setup from './pages/Setup';
import Inventory from './pages/Inventory';
import Billing from './pages/Billing';
import Dashboard from './pages/Dashboard';

const API = '/api';

export default function App() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch(`${API}/settings`);
      const data = await res.json();
      setSettings(data);
      // If no shop name configured, redirect to setup
      if (!data.shopName && location.pathname !== '/setup') {
        navigate('/setup');
      }
    } catch {
      console.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  function handleSetupComplete(newSettings) {
    const wasSetup = !settings?.shopName;
    setSettings(newSettings);
    if (wasSetup) {
      navigate('/billing');
    }
  }

  if (loading) {
    return (
      <div className="setup-container">
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src="/favicon.png" alt="QuickSell Logo" style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', margin: '0 auto 16px', display: 'block', objectFit: 'cover' }} />
          <p className="text-secondary">Loading QuickSell...</p>
        </div>
      </div>
    );
  }

  // Setup page — no sidebar
  if (!settings?.shopName) {
    return (
      <Routes>
        <Route path="*" element={<Setup onComplete={handleSetupComplete} />} />
      </Routes>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar settings={settings} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/billing" replace />} />
          <Route path="/inventory" element={<Inventory settings={settings} />} />
          <Route path="/billing" element={<Billing settings={settings} />} />
          <Route path="/dashboard" element={<Dashboard settings={settings} />} />
          <Route path="/setup" element={<Setup onComplete={handleSetupComplete} isEdit />} />
          <Route path="*" element={<Navigate to="/billing" replace />} />
        </Routes>
      </main>
    </div>
  );
}
