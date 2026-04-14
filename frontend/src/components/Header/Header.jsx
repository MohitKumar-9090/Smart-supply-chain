import React from 'react';
import { useNavigate } from 'react-router-dom';
import './header.css';
import { getLiveIndicatorData } from './headerData';

const Header = ({ title, subtitle, alertCount, onMenuClick }) => {
  const navigate = useNavigate();
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const liveIndicator = getLiveIndicatorData();

  return (
    <header className="header">
      <div className="header-left-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button className="mobile-menu-btn" onClick={onMenuClick}>
          ☰
        </button>
        <div className="header-left">
          <div className="header-title">{title || 'SmartChain AI'}</div>
          <div className="header-subtitle">{subtitle || `${dateStr} · ${timeStr}`}</div>
        </div>
      </div>

      <div className="header-right">
        {/* Alerts Bell */}
        <button
          className="header-btn"
          onClick={() => navigate('/alerts')}
          title="View Alerts"
        >
          🔔
          {alertCount > 0 && <span className="alert-dot" />}
        </button>

        {/* Settings */}
        <button className="header-btn" title="Settings">
          ⚙️
        </button>

        {/* User Avatar */}
        <div className="user-avatar" title="Admin User">
          AD
        </div>

        {/* Live indicator */}
        <div className="live-status-pill">
          <span className="live-dot" />
          {liveIndicator.statusText}
        </div>
      </div>
    </header>
  );
};

export default Header;
