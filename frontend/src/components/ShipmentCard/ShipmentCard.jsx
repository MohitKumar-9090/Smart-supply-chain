import React from 'react';
import { useNavigate } from 'react-router-dom';
import './shipmentCard.css';
import { statusConfig, getRiskColor } from './shipmentCardData';

const ShipmentCard = ({ shipment, compact = false }) => {
  const navigate = useNavigate();
  const config = statusConfig[shipment.status] || statusConfig['on-time'];
  const riskColor = getRiskColor(shipment.riskLevel || 0);

  return (
    <div
      className="card"
      style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
      onClick={() => navigate(`/shipments/${shipment.id}`)}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '3px' }}>
            {shipment.trackingNumber}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{shipment.carrier}</div>
        </div>
        <span className={`badge ${config.class}`}>
          {config.icon} {config.label}
        </span>
      </div>

      {/* Route */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', fontSize: '13px' }}>
        <span style={{ color: 'var(--text-secondary)' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>FROM</span>
          {shipment.origin}
        </span>
        <span style={{ color: 'var(--text-muted)', marginTop: '12px' }}>→</span>
        <span style={{ color: 'var(--text-secondary)' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>TO</span>
          {shipment.destination}
        </span>
      </div>

      {/* Risk Bar */}
      {!compact && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>RISK SCORE</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: riskColor }}>
              {shipment.riskLevel}%
            </span>
          </div>
          <div className="risk-bar-track">
            <div
              className="risk-bar-fill"
              style={{
                width: `${shipment.riskLevel}%`,
                background: `linear-gradient(90deg, ${riskColor}99, ${riskColor})`,
              }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          📦 {shipment.cargo}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          🗓️ {shipment.estimatedDelivery ? new Date(shipment.estimatedDelivery).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'}
        </div>
      </div>
    </div>
  );
};

export default ShipmentCard;
