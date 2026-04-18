/**
 * Weather Routes
 * GET /api/weather/:city
 */
const express = require('express');
const { getWeather, generateWeatherAlert } = require('../services/weatherService');

const router = express.Router();

router.get('/:city', async (req, res) => {
  try {
    const city = String(req.params.city || '').trim();
    if (!city) {
      return res.status(400).json({ success: false, message: 'City is required' });
    }

    console.log('[WEATHER] input:', { city });
    const weather = await getWeather(city);
    const alert = generateWeatherAlert(weather);

    console.log('[WEATHER] output:', { weather, alert });
    res.json({
      success: true,
      weather,
      alert,
      // backward compatibility for existing clients
      data: weather,
    });
  } catch (error) {
    console.error('[WEATHER] failed:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch weather'
    });
  }
});

module.exports = router;
