/**
 * Analytics Routes
 * KPIs, delay patterns, route efficiency
 */
const express = require('express');
const router = express.Router();
const { store } = require('../data/mockData');

// GET /api/analytics/summary — overall KPIs
router.get('/summary', (req, res) => {
  const shipments = store.shipments;
  const total = shipments.length;
  const onTime = shipments.filter(s => s.status === 'on-time').length;
  const delayed = shipments.filter(s => s.status === 'delayed').length;
  const atRisk = shipments.filter(s => s.status === 'risk').length;

  const avgRisk = total > 0
    ? Math.round(shipments.reduce((sum, s) => sum + (s.riskLevel || 0), 0) / total)
    : 0;

  const data = {
    ...store.analytics,
    totalShipments: total,
    onTimeDeliveries: onTime,
    delayedDeliveries: delayed,
    riskShipments: atRisk,
    deliverySuccessRate: total > 0 ? Math.round((onTime / total) * 100 * 10) / 10 : 0,
    averageRiskScore: avgRisk,
    activeAlerts: store.alerts.filter(a => !a.read).length,
  };

  res.json({ success: true, data });
});

// GET /api/analytics/delay-patterns — delay trend data
router.get('/delay-patterns', (req, res) => {
  res.json({
    success: true,
    data: {
      monthlyTrend: store.analytics.monthlyTrend,
      topDelayReasons: store.analytics.topDelayReasons,
      routePerformance: store.analytics.routePerformance,
    }
  });
});

// GET /api/analytics/risk-heatmap — risk by region
router.get('/risk-heatmap', (req, res) => {
  const heatmap = store.shipments.map(s => ({
    id: s.id,
    trackingNumber: s.trackingNumber,
    origin: s.origin,
    destination: s.destination,
    riskLevel: s.riskLevel,
    status: s.status,
    coordinates: s.route?.[0] ? { lat: s.route[0].lat, lng: s.route[0].lng } : null,
  }));

  res.json({ success: true, data: heatmap });
});

module.exports = router;
