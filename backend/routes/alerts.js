/**
 * Alerts Routes
 * Smart notification management
 */
const express = require('express');
const router = express.Router();
const { store } = require('../data/mockData');

// GET /api/alerts — all alerts (unread first)
router.get('/', (req, res) => {
  const { unreadOnly } = req.query;
  let alerts = [...store.alerts];

  if (unreadOnly === 'true') {
    alerts = alerts.filter(a => !a.read);
  }

  // Sort: unread first, then by date
  alerts.sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  res.json({
    success: true,
    count: alerts.length,
    unreadCount: alerts.filter(a => !a.read).length,
    data: alerts
  });
});

// GET /api/alerts/:id — single alert
router.get('/:id', (req, res) => {
  const alert = store.alerts.find(a => a.id === req.params.id);
  if (!alert) {
    return res.status(404).json({ success: false, message: 'Alert not found' });
  }
  res.json({ success: true, data: alert });
});

// POST /api/alerts — create alert
router.post('/', (req, res) => {
  const { shipmentId, type, title, message, trackingNumber } = req.body;

  if (!title || !message) {
    return res.status(400).json({ success: false, message: 'title and message are required' });
  }

  const newAlert = {
    id: `ALT-${Date.now()}`,
    shipmentId: shipmentId || null,
    trackingNumber: trackingNumber || null,
    type: type || 'info',
    title,
    message,
    read: false,
    createdAt: new Date().toISOString(),
  };

  store.alerts.unshift(newAlert);
  res.status(201).json({ success: true, data: newAlert });
});

// PUT /api/alerts/:id/read — mark as read
router.put('/:id/read', (req, res) => {
  const idx = store.alerts.findIndex(a => a.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Alert not found' });
  }
  store.alerts[idx].read = true;
  res.json({ success: true, data: store.alerts[idx] });
});

// PUT /api/alerts/read-all — mark all as read
router.put('/read-all/all', (req, res) => {
  store.alerts.forEach(a => (a.read = true));
  res.json({ success: true, message: 'All alerts marked as read' });
});

// DELETE /api/alerts/:id
router.delete('/:id', (req, res) => {
  const idx = store.alerts.findIndex(a => a.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Alert not found' });
  }
  store.alerts.splice(idx, 1);
  res.json({ success: true, message: 'Alert deleted' });
});

module.exports = router;
