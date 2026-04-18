import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './predictions.css';
import { getRiskColor, getRiskLabel } from './predictionsData';

const normalizeStatus = (status) => String(status || 'on-time').toLowerCase().replace(/\s+/g, '-');
const API_URL = (import.meta.env.VITE_API_URL || 'https://smart-supply-chain.onrender.com')
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');

console.log('[Predictions] VITE_API_URL:', import.meta.env.VITE_API_URL);

const Predictions = () => {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState({});
  const [runningAll, setRunningAll] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      console.log('[Predictions] Fetching shipments from:', `${API_URL}/api/shipments`);
      try {
        const res = await fetch(`${API_URL}/api/shipments`);
        const json = await res.json();
        if (!res.ok || !json?.success) {
          throw new Error(json?.message || 'Failed to load shipments');
        }
        const items = (json?.data || []).map((s) => ({
          ...s,
          status: normalizeStatus(s.status),
        }));
        console.log('[Predictions] shipments response:', json);
        setShipments(items);
      } catch (err) {
        console.error('[Predictions] failed to load shipments:', err);
        toast.error(`Failed to load shipments: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const runPrediction = async (id) => {
    setRunning(prev => ({ ...prev, [id]: true }));
    try {
      console.log('[Predictions] Calling API at:', `${API_URL}/api/ai/predict`);
      console.log('[Predictions] Shipment ID:', id);
      const shipment = (shipments || []).find((s) => s.id === id);
      const payload = shipment
        ? {
            shipmentId: id,
            trackingNumber: shipment.trackingNumber,
            origin: shipment.origin,
            destination: shipment.destination,
            cargo: shipment.cargo,
            weight: shipment.weight,
            carrier: shipment.carrier,
            weather: shipment.weather,
            traffic: shipment.traffic,
            estimatedDelivery: shipment.estimatedDelivery,
            description: shipment.description,
            riskLevel: shipment.riskLevel,
          }
        : { shipmentId: id };
      console.log('[Predictions] Payload:', payload);

      const res = await fetch(`${API_URL}/api/ai/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      console.log('[Predictions] predict response:', json);
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Prediction request failed');
      }

      const predictionData = json?.data;
      if (!predictionData || typeof predictionData.delayProbability !== 'number') {
        toast.error('Invalid prediction response format');
        return;
      }

      setPredictions(prev => ({ ...prev, [id]: predictionData }));
    } catch (err) {
      console.error(`[Predictions] prediction failed for ${id}:`, err);
      toast.error(`Prediction failed for ${id}: ${err.message}`);
    } finally {
      setRunning(prev => ({ ...prev, [id]: false }));
    }
  };

  const runAllPredictions = async () => {
    setRunningAll(true);
    toast('Running AI predictions for all shipments...', { icon: '🤖' });
    for (const s of shipments) {
      await runPrediction(s.id);
      await new Promise(r => setTimeout(r, 300)); // Slight delay between calls
    }
    setRunningAll(false);
    toast.success('All predictions complete!');
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">🤖 AI Predictions</h1>
          <p className="page-subtitle">Gemini-powered delay prediction for all active shipments</p>
        </div>
        <button className="btn btn-primary" onClick={runAllPredictions} disabled={runningAll || loading}>
          {runningAll ? '⏳ Running All...' : '🚀 Run All Predictions'}
        </button>
      </div>

      {/* Summary Banner */}
      {Object.keys(predictions).length > 0 && (
        <div style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(99,102,241,0.06))',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '20px',
          display: 'flex',
          gap: '24px',
          flexWrap: 'wrap',
        }}>
          {[
            { label: 'Analyzed', value: Object.keys(predictions).length, color: 'var(--text-primary)' },
            { label: 'High Risk (>75%)', value: (Object.values(predictions) || []).filter(p => p && p.delayProbability >= 75).length, color: 'var(--accent-rose)' },
            { label: 'At Risk (40-74%)', value: (Object.values(predictions) || []).filter(p => p && p.delayProbability >= 40 && p.delayProbability < 75).length, color: 'var(--accent-amber)' },
            { label: 'On Track (<40%)', value: (Object.values(predictions) || []).filter(p => p && p.delayProbability < 40).length, color: 'var(--accent-emerald)' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '24px', fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Shipment Prediction Cards */}
      {loading ? (
        <div className="predictions-grid">
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: '200px', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : (
        <div className="predictions-grid">
          {(shipments || []).map(s => {
            const pred = predictions[s.id];
            const isRunning = running[s.id];
            const risk = pred?.delayProbability ?? s.riskLevel;
            const riskColor = getRiskColor(risk);

            return (
              <div key={s.id} className="card" style={{ cursor: 'pointer' }}>
                {/* Top */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div>
                    <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {s.trackingNumber}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.origin} → {s.destination}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '24px', fontWeight: 800, color: riskColor }}>
                      {risk}%
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                      {getRiskLabel(risk)}
                    </div>
                  </div>
                </div>

                {/* Risk Bar */}
                <div style={{ marginBottom: '14px' }}>
                  <div className="risk-bar-track">
                    <div className="risk-bar-fill" style={{ width: `${risk}%`, background: `linear-gradient(90deg, ${riskColor}88, ${riskColor})` }} />
                  </div>
                </div>

                {/* AI Results */}
                {pred ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ padding: '9px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10px', fontWeight: 600, marginBottom: '3px', textTransform: 'uppercase' }}>AI Reason</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{pred.primaryReason || 'N/A'}</span>
                    </div>
                    <div style={{ padding: '9px 12px', background: 'rgba(16,185,129,0.08)', borderRadius: 'var(--radius-md)', fontSize: '12px', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <span style={{ color: '#34d399' }}>✅ {(pred.recommendedAction || 'N/A').substring(0, 80)}...</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <div style={{ flex: 1, padding: '8px', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>{pred.estimatedDelayHours || 0}h</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Delay</div>
                      </div>
                      <div style={{ flex: 1, padding: '8px', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent-primary)' }}>{pred.confidence || 0}%</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Confidence</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '14px 0', color: 'var(--text-muted)', fontSize: '12px' }}>
                    {isRunning ? '🤖 Analyzing...' : 'No prediction yet'}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => runPrediction(s.id)}
                    disabled={isRunning || runningAll}
                  >
                    {isRunning ? '⏳' : '🤖'} {pred ? 'Re-analyze' : 'Analyze'}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/shipments/${s.id}`)}>
                    View
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Predictions;
