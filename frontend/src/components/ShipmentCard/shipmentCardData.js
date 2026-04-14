export const statusConfig = {
  'on-time': { label: 'ON TIME', class: 'badge-on-time', icon: '✅', glow: 'var(--accent-emerald)' },
  'risk': { label: 'AT RISK', class: 'badge-risk', icon: '⚠️', glow: 'var(--accent-amber)' },
  'delayed': { label: 'DELAYED', class: 'badge-delayed', icon: '❌', glow: 'var(--accent-rose)' },
};

export const getRiskColor = (risk) => {
  if (risk >= 75) return 'var(--accent-rose)';
  if (risk >= 45) return 'var(--accent-amber)';
  return 'var(--accent-emerald)';
};
