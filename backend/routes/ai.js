/**
 * AI Routes — Delay Prediction, Route Optimization, Chat
 * All powered by Google Gemini API
 */
const express = require('express');
const router = express.Router();
const { predictDelay, optimizeRoute, chat } = require('../services/geminiService');
const { store } = require('../data/mockData');

// POST /api/ai/predict — predict delay for a shipment
router.post('/predict', async (req, res) => {
  try {
    const { shipmentId, ...directData } = req.body || {};

    let shipmentData = directData;

    // If shipmentId provided, merge store shipment data with direct request data.
    if (shipmentId) {
      const shipment = store.shipments.find(s => s.id === shipmentId);
      if (!shipment) {
        return res.status(404).json({ success: false, message: 'Shipment not found' });
      }
      shipmentData = { ...shipment, ...directData, shipmentId };
    }

    if (!shipmentData.origin || !shipmentData.destination) {
      return res.status(400).json({
        success: false,
        message: 'shipmentId or shipment data (origin, destination) is required'
      });
    }

    console.log('[AI/PREDICT] input:', {
      shipmentId: shipmentId || shipmentData.id || null,
      origin: shipmentData.origin,
      destination: shipmentData.destination,
      cargo: shipmentData.cargo,
      weather: shipmentData.weather,
      traffic: shipmentData.traffic,
      riskLevel: shipmentData.riskLevel,
    });

    const prediction = await predictDelay(shipmentData);
    console.log('[AI/PREDICT] output:', prediction);

    // Update shipment risk level in store
    if (shipmentId) {
      const idx = store.shipments.findIndex(s => s.id === shipmentId);
      if (idx !== -1) {
        store.shipments[idx].riskLevel = prediction.delayProbability;
        // Auto-update status
        if (prediction.delayProbability >= 75) {
          store.shipments[idx].status = 'delayed';
        } else if (prediction.delayProbability >= 40) {
          store.shipments[idx].status = 'risk';
        } else {
          store.shipments[idx].status = 'on-time';
        }

        // Auto-create alert if high risk
        if (prediction.delayProbability >= 65) {
          const alertExists = store.alerts.some(a => a.shipmentId === shipmentId && !a.read);
          if (!alertExists) {
            store.alerts.unshift({
              id: `ALT-${Date.now()}`,
              shipmentId,
              trackingNumber: store.shipments[idx].trackingNumber,
              type: prediction.delayProbability >= 80 ? 'critical' : 'warning',
              title: `AI Alert: ${prediction.primaryReason}`,
              message: prediction.recommendedAction,
              read: false,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    res.json({ success: true, data: prediction });
  } catch (error) {
    console.error('[AI/PREDICT] failed:', error.message);
    res.status(500).json({ success: false, message: error.message || 'Prediction failed' });
  }
});

// POST /api/ai/route — optimize route for a shipment
router.post('/route', async (req, res) => {
  try {
    const {
      shipmentId,
      origin,
      destination,
      cargo,
      cargoType,
      weather,
      traffic,
      issues,
      priority
    } = req.body || {};

    let routeData = {
      origin,
      destination,
      cargoType: cargoType || cargo,
      weather,
      traffic,
      issues,
      priority
    };

    if (shipmentId) {
      const shipment = store.shipments.find(s => s.id === shipmentId);
      if (shipment) {
        const shipmentDefaults = {
          origin: shipment.origin,
          destination: shipment.destination,
          cargoType: shipment.cargo,
          weather: shipment.weather,
          traffic: shipment.traffic,
          issues: `${shipment.weather}, ${shipment.traffic}`,
          priority: priority || 'balanced',
        };

        // Keep explicit request fields when provided, otherwise use shipment defaults.
        routeData = {
          ...shipmentDefaults,
          origin: origin || shipmentDefaults.origin,
          destination: destination || shipmentDefaults.destination,
          cargoType: cargoType || cargo || shipmentDefaults.cargoType,
          weather: weather || shipmentDefaults.weather,
          traffic: traffic || shipmentDefaults.traffic,
          issues: issues || shipmentDefaults.issues,
          priority: priority || shipmentDefaults.priority,
        };
      }
    }

    if (!routeData.origin || !routeData.destination) {
      return res.status(400).json({
        success: false,
        message: 'origin and destination are required'
      });
    }

    console.log('[AI/ROUTE] input:', routeData);
    const optimization = await optimizeRoute(routeData);
    console.log('[AI/ROUTE] output:', optimization);
    res.json({ success: true, data: optimization });
  } catch (error) {
    console.error('[AI/ROUTE] failed:', error.message);
    res.status(500).json({ success: false, message: error.message || 'Route optimization failed' });
  }
});

// POST /api/ai/chat — conversational AI assistant
router.post('/chat', async (req, res) => {
  const { message, conversationHistory } = req.body;

  if (!message || message.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Message is required' });
  }

  const response = await chat(message.trim(), conversationHistory || []);
  res.json({
    success: true,
    data: {
      message: response,
      timestamp: new Date().toISOString(),
    }
  });
});

module.exports = router;
