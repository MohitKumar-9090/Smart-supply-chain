import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { alertsApi, getApiData, getApiPayload } from '../../services/api';
import toast from 'react-hot-toast';
import './alerts.css';
import { typeConfig } from './alertsData';

const Alerts = ({ onAlertCountChange }) => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchAlerts = async () => {
    try {
      const res = await alertsApi.getAll();
      const payload = getApiPayload(res);
      const items = getApiData(res, []);
      console.log('[Alerts] fetch response:', payload);
      setAlerts(items || []);
      onAlertCountChange?.(payload.unreadCount || 0);
    } catch (err) {
      console.error('[Alerts] fetch failed:', err.message);
      toast.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, []);

  const handleMarkRead = async (id, e) => {
    e.stopPropagation();
    try {
      await alertsApi.markRead(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
      toast.success('Alert marked as read');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await alertsApi.markAllRead();
      setAlerts(prev => prev.map(a => ({ ...a, read: true })));
      onAlertCountChange?.(0);
      toast.success('All alerts marked as read');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await alertsApi.delete(id);
      setAlerts(prev => prev.filter(a => a.id !== id));
      toast.success('Alert deleted');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const safeAlerts = alerts || [];
  const filtered = filter === 'all' ? safeAlerts :
    filter === 'unread' ? safeAlerts.filter(a => !a.read) :
    safeAlerts.filter(a => a.type === filter);

  const unreadCount = safeAlerts.filter(a => !a.read).length;

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">🔔 Smart Alerts</h1>
          <p className="page-subtitle">
            {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''} require attention` : 'All alerts reviewed'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {unreadCount > 0 && (
            <button className="btn btn-secondary" onClick={handleMarkAllRead}>
              ✓ Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="card" style={{ marginBottom: '20px', padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: `All (${safeAlerts.length})` },
            { key: 'unread', label: `Unread (${unreadCount})` },
            { key: 'critical', label: '🔴 Critical' },
            { key: 'warning', label: '🟡 Warning' },
            { key: 'info', label: 'ℹ️ Info' },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`btn ${filter === key ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {loading ? (
          [1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: '90px', borderRadius: 'var(--radius-md)' }} />)
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: '80px 20px' }}>
            <div className="empty-icon">✅</div>
            <div className="empty-title">No alerts to show</div>
            <div className="empty-text">
              {filter === 'unread' ? 'All caught up! No unread alerts.' : 'No alerts match the selected filter.'}
            </div>
          </div>
        ) : (
          filtered.map(alert => {
            const tc = typeConfig[alert.type] || typeConfig.info;
            return (
              <div
                key={alert.id}
                className={`alert-item ${!alert.read ? `unread ${alert.type}` : ''}`}
                style={{ transition: 'all 0.2s' }}
                onClick={() => alert.shipmentId && navigate(`/shipments/${alert.shipmentId}`)}
              >
                {/* Icon */}
                <div className="alert-icon-wrap" style={{ background: tc.bg, fontSize: '20px' }}>
                  {tc.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {alert.title}
                    </span>
                    <span className={`badge badge-${alert.type}`}>{tc.label}</span>
                    {!alert.read && <span style={{ width: '6px', height: '6px', background: 'var(--accent-rose)', borderRadius: '50%', display: 'inline-block' }} />}
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.5 }}>
                    {alert.message}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    {alert.trackingNumber && <span>📦 {alert.trackingNumber}</span>}
                    <span>🕒 {new Date(alert.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }} onClick={e => e.stopPropagation()}>
                  {!alert.read && (
                    <button className="btn btn-secondary btn-sm" onClick={(e) => handleMarkRead(alert.id, e)}>
                      ✓ Read
                    </button>
                  )}
                  <button className="btn btn-danger btn-sm" onClick={(e) => handleDelete(alert.id, e)}>
                    🗑️
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Alerts;
