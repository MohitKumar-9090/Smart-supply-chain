/**
 * Weather service
 * - Primary: WeatherAPI
 * - Fallback: Open-Meteo (no API key)
 */
require('dotenv').config();

const WEATHER_API_KEY =
  process.env.WEATHER_API_KEY ||
  process.env.WEATHERAPI_KEY ||
  process.env.WEATHER_APIKEY;

const toNumber = (value, fallback = null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeCondition = (condition = '') => String(condition || 'Unknown').trim();

const getWeatherFromWeatherApi = async (city) => {
  if (!WEATHER_API_KEY) {
    throw new Error('WeatherAPI key not configured');
  }

  const endpoint = `http://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(city)}`;
  const res = await fetch(endpoint);
  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.error?.message || 'WeatherAPI request failed');
  }

  return {
    temp: toNumber(json?.current?.temp_c, 0),
    condition: normalizeCondition(json?.current?.condition?.text),
    humidity: toNumber(json?.current?.humidity, 0),
    wind: toNumber(json?.current?.wind_kph, 0),
    location: `${json?.location?.name || city}${json?.location?.country ? `, ${json.location.country}` : ''}`,
    source: 'WeatherAPI',
  };
};

const getWeatherFromOpenMeteo = async (city) => {
  const geoEndpoint = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const geoRes = await fetch(geoEndpoint);
  const geoJson = await geoRes.json();

  if (!geoRes.ok) {
    throw new Error(geoJson?.reason || 'Open-Meteo geocoding failed');
  }

  const first = geoJson?.results?.[0];
  if (!first) {
    throw new Error('City not found in Open-Meteo geocoding');
  }

  const lat = first.latitude;
  const lon = first.longitude;

  const weatherEndpoint = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
  const weatherRes = await fetch(weatherEndpoint);
  const weatherJson = await weatherRes.json();

  if (!weatherRes.ok || !weatherJson?.current_weather) {
    throw new Error('Open-Meteo weather request failed');
  }

  return {
    temp: toNumber(weatherJson.current_weather.temperature, 0),
    wind: toNumber(weatherJson.current_weather.windspeed, 0),
    condition: 'Unknown',
    humidity: 'N/A',
    location: `${first.name}${first.country ? `, ${first.country}` : ''}`,
    source: 'Open-Meteo',
  };
};

async function getWeather(city) {
  const trimmed = String(city || '').trim();
  if (!trimmed) {
    throw new Error('City is required');
  }

  try {
    return await getWeatherFromWeatherApi(trimmed);
  } catch (primaryErr) {
    console.warn('[WEATHER] WeatherAPI failed, using Open-Meteo fallback:', primaryErr.message);
    try {
      return await getWeatherFromOpenMeteo(trimmed);
    } catch (fallbackErr) {
      console.error('[WEATHER] Open-Meteo fallback failed:', fallbackErr.message);
      // Degraded but structured response so client can still render.
      return {
        temp: null,
        condition: 'Unknown',
        humidity: 'N/A',
        wind: null,
        location: trimmed,
        source: 'Fallback',
      };
    }
  }
}

function generateWeatherAlert(data) {
  const condition = String(data?.condition || '').toLowerCase();
  const wind = toNumber(data?.wind, 0) || 0;
  const temp = toNumber(data?.temp, 0) || 0;
  const source = data?.source || 'Unknown';
  const time = new Date().toISOString();

  if (wind > 60) {
    return {
      type: 'CRITICAL',
      title: 'Critical Wind Alert',
      message: `Wind speed is ${wind} km/h. Immediate operational caution is advised.`,
      riskLevel: 95,
      source,
      time,
    };
  }

  if (wind > 30) {
    return {
      type: 'WARNING',
      title: 'Wind Warning',
      message: `Wind speed is ${wind} km/h. Monitor route stability and transit windows.`,
      riskLevel: 70,
      source,
      time,
    };
  }

  if (temp > 40) {
    return {
      type: 'HEAT ALERT',
      title: 'Extreme Heat Alert',
      message: `Temperature is ${temp}°C. Heat-sensitive cargo may require mitigation.`,
      riskLevel: 82,
      source,
      time,
    };
  }

  if (condition.includes('rain') || condition.includes('storm')) {
    return {
      type: 'HIGH RISK',
      title: 'Weather High Risk',
      message: `Condition "${data?.condition}" may impact route performance.`,
      riskLevel: 78,
      source,
      time,
    };
  }

  return {
    type: 'SAFE',
    title: 'Weather Stable',
    message: 'Current weather conditions are within safe operating thresholds.',
    riskLevel: 20,
    source,
    time,
  };
}

module.exports = {
  getWeather,
  generateWeatherAlert,
};
