import React, { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { aiApi, analyticsApi, getApiData, getApiPayload } from '../../services/api';
import toast from 'react-hot-toast';
import './analytics.css';
import { COLORS, heatmapZones } from './analyticsData';

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

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '12px' }}>
        <div style={{ color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color, marginBottom: '2px' }}>
            {p.name}: <strong>{p.value}{p.name?.includes('Rate') || p.name?.includes('Time') ? '%' : ''}</strong>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const Analytics = () => {
  const [summary, setSummary] = useState({});
  const [patterns, setPatterns] = useState({});
  const [loading, setLoading] = useState(true);

  const [routeForm, setRouteForm] = useState({
    origin: '',
    destination: '',
    cargo: 'General Cargo',
    issues: '',
    priority: 'balanced',
  });
  const [routeResult, setRouteResult] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sumRes, patRes] = await Promise.allSettled([
          withRetry(() => analyticsApi.getSummary(), 2, 900),
          withRetry(() => analyticsApi.getDelayPatterns(), 2, 900),
        ]);

        if (sumRes.status === 'fulfilled') {
          console.log('[Analytics] summary response:', getApiPayload(sumRes.value));
          setSummary(getApiData(sumRes.value, {}));
        } else {
          console.error('[Analytics] summary failed:', sumRes.reason?.message);
        }

        if (patRes.status === 'fulfilled') {
          console.log('[Analytics] patterns response:', getApiPayload(patRes.value));
          setPatterns(getApiData(patRes.value, {}));
        } else {
          console.error('[Analytics] patterns failed:', patRes.reason?.message);
        }

        if (sumRes.status === 'rejected' && patRes.status === 'rejected') {
          toast.error(`Failed to load analytics: ${sumRes.reason?.message || patRes.reason?.message || 'Network error'}`);
        }
      } catch (err) {
        console.error('[Analytics] fetch failed:', err.message);
        toast.error(`Failed to load analytics: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRouteAnalyze = async (e) => {
    e.preventDefault();
    if (!routeForm.origin || !routeForm.destination) {
      toast.error('Please enter origin and destination');
      return;
    }

    setRouteLoading(true);
    try {
      const res = await withRetry(
        () => aiApi.optimizeRoute({
          origin: routeForm.origin,
          destination: routeForm.destination,
          cargo: routeForm.cargo,
          issues: routeForm.issues,
          priority: routeForm.priority,
        }),
        2,
        900
      );

      const data = getApiData(res, null);
      setRouteResult(data);
      toast.success('Route analysis completed');
    } catch (err) {
      console.error('[Analytics] route analyze failed:', err.message);
      toast.error(`Route analysis failed: ${err.message}`);
    } finally {
      setRouteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-content">
        <div style={{ display: 'grid', gap: '20px' }}>
          <div className="skeleton" style={{ height: '60px' }} />
          <div className="analytics-loading-grid">
            {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: '120px' }} />)}
          </div>
          <div className="skeleton" style={{ height: '300px' }} />
        </div>
      </div>
    );
  }

  const pieData = [
    { name: 'On Time', value: summary?.onTimeDeliveries || 0 },
    { name: 'Delayed', value: summary?.delayedDeliveries || 0 },
    { name: 'At Risk', value: summary?.riskShipments || 0 },
  ];

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Analytics Dashboard</h1>
          <p className="page-subtitle">Supply chain performance insights - Last 6 months</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <div className="card-title">Manual Route Analysis</div>
          <span className="badge badge-info">AI Assisted</span>
        </div>

        <form className="analytics-route-form" onSubmit={handleRouteAnalyze}>
          <input
            className="form-input"
            placeholder="Origin (e.g. Mumbai, India)"
            value={routeForm.origin}
            onChange={(e) => setRouteForm((p) => ({ ...p, origin: e.target.value }))}
            required
          />
          <input
            className="form-input"
            placeholder="Destination (e.g. Dubai, UAE)"
            value={routeForm.destination}
            onChange={(e) => setRouteForm((p) => ({ ...p, destination: e.target.value }))}
            required
          />
          <input
            className="form-input"
            placeholder="Cargo"
            value={routeForm.cargo}
            onChange={(e) => setRouteForm((p) => ({ ...p, cargo: e.target.value }))}
          />
          <input
            className="form-input"
            placeholder="Current Issues (optional)"
            value={routeForm.issues}
            onChange={(e) => setRouteForm((p) => ({ ...p, issues: e.target.value }))}
          />
          <select
            className="form-select"
            value={routeForm.priority}
            onChange={(e) => setRouteForm((p) => ({ ...p, priority: e.target.value }))}
          >
            <option value="balanced">Balanced</option>
            <option value="time">Time Priority</option>
            <option value="cost">Cost Priority</option>
          </select>
          <button className="btn btn-primary responsive-full-btn" type="submit" disabled={routeLoading}>
            {routeLoading ? 'Analyzing...' : 'Analyze Route'}
          </button>
        </form>

        {routeResult?.recommendedRoute && (
          <div className="analytics-route-result">
            <div><strong>Recommended:</strong> {routeResult.recommendedRoute.name}</div>
            <div><strong>Time:</strong> {routeResult.recommendedRoute.estimatedTime}</div>
            <div><strong>Cost:</strong> {routeResult.recommendedRoute.estimatedCost}</div>
            <div><strong>Risk:</strong> {routeResult.recommendedRoute.riskScore}%</div>
          </div>
        )}
      </div>

      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card green">
          <div className="stat-icon green">OK</div>
          <div className="stat-value">{summary?.deliverySuccessRate || 0}%</div>
          <div className="stat-label">Delivery Success Rate</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon blue">S</div>
          <div className="stat-value">{summary?.totalShipments || 0}</div>
          <div className="stat-label">Total Shipments</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-icon amber">T</div>
          <div className="stat-value">{summary?.averageDelayHours || 0}h</div>
          <div className="stat-label">Avg Delay Hours</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon blue">R</div>
          <div className="stat-value">{summary?.routeEfficiency || 0}%</div>
          <div className="stat-label">Route Efficiency</div>
        </div>
      </div>

      <div className="analytics-main-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Delivery Performance Trend</div>
            <span className="badge badge-info">6 Months</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={patterns?.monthlyTrend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradRose" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.08)" />
              <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
              <Area type="monotone" dataKey="onTime" name="On-Time %" stroke="#10b981" fill="url(#gradGreen)" strokeWidth={2} />
              <Area type="monotone" dataKey="delayed" name="Delayed %" stroke="#f43f5e" fill="url(#gradRose)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Status Distribution</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: '8px', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            {pieData.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span style={{ width: '10px', height: '10px', background: COLORS[i], borderRadius: '50%', display: 'inline-block' }} />
                  {item.name}
                </div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: COLORS[i] }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="analytics-split-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Route Efficiency</div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={patterns?.routePerformance || []} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.08)" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="route" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="efficiency" name="Efficiency %" radius={[0, 4, 4, 0]}>
                {(patterns?.routePerformance || []).map((entry, i) => (
                  <Cell key={i} fill={entry.efficiency >= 85 ? '#10b981' : entry.efficiency >= 70 ? '#3b82f6' : '#f59e0b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Top Delay Reasons</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
            {(patterns?.topDelayReasons || []).map((item, i) => {
              const total = (patterns?.topDelayReasons || []).reduce((s, r) => s + r.count, 0);
              const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>{item.reason}</span>
                    <span style={{ fontSize: '12px', color: COLORS[i], fontWeight: 700 }}>{pct}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: COLORS[i] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Risk Heatmap - Shipment Overview</div>
          <span className="badge badge-info">Bonus Feature</span>
        </div>
        <div className="heatmap-grid">
          {heatmapZones.map((zone) => {
            const bg = zone.risk >= 70 ? 'rgba(244,63,94,0.15)' : zone.risk >= 45 ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.1)';
            const border = zone.risk >= 70 ? 'rgba(244,63,94,0.4)' : zone.risk >= 45 ? 'rgba(245,158,11,0.35)' : 'rgba(16,185,129,0.3)';
            const color = zone.risk >= 70 ? '#f43f5e' : zone.risk >= 45 ? '#f59e0b' : '#10b981';
            return (
              <div key={zone.name} className="heatmap-cell" style={{ background: bg, border: `1px solid ${border}` }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color, marginBottom: '4px' }}>{zone.risk}%</div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '2px' }}>{zone.name}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{zone.count} shipments</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
