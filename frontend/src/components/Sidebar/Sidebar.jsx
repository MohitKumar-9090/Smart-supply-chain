import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './sidebar.css';
import { navItems } from './sidebarData';

const Sidebar = ({ alertCount }) => {
  const navigate = useNavigate();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <div className="logo-icon">⛓️</div>
          <div className="logo-text">
            <span className="logo-name">SmartChain AI</span>
            <span className="logo-tagline">Supply Chain Intelligence</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item, idx) => {
          if (item.section) {
            return (
              <span key={idx} className="nav-section-label">{item.section}</span>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              end={item.path === '/'}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.label === 'Alerts' && alertCount > 0 && (
                <span className="nav-badge">{alertCount > 9 ? '9+' : alertCount}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
          <div style={{ marginBottom: '4px' }}>SmartChain AI v1.0</div>
          <div className="live-status-pill" style={{ justifyContent: 'center' }}>
            <span className="live-dot" />
            System Operational
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
