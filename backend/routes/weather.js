/**
 * Weather Routes
 * GET /api/weather/:city
 */
const express = require('express');

const router = express.Router();

const WEATHER_API_KEY =
  process.env.WEATHER_API_KEY ||
  process.env.WEATHERAPI_KEY ||
  process.env.WEATHER_APIKEY;

router.get('/:city', async (req, res) => {
  try {
    const city = String(req.params.city || '').trim();
    if (!city) {
      return res.status(400).json({ success: false, message: 'City is required' });
    }

    if (!WEATHER_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'Weather API key is not configured on server'
      });
    }

    console.log('[WEATHER] input:', { city });

    const endpoint = `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(city)}&aqi=no`;
    const apiRes = await fetch(endpoint);
    const apiJson = await apiRes.json();

    if (!apiRes.ok) {
      const msg = apiJson?.error?.message || 'Failed to fetch weather data';
      return res.status(apiRes.status).json({ success: false, message: msg });
    }

    const data = {
      temp: Number(apiJson?.current?.temp_c ?? 0),
      condition: String(apiJson?.current?.condition?.text || 'Unknown'),
      humidity: Number(apiJson?.current?.humidity ?? 0),
      wind: Number(apiJson?.current?.wind_kph ?? 0),
      location: `${apiJson?.location?.name || city}${apiJson?.location?.country ? `, ${apiJson.location.country}` : ''}`,
    };

    console.log('[WEATHER] output:', data);
    res.json({ success: true, data });
  } catch (error) {
    console.error('[WEATHER] failed:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch weather'
    });
  }
});

module.exports = router;
