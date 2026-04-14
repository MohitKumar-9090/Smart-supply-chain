export const getRiskColor = (r) => r >= 75 ? 'var(--accent-rose)' : r >= 45 ? 'var(--accent-amber)' : 'var(--accent-emerald)';

export const statusConfig = {
  'on-time': { label: 'ON TIME', class: 'badge-on-time', icon: '✅' },
  'risk': { label: 'AT RISK', class: 'badge-risk', icon: '⚠️' },
  'delayed': { label: 'DELAYED', class: 'badge-delayed', icon: '❌' },
};

export const normalizeStatus = (status) =>
  String(status || 'on-time').toLowerCase().replace(/\s+/g, '-');
