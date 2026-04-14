import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { analyticsApi, getApiData, getApiPayload } from '../../services/api';
import toast from 'react-hot-toast';
import './analytics.css';
import { COLORS, heatmapZones } from './analyticsData';

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
  const [summary, setSummary] = useState(null);
  const [patterns, setPatterns] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sumRes, patRes] = await Promise.all([
          analyticsApi.getSummary(),
          analyticsApi.getDelayPatterns(),
        ]);
        console.log('[Analytics] summary response:', getApiPayload(sumRes));
        console.log('[Analytics] patterns response:', getApiPayload(patRes));
        setSummary(getApiData(sumRes, {}));
        setPatterns(getApiData(patRes, {}));
      } catch (err) {
        console.error('[Analytics] fetch failed:', err.message);
        toast.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="page-content">
        <div style={{ display: 'grid', gap: '20px' }}>
          <div className="skeleton" style={{ height: '60px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px' }}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: '120px' }} />)}
          </div>
          <div className="skeleton" style={{ height: '300px' }} />
        </div>
      </div>
    );
  }

  // Pie chart data
  const pieData = [
    { name: 'On Time', value: summary?.onTimeDeliveries || 0 },
    { name: 'Delayed', value: summary?.delayedDeliveries || 0 },
    { name: 'At Risk', value: summary?.riskShipments || 0 },
  ];

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">📊 Analytics Dashboard</h1>
          <p className="page-subtitle">Supply chain performance insights · Last 6 months</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card green">
          <div className="stat-icon green">✅</div>
          <div className="stat-value">{summary?.deliverySuccessRate || 0}%</div>
          <div className="stat-label">Delivery Success Rate</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon blue">📦</div>
          <div className="stat-value">{summary?.totalShipments || 0}</div>
          <div className="stat-label">Total Shipments</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-icon amber">⏱️</div>
          <div className="stat-value">{summary?.averageDelayHours || 0}h</div>
          <div className="stat-label">Avg Delay Hours</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon blue">🗺️</div>
          <div className="stat-value">{summary?.routeEfficiency || 0}%</div>
          <div className="stat-label">Route Efficiency</div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', marginBottom: '20px' }}>
        {/* Delivery Trend */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📈 Delivery Performance Trend</div>
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

        {/* Distribution Pie */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🍩 Status Distribution</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
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

      {/* Charts Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Route Performance */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🗺️ Route Efficiency</div>
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

        {/* Delay Reasons */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">⚠️ Top Delay Reasons</div>
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

      {/* Risk Heatmap */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">🔥 Risk Heatmap — Shipment Overview</div>
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
