import React, { useState, useEffect } from 'react';
import { aiApi, shipmentsApi, getApiData, getApiPayload, API_URL } from '../../services/api';
import toast from 'react-hot-toast';
import './routeOptimizer.css';
import { priorityOptions } from './routeOptimizerData';

const normalizeStatus = (status) => String(status || 'on-time').toLowerCase().replace(/\s+/g, '-');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const RouteOptimizer = () => {
  const [shipments, setShipments] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [cargo, setCargo] = useState('');
  const [issues, setIssues] = useState('');
  const [priority, setPriority] = useState('balanced');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadShipments = async () => {
      try {
        const res = await shipmentsApi.getAll();
        console.log('[RouteOptimizer] shipments response:', getApiPayload(res));
        const items = (getApiData(res, []) || []).map((s) => ({
          ...s,
          status: normalizeStatus(s.status),
        }));
        setShipments(items);
      } catch (firstErr) {
        console.warn('[RouteOptimizer] first load failed, retrying:', firstErr.message);
        try {
          await wait(800);
          const res = await shipmentsApi.getAll();
          console.log('[RouteOptimizer] shipments response after retry:', getApiPayload(res));
          const items = (getApiData(res, []) || []).map((s) => ({
            ...s,
            status: normalizeStatus(s.status),
          }));
          setShipments(items);
        } catch (err) {
          console.error('[RouteOptimizer] failed to load shipments:', err.message);
          toast.error(`Failed to load shipments: ${err.message}`);
        }
      }
    };

    loadShipments();
  }, []);

  const handleShipmentSelect = (id) => {
    setSelectedId(id);
    const s = shipments.find(sh => sh.id === id);
    if (s) {
      setOrigin(s.origin);
      setDestination(s.destination);
      setCargo(s.cargo);
      setIssues(`${s.weather}, ${s.traffic}`);
    }
  };

  const handleOptimize = async (e) => {
    e.preventDefault();
    if (!origin || !destination) {
      toast.error('Please enter origin and destination');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const payload = selectedId
        ? { shipmentId: selectedId, priority }
        : { origin, destination, cargo, issues, priority };
      
      // Log API call details for debugging
      console.log('[RouteOptimizer] Calling API at:', `${API_URL}/ai/route`);
      console.log('[RouteOptimizer] Payload:', payload);
      
      const res = await aiApi.optimizeRoute(payload);
      console.log('[RouteOptimizer] optimization response:', getApiPayload(res));
      
      // Extract data with proper null safety
      const optimizationData = getApiData(res, null);
      if (!optimizationData) {
        toast.error('Invalid response format from server');
        setResult(null);
        return;
      }
      
      setResult(optimizationData);
      toast.success('Route optimization complete!');
    } catch (err) {
      console.error('[RouteOptimizer] optimization failed:', err.message);
      toast.error('Optimization failed: ' + err.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">🗺️ Route Optimizer</h1>
          <p className="page-subtitle">AI-powered route analysis · Find the best path for your cargo</p>
        </div>
      </div>

      <div className="route-layout">
        {/* Input Form */}
        <div className="route-input-col">
          <div className="card">
            <div className="card-title" style={{ marginBottom: '18px' }}>⚙️ Route Parameters</div>
            <form onSubmit={handleOptimize}>
              {/* Quick select from shipment */}
              <div className="form-group">
                <label className="form-label">Load from Shipment (Optional)</label>
                <select className="form-select" value={selectedId} onChange={e => handleShipmentSelect(e.target.value)}>
                  <option value="">— Enter manually —</option>
                  {(shipments || []).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.trackingNumber} · {s.origin} → {s.destination}
                    </option>
                  ))}
                </select>
              </div>

              <div className="divider" />

              <div className="form-group">
                <label className="form-label">Origin *</label>
                <input className="form-input" placeholder="Shanghai, China" value={origin} onChange={e => setOrigin(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Destination *</label>
                <input className="form-input" placeholder="Los Angeles, USA" value={destination} onChange={e => setDestination(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Cargo Type</label>
                <input className="form-input" placeholder="Electronics" value={cargo} onChange={e => setCargo(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Current Issues</label>
                <input className="form-input" placeholder="Storm Warning, High Traffic" value={issues} onChange={e => setIssues(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <div className="tabs" style={{ marginTop: '2px' }}>
                  {priorityOptions.map(p => (
                    <button key={p.value} type="button" className={`tab-btn ${priority === p.value ? 'active' : ''}`} onClick={() => setPriority(p.value)}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                {loading ? '⏳ Optimizing...' : '🤖 Optimize Route with AI'}
              </button>
            </form>
          </div>
        </div>

        {/* Results */}
        <div className="route-results-col">
          {!result && !loading && (
            <div className="route-state-card" style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
              <div style={{ fontSize: '56px', marginBottom: '16px', opacity: 0.4 }}>🗺️</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Ready to Optimize
              </div>
              <div style={{ fontSize: '13px', maxWidth: '260px', lineHeight: 1.5 }}>
                Enter your route details and let Gemini AI find the most efficient path.
              </div>
            </div>
          )}

          {loading && (
            <div className="route-state-card">
              <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'sparkle 1.5s infinite' }}>🤖</div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                Gemini is analyzing routes...
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Evaluating weather, traffic, and cost factors
              </div>
            </div>
          )}

          {result && (
            <>
              {/* AI Reasoning */}
              <div className="insight-panel">
                <div className="insight-header">
                  <span className="ai-sparkle">✨</span>
                  <div>
                    <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      AI Route Analysis
                    </div>
                    {result.savings && (
                      <div style={{ fontSize: '11px', color: 'var(--accent-emerald)' }}>
                        ✅ {result.savings}
                      </div>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  {result.reasoning}
                </p>
              </div>

              {/* Recommended Route */}
              {result.recommendedRoute && (
                <div className="route-card recommended">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                      <span className="badge badge-on-time" style={{ marginBottom: '6px' }}>⭐ RECOMMENDED</span>
                      <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {result.recommendedRoute.name}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                        {result.recommendedRoute.riskScore}%
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>RISK SCORE</div>
                    </div>
                  </div>

              {/* Route Path */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                {((result.recommendedRoute?.path) || []).map((waypoint, i, arr) => (
                  <React.Fragment key={i}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '4px 10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-subtle)' }}>
                      {i === 0 ? '🟢' : i === arr.length - 1 ? '🏁' : '⚓'} {waypoint}
                    </span>
                    {i < arr.length - 1 && <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>→</span>}
                  </React.Fragment>
                ))}
              </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                    {[
                      { label: '⏱️ Time', value: result.recommendedRoute.estimatedTime },
                      { label: '💰 Cost', value: result.recommendedRoute.estimatedCost },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {result.recommendedRoute?.pros?.length > 0 && (
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>Advantages</div>
                      {(result.recommendedRoute.pros || []).map((pro, i) => (
                        <div key={i} style={{ fontSize: '12px', color: 'var(--accent-emerald)', marginBottom: '3px' }}>✓ {pro}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Alternative Routes */}
              {result.alternativeRoutes?.length > 0 && (
                <div>
                  <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
                    🔀 Alternative Routes
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                    {result.alternativeRoutes.map((route, i) => (
                      <div key={i} className="route-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px' }}>{route.name}</div>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: route.riskScore >= 50 ? 'var(--accent-amber)' : 'var(--accent-emerald)' }}>
                            {route.riskScore}%
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                          {route.summary}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                          <span>⏱️ {route.estimatedTime}</span>
                          <span>·</span>
                          <span>💰 {route.estimatedCost}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RouteOptimizer;
