import React, { useState, useEffect } from 'react';
import MapView from '../../components/MapView/MapView';
import ShipmentCard from '../../components/ShipmentCard/ShipmentCard';
import { shipmentsApi, analyticsApi, alertsApi, healthApi, getApiData, getApiPayload } from '../../services/api';
import toast from 'react-hot-toast';
import './dashboard.css';
import { dashboardLegend } from './dashboardData';
import { ref, onValue } from 'firebase/database';
import { database } from '../../config/firebase';

const normalizeStatus = (status) => String(status || 'on-time').toLowerCase().replace(/\s+/g, '-');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withRetry = async (fn, retries = 2, delayMs = 900) => {
  let lastErr;
  for (let i = 0; i <= retries; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < retries) await wait(delayMs);
    }
  }
  throw lastErr;
};

const StatCard = ({ icon, label, value, change, color }) => (
  <div className={`stat-card ${color}`}>
    <div className={`stat-icon ${color}`}>{icon}</div>
    <div className="stat-value">{value}</div>
    <div className="stat-label">{label}</div>
    {change && (
      <div className={`stat-change ${parseFloat(change) >= 0 ? 'positive' : 'negative'}`}>
        {parseFloat(change) >= 0 ? '↑' : '↓'} {Math.abs(change)}% vs last month
      </div>
    )}
  </div>
);

