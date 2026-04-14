import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { shipmentsApi, aiApi } from '../../services/api';
import MapView from '../../components/MapView/MapView';
import toast from 'react-hot-toast';
import './shipmentDetail.css';
import { getRiskColor, statusConfig } from './shipmentDetailData';
import { ref, onValue } from 'firebase/database';
import { database } from '../../config/firebase';

const ProbabilityRing = ({ value }) => {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const filled = (value / 100) * circumference;
  const color = getRiskColor(value);

  return (
    <div className="probability-ring" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="130" height="130" className="ring-svg">
        <circle className="ring-bg" cx="65" cy="65" r={radius} />
        <circle
          className="ring-fill"
          cx="65" cy="65" r={radius}
          stroke={color}
          strokeDasharray={`${filled} ${circumference - filled}`}
        />
      </svg>
      <div className="ring-label">
        <span className="ring-pct" style={{ color }}>{value}%</span>
        <span className="ring-text">DELAY RISK</span>
      </div>
    </div>
  );
};

const ShipmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);

  const fetchShipmentFallback = async () => {
    try {
      const res = await shipmentsApi.getById(id);
      setShipment(res.data);
    } catch (err) {
      toast.error('Shipment not found (Fallback)');
      navigate('/shipments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const shipmentRef = ref(database, `shipments/${id}`);
    
    const unsubscribe = onValue(shipmentRef, (snapshot) => {
      if (snapshot.exists()) {
        setShipment(snapshot.val());
        setLoading(false);
      } else {
        // Realtime DB might store it as an array if seeded weirdly, or it might be missing
        // So we fallback to API if Firebase returns null but we expect it to exist
        fetchShipmentFallback(); 
      }
    }, (error) => {
      console.warn("Firebase permission denied. Falling back to local backend REST API.", error);
      fetchShipmentFallback();
    });

    const fallbackTimeout = setTimeout(() => {
      if (loading) fetchShipmentFallback();
    }, 1500);

    return () => {
      unsubscribe();
      clearTimeout(fallbackTimeout);
    };
  }, [id]);

  const handlePredict = async () => {
    setPredicting(true);
    try {
      const res = await aiApi.predict({ shipmentId: id });
      setPrediction(res.data);
      toast.success('AI analysis complete!');
    } catch (err) {
      toast.error('Prediction failed: ' + err.message);
    } finally {
      setPredicting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-content">
        <div style={{ display: 'grid', gap: '20px' }}>
          <div className="skeleton" style={{ height: '60px' }} />
          <div className="skeleton" style={{ height: '300px' }} />
        </div>
      </div>
    );
  }

  if (!shipment) return null;

  const sc = statusConfig[shipment.status] || statusConfig['on-time'];

  return (
    <div className="page-content">
      {/* Back + Header */}
      <div style={{ marginBottom: '24px' }}>
        <button className="btn btn-secondary btn-sm" style={{ marginBottom: '14px' }} onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div className="page-header-left">
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              📦 {shipment.trackingNumber}
              <span className={`badge ${sc.class}`}>{sc.icon} {sc.label}</span>
            </h1>
            <p className="page-subtitle">{shipment.origin} → {shipment.destination}</p>
          </div>
          {role === 'admin' && (
            <button className="btn btn-primary" onClick={handlePredict} disabled={predicting}>
              {predicting ? '⏳ Analyzing...' : '🤖 Run AI Prediction'}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Map */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: '16px' }}>🗺️ Route Visualization</div>
            <MapView shipments={[shipment]} />
          </div>

          {/* Shipment Details */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: '18px' }}>📋 Shipment Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[
                { label: 'Carrier', value: shipment.carrier, icon: '🚢' },
                { label: 'Cargo Type', value: shipment.cargo, icon: '📦' },
                { label: 'Weight', value: shipment.weight, icon: '⚖️' },
                { label: 'Weather', value: shipment.weather, icon: '🌤️' },
                { label: 'Traffic', value: shipment.traffic, icon: '🛣️' },
                { label: 'Risk Score', value: `${shipment.riskLevel}%`, icon: '📊' },
                {
                  label: 'Est. Delivery', icon: '📅',
                  value: shipment.estimatedDelivery
                    ? new Date(shipment.estimatedDelivery).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                    : 'TBD'
                },
                { label: 'Last Updated', icon: '🔄', value: shipment.updatedAt ? new Date(shipment.updatedAt).toLocaleString() : '-' },
              ].map(({ label, value, icon }) => (
                <div key={label} style={{
                  padding: '14px',
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {icon} {label}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>{value}</div>
                </div>
              ))}
            </div>
            {shipment.description && (
              <div style={{ marginTop: '16px', padding: '14px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '5px', textTransform: 'uppercase' }}>📝 Notes</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{shipment.description}</div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column — AI Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* AI Insight Panel */}
          <div className="insight-panel">
            <div className="insight-header">
              <span className="ai-sparkle">✨</span>
              <div>
                <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Gemini AI Analysis
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {prediction ? 'Last updated just now' : 'Click Run AI Prediction to analyze'}
                </div>
              </div>
            </div>

            {!prediction ? (
              <div style={{ textAlign: 'center', padding: '30px 20px' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🤖</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  AI prediction will analyze weather, traffic, and route data to estimate delay probability.
                </div>
                {role === 'admin' ? (
                  <button className="btn btn-primary w-full" onClick={handlePredict} disabled={predicting}>
                    {predicting ? '⏳ Analyzing...' : '🎯 Analyze This Shipment'}
                  </button>
                ) : (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Log in as Admin to run predictions.
                  </div>
                )}
              </div>
            ) : (
              <div>
                {/* Ring */}
                <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
                  <ProbabilityRing value={prediction.delayProbability} />
                </div>

                {/* Key Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase' }}>
                      Primary Reason
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {prediction.primaryReason}
                    </div>
                  </div>

                  <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase' }}>
                      Recommended Action
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#34d399', fontWeight: 500 }}>
                      ✅ {prediction.recommendedAction}
                    </div>
                  </div>

                  {prediction.contributingFactors?.length > 0 && (
                    <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase' }}>
                        Contributing Factors
                      </div>
                      {prediction.contributingFactors.map((f, i) => (
                        <div key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          • {f}
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1, padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {prediction.estimatedDelayHours}h
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Est. Delay</div>
                    </div>
                    <div style={{ flex: 1, padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-primary)' }}>
                        {prediction.confidence}%
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Confidence</div>
                    </div>
                  </div>

                  {prediction.analysis && (
                    <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99,102,241,0.2)', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      💡 {prediction.analysis}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: '14px' }}>⚡ Quick Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button className="btn btn-secondary w-full" onClick={() => navigate('/chat')}>
                💬 Ask AI Assistant
              </button>
              {role === 'admin' && (
                <>
                  <button className="btn btn-secondary w-full" onClick={() => navigate('/routes')}>
                    🗺️ Optimize Route
                  </button>
                  <button className="btn btn-primary w-full" onClick={handlePredict} disabled={predicting}>
                    {predicting ? '⏳ Analyzing...' : '🔄 Re-run Analysis'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShipmentDetail;
