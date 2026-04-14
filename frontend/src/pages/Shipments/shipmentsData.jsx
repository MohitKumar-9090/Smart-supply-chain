import React from 'react';

export const getStatusBadge = (status) => {
  const normalized = String(status || 'on-time').toLowerCase().replace(/\s+/g, '-');
  const statusBadge = {
    'on-time': <span className="badge badge-on-time">✅ ON TIME</span>,
    'risk': <span className="badge badge-risk">⚠️ AT RISK</span>,
    'delayed': <span className="badge badge-delayed">❌ DELAYED</span>,
  };
  return statusBadge[normalized] || statusBadge['on-time'];
};

export const getRiskColor = (r) => r >= 75 ? 'var(--accent-rose)' : r >= 45 ? 'var(--accent-amber)' : 'var(--accent-emerald)';