const Dashboard = () => {
  const [shipments, setShipments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDataFallback = async () => {
    try {
      // Wake backend first (Render cold-start friendly)
      await withRetry(() => healthApi.check(), 1, 700);

      const [shipsResult, analyticsResult, alertsResult] = await Promise.allSettled([
        withRetry(() => shipmentsApi.getAll(), 2, 900),
        withRetry(() => analyticsApi.getSummary(), 2, 900),
        withRetry(() => alertsApi.getAll({ unreadOnly: true }), 2, 900),
      ]);

      if (shipsResult.status === 'fulfilled') {
        const shipmentsData = (getApiData(shipsResult.value, []) || []).map((s) => ({
          ...s,
          status: normalizeStatus(s.status),
        }));
        console.log('[Dashboard] shipments fallback response:', getApiPayload(shipsResult.value));
        setShipments(shipmentsData);
      } else {
        console.error('[Dashboard] shipments fallback failed:', shipsResult.reason?.message);
      }

      if (analyticsResult.status === 'fulfilled') {
        const analyticsData = getApiData(analyticsResult.value, {});
        console.log('[Dashboard] analytics fallback response:', getApiPayload(analyticsResult.value));
        setAnalytics(analyticsData);
      } else {
        console.error('[Dashboard] analytics fallback failed:', analyticsResult.reason?.message);
      }

      if (alertsResult.status === 'fulfilled') {
        const alertsData = getApiData(alertsResult.value, []);
        console.log('[Dashboard] alerts fallback response:', getApiPayload(alertsResult.value));
        setAlerts(alertsData);
      } else {
        console.error('[Dashboard] alerts fallback failed:', alertsResult.reason?.message);
      }

      const allFailed =
        shipsResult.status === 'rejected' &&
        analyticsResult.status === 'rejected' &&
        alertsResult.status === 'rejected';

      if (allFailed) {
        const firstError =
          shipsResult.reason?.message ||
          analyticsResult.reason?.message ||
          alertsResult.reason?.message ||
          'Unknown error';
        toast.error(`Failed to load dashboard data: ${firstError}`);
      }
    } catch (err) {
      console.error('[Dashboard] fallback fetch failed:', err.message);
      toast.error(`Failed to load dashboard data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Firebase Listeners (Primary)
    const shipmentsRef = ref(database, 'shipments');
    const analyticsRef = ref(database, 'analytics');
    const alertsRef = ref(database, 'alerts');

    const handleFirebaseError = (error) => {
      console.warn("Firebase permission denied or disconnected. Auto-switching to local API fallback.", error);
      fetchDataFallback();
    };

    const unsubShipments = onValue(shipmentsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = Object.values(snapshot.val()).map((s) => ({
          ...s,
          status: normalizeStatus(s.status),
        }));
        setShipments(data.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
        setLoading(false);
      }
    }, handleFirebaseError);

    const unsubAnalytics = onValue(analyticsRef, (snapshot) => {
      if (snapshot.exists()) setAnalytics(snapshot.val());
    });

    const unsubAlerts = onValue(alertsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = Object.values(snapshot.val());
        setAlerts(data.filter(a => !a.read).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
      }
    });

    // 2. Timeout Fallback (If firebase just sits there hanging indefinitely)
    const fallbackTimeout = setTimeout(() => {
      fetchDataFallback();
    }, 1500);

    return () => {
      unsubShipments();
      unsubAnalytics();
      unsubAlerts();
      clearTimeout(fallbackTimeout);
    };
  }, []);

  const safeShipments = shipments || [];
  const safeAlerts = alerts || [];
  const highRiskShipments = safeShipments.filter(s => s.riskLevel >= 60).slice(0, 3);
  const recentShipments = safeShipments.slice(0, 4);

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Command Center</h1>
          <p className="page-subtitle">Real-time supply chain overview · AI monitoring active</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div className="ai-active-pill">
            <span className="live-dot" />
            AI Engine Active
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid">
        <StatCard icon="📦" label="Total Shipments" value={analytics?.totalShipments || 0} color="blue" change="12" />
        <StatCard icon="✅" label="On-Time Delivery" value={`${analytics?.deliverySuccessRate || 0}%`} color="green" change="3.2" />
        <StatCard icon="⚠️" label="At Risk" value={analytics?.riskShipments || 0} color="amber" change="-5" />
        <StatCard icon="❌" label="Delayed" value={analytics?.delayedDeliveries || 0} color="rose" />
        <StatCard icon="🔔" label="Active Alerts" value={analytics?.activeAlerts || alerts.length} color="amber" />
      </div>

      {/* Map + Alerts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', marginBottom: '24px' }}>
        {/* Map */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🗺️ Live Shipment Map</div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{safeShipments.length} active routes</span>
          </div>
          {loading ? (
            <div className="skeleton" style={{ height: '340px' }} />
          ) : (
            <MapView shipments={safeShipments} />
          )}
          {/* Legend */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
            {dashboardLegend.map(({ label, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span style={{ width: '8px', height: '8px', background: color, borderRadius: '50%', display: 'inline-block' }} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Alerts Panel */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <div className="card-title">🚨 Active Alerts</div>
            <span className="badge badge-critical">{safeAlerts.filter(a => !a.read).length} unread</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1 }}>
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '70px', borderRadius: 'var(--radius-md)' }} />)
            ) : safeAlerts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✅</div>
                <div className="empty-title">No Active Alerts</div>
                <div className="empty-text">All shipments are operating normally.</div>
              </div>
            ) : (
              safeAlerts.slice(0, 5).map(alert => (
                <div key={alert.id} className={`alert-item ${!alert.read ? 'unread' : ''} ${alert.type}`}>
                  <div className={`alert-icon-wrap ${alert.type}`}>
                    {alert.type === 'critical' ? '🔴' : alert.type === 'warning' ? '🟡' : 'ℹ️'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '3px' }}
                      className="truncate">{alert.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }} className="truncate">
                      {alert.trackingNumber}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                      {new Date(alert.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Shipments */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div className="card-title">📦 Recent Shipments</div>
          <a href="/shipments" style={{ fontSize: '12px', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>View All →</a>
        </div>
        {loading ? (
          <div className="skeleton" style={{ height: '200px' }} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
            {recentShipments.map(s => <ShipmentCard key={s.id} shipment={s} />)}
          </div>
        )}
      </div>

      {/* High Risk Shipments */}
      {highRiskShipments.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">🔥 High Risk — Immediate Attention Required</div>
            <span className="badge badge-critical">ACTION NEEDED</span>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tracking</th>
                  <th>Route</th>
                  <th>Cargo</th>
                  <th>Risk</th>
                  <th>Status</th>
                  <th>Weather</th>
                </tr>
              </thead>
              <tbody>
                {highRiskShipments.map(s => (
                  <tr key={s.id} onClick={() => window.location.href = `/shipments/${s.id}`}>
                    <td>
                      <div className="primary-text">{s.trackingNumber}</div>
                      <div className="secondary-text">{s.carrier}</div>
                    </td>
                    <td className="secondary-text">{s.origin} → {s.destination}</td>
                    <td className="secondary-text">{s.cargo}</td>
                    <td>
                      <div className="risk-bar-container">
                        <div className="risk-bar-track">
                          <div
                            className="risk-bar-fill"
                            style={{
                              width: `${s.riskLevel}%`,
                              background: s.riskLevel >= 75 ? 'var(--accent-rose)' : 'var(--accent-amber)',
                            }}
                          />
                        </div>
                        <span className="risk-value" style={{ color: s.riskLevel >= 75 ? 'var(--accent-rose)' : 'var(--accent-amber)' }}>
                          {s.riskLevel}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${s.status === 'delayed' ? 'delayed' : 'risk'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="secondary-text">{s.weather}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
