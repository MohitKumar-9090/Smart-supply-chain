export const getRiskColor = (r) => r >= 75 ? 'var(--accent-rose)' : r >= 45 ? 'var(--accent-amber)' : 'var(--accent-emerald)';
export const getRiskLabel = (r) => r >= 75 ? 'critical' : r >= 45 ? 'high' : r >= 25 ? 'medium' : 'low';
