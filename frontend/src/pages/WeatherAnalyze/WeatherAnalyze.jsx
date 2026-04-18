import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import './weatherAnalyze.css';

const API_URL = (import.meta.env.VITE_API_URL || 'https://smart-supply-chain.onrender.com')
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');

const getRiskLabel = (conditionText = '') => {
  const condition = conditionText.toLowerCase();
  if (condition.includes('rain') || condition.includes('storm') || condition.includes('thunder')) {
    return { label: 'High', className: 'high' };
  }
  if (condition.includes('cloud')) {
    return { label: 'Medium', className: 'medium' };
  }
  if (condition.includes('clear') || condition.includes('sun')) {
    return { label: 'Low', className: 'low' };
  }
  return { label: 'Medium', className: 'medium' };
};

const getRiskFromAlert = (alert = null) => {
  const type = String(alert?.type || '').toUpperCase();
  if (type === 'CRITICAL' || type === 'HIGH RISK' || type === 'HEAT ALERT') {
    return { label: type || 'High', className: 'high' };
  }
  if (type === 'WARNING') {
    return { label: type, className: 'medium' };
  }
  if (type === 'SAFE') {
    return { label: 'SAFE', className: 'low' };
  }
  return null;
};

const WeatherAnalyze = () => {
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [weather, setWeather] = useState(null);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (error) {
      setError('');
    }
  }, [location]);

  const handleCheckWeather = async (e) => {
    e.preventDefault();
    const trimmed = location.trim();
    if (!trimmed) {
      toast.error('Please enter a city or location');
      return;
    }

    setLoading(true);
    setError('');
    setWeather(null);
    setAlert(null);

    try {
      const endpoint = `${API_URL}/api/weather/${encodeURIComponent(trimmed)}`;
      console.log('[WeatherAnalyze] calling API:', endpoint);
      const weatherRes = await fetch(endpoint);
      const weatherJson = await weatherRes.json();

      if (!weatherRes.ok || !weatherJson?.success || !weatherJson?.weather || !weatherJson?.alert) {
        throw new Error(weatherJson?.message || 'Weather data unavailable');
      }

      const data = weatherJson.weather;
      const alertData = weatherJson.alert;
      const condition = String(data.condition || 'Unknown');
      const risk = getRiskFromAlert(alertData) || getRiskLabel(condition);
      console.log('[WeatherAnalyze] response:', { weather: data, alert: alertData });

      setWeather({
        place: data.location || trimmed,
        temperature: data.temp === null || data.temp === undefined ? '--' : Math.round(Number(data.temp)),
        humidity:
          typeof data.humidity === 'number'
            ? Math.round(Number(data.humidity || 0))
            : data.humidity || 'N/A',
        windSpeed: data.wind === null || data.wind === undefined ? '--' : Math.round(Number(data.wind)),
        condition,
        conditionEmoji:
          condition.toLowerCase().includes('rain') || condition.toLowerCase().includes('storm')
            ? '🌧️'
            : condition.toLowerCase().includes('cloud')
              ? '☁️'
              : '☀️',
        risk,
        source: data.source || 'Unknown',
      });
      setAlert(alertData);
    } catch (err) {
      setError(err.message || 'Failed to fetch weather');
      toast.error(err.message || 'Failed to fetch weather');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">☁️ Weather Analyze</h1>
          <p className="page-subtitle">Check live weather conditions and route risk indicators</p>
        </div>
      </div>

      <div className="weather-layout">
        <div className="card weather-form-card">
          <div className="card-title">🌍 Location Input</div>
          <form className="weather-form" onSubmit={handleCheckWeather}>
            <div className="form-group">
              <label className="form-label">City / Location</label>
              <input
                className="form-input"
                placeholder="Enter city (e.g., Mumbai, London, New York)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <button type="submit" className="btn weather-check-btn w-full" disabled={loading}>
              {loading ? 'Checking...' : 'Check Weather'}
            </button>
          </form>
        </div>

        <div className="card weather-result-card">
          {loading && (
            <div className="weather-empty">
              <div className="weather-loading-spinner" />
              <div className="weather-empty-title">Checking Weather...</div>
              <div className="weather-empty-text">Fetching latest weather data for {location.trim() || 'selected location'}.</div>
            </div>
          )}

          {!weather && !loading && !error && (
            <div className="weather-empty">
              <div className="weather-empty-icon">🌤️</div>
              <div className="weather-empty-title">Ready to Analyze</div>
              <div className="weather-empty-text">
                Enter a location and run weather analysis to view temperature, condition, humidity, wind, and risk.
              </div>
            </div>
          )}

          {error && (
            <div className="weather-empty">
              <div className="weather-empty-icon">⚠️</div>
              <div className="weather-empty-title">Unable to Fetch</div>
              <div className="weather-empty-text">{error}</div>
            </div>
          )}

          {weather && (
            <div className="weather-result-wrap">
              <div className="weather-result-head">
                <div>
                  <div className="weather-location">{weather.place}</div>
                  <div className="weather-condition">{weather.conditionEmoji} {weather.condition} · {weather.source}</div>
                </div>
                <div className="weather-temp">{weather.temperature}°C</div>
              </div>

              <div className="weather-grid">
                <div className="weather-stat">
                  <div className="weather-stat-label">Temperature 🌡️</div>
                  <div className="weather-stat-value">{weather.temperature}°C</div>
                </div>
                <div className="weather-stat">
                  <div className="weather-stat-label">Humidity 💧</div>
                  <div className="weather-stat-value">{weather.humidity}%</div>
                </div>
                <div className="weather-stat">
                  <div className="weather-stat-label">Wind 🌬️</div>
                  <div className="weather-stat-value">{weather.windSpeed} km/h</div>
                </div>
                <div className="weather-stat">
                  <div className="weather-stat-label">Risk Indicator</div>
                  <div className={`weather-risk ${weather.risk.className}`}>
                    {alert?.type || weather.risk.label}
                  </div>
                </div>
              </div>

              {alert && (
                <div className="weather-alert-line">
                  <span className={`weather-alert-dot ${weather.risk.className}`} />
                  <span className="weather-alert-text">
                    {alert.title}: {alert.message}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeatherAnalyze;
