/**
 * Shipments Routes
 * CRUD operations for supply chain shipments
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { store } = require('../data/mockData');

// GET /api/shipments — list all shipments (with optional status filter)
router.get('/', (req, res) => {
  let { status, search, sortBy = 'createdAt', order = 'desc' } = req.query;
  let results = [...store.shipments];

  // Filter by status
  if (status && status !== 'all') {
    results = results.filter(s => s.status === status);
  }

  // Search by tracking number, origin, or destination
  if (search) {
    const q = search.toLowerCase();
    results = results.filter(s =>
      s.trackingNumber.toLowerCase().includes(q) ||
      s.origin.toLowerCase().includes(q) ||
      s.destination.toLowerCase().includes(q) ||
      s.cargo.toLowerCase().includes(q)
    );
  }

  // Sort
  results.sort((a, b) => {
    if (order === 'asc') return a[sortBy] > b[sortBy] ? 1 : -1;
    return a[sortBy] < b[sortBy] ? 1 : -1;
  });

  res.json({ success: true, count: results.length, data: results });
});

// GET /api/shipments/:id — single shipment
router.get('/:id', (req, res) => {
  const shipment = store.shipments.find(s => s.id === req.params.id);
  if (!shipment) {
    return res.status(404).json({ success: false, message: 'Shipment not found' });
  }
  res.json({ success: true, data: shipment });
});

// POST /api/shipments — create new shipment
router.post('/', (req, res) => {
  const {
    origin, destination, cargo, weight, carrier,
    estimatedDelivery, description, weather, traffic
  } = req.body;

  if (!origin || !destination || !cargo) {
    return res.status(400).json({
      success: false,
      message: 'origin, destination, and cargo are required'
    });
  }

  const newShipment = {
    id: `SHP-${String(store.shipments.length + 1).padStart(3, '0')}`,
    trackingNumber: `TC-2024-${String(store.shipments.length + 1).padStart(3, '0')}`,
    origin,
    destination,
    cargo: cargo || 'General Cargo',
    weight: weight || 'Not specified',
    carrier: carrier || 'Unassigned',
    status: 'on-time',
    riskLevel: 10,
    estimatedDelivery: estimatedDelivery || new Date(Date.now() + 7 * 86400000).toISOString(),
    actualDelivery: null,
    weather: weather || 'Unknown',
    traffic: traffic || 'Normal',
    description: description || '',
    route: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.shipments.unshift(newShipment);
  res.status(201).json({ success: true, data: newShipment });
});

// PUT /api/shipments/:id — update shipment status/details
router.put('/:id', (req, res) => {
  const idx = store.shipments.findIndex(s => s.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Shipment not found' });
  }

  const updated = {
    ...store.shipments[idx],
    ...req.body,
    id: req.params.id, // prevent id mutation
    updatedAt: new Date().toISOString(),
  };

  store.shipments[idx] = updated;
  res.json({ success: true, data: updated });
});

// DELETE /api/shipments/:id
router.delete('/:id', (req, res) => {
  const idx = store.shipments.findIndex(s => s.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Shipment not found' });
  }
  store.shipments.splice(idx, 1);
  res.json({ success: true, message: 'Shipment deleted' });
});

module.exports = router;
