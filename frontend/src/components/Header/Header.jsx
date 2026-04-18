import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Settings, ShieldCheck } from 'lucide-react';
import { healthApi } from '../../services/api';
import toast from 'react-hot-toast';
import './header.css';
import { getLiveIndicatorData } from './headerData';

const Header = ({ title, subtitle, alertCount, onMenuClick }) => {
  const navigate = useNavigate();
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const liveIndicator = getLiveIndicatorData();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const settingsRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!settingsRef.current?.contains(e.target)) {
        setSettingsOpen(false);
      }
    };

    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handleTestConnection = async () => {
    setChecking(true);
    try {
      const res = await healthApi.check();
      const status = res?.data?.status || 'ok';
      toast.success(`Backend connected (${status})`);
    } catch (err) {
      toast.error(`Connection failed: ${err.message}`);
    } finally {
      setChecking(false);
      setSettingsOpen(false);
    }
  };

  const handleRefreshPage = () => {
    setSettingsOpen(false);
    window.location.reload();
  };

  const handleClearSession = () => {
    localStorage.removeItem('sc_token');
    toast.success('Session cache cleared');
    setSettingsOpen(false);
  };

  const handleSwitchRole = () => {
    localStorage.removeItem('sc_role');
    setSettingsOpen(false);
    navigate('/login');
    window.location.reload();
  };

  const handleLogout = () => {
    localStorage.removeItem('sc_role');
    localStorage.removeItem('sc_token');
    setSettingsOpen(false);
    window.location.href = '/login';
  };

  return (
    <header className="header">
      <div className="header-left-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button className="mobile-menu-btn" onClick={onMenuClick}>
          |||
        </button>
        <div className="header-left">
          <div className="header-title">{title || 'SmartChain AI'}</div>
          <div className="header-subtitle">{subtitle || `${dateStr} · ${timeStr}`}</div>
        </div>
      </div>

      <div className="header-right">
        <button
          className="header-btn"
          onClick={() => navigate('/alerts')}
          title="View Alerts"
        >
          <BarChart3 size={16} className="header-icon" aria-hidden="true" />
          {alertCount > 0 && <span className="alert-dot" />}
        </button>

        <div className="settings-wrap" ref={settingsRef}>
          <button
            className="header-btn"
            title="Settings"
            onClick={() => setSettingsOpen((v) => !v)}
            aria-expanded={settingsOpen}
          >
            <Settings size={16} className="header-icon" aria-hidden="true" />
          </button>

          {settingsOpen && (
            <div className="settings-menu">
              <button className="settings-item" onClick={handleTestConnection} disabled={checking}>
                {checking ? 'Checking...' : 'Test API Connection'}
              </button>
              <button className="settings-item" onClick={handleRefreshPage}>Refresh Page</button>
              <button className="settings-item" onClick={handleClearSession}>Clear Session Cache</button>
              <button className="settings-item" onClick={handleSwitchRole}>Switch Login Role</button>
              <button className="settings-item danger" onClick={handleLogout}>Logout</button>
            </div>
          )}
        </div>

        <div className="user-avatar" title="Admin/User">
          <ShieldCheck size={16} className="header-icon" aria-hidden="true" />
        </div>

        <div className="live-status-pill">
          <span className="live-dot" />
          {liveIndicator.statusText}
        </div>
      </div>
    </header>
  );
};

export default Header;
