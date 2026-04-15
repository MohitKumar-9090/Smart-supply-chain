/**
 * SmartChain AI — Express Server
 * Main entry point for the backend API
 */
require('dotenv').config();
require('express-async-errors'); // Automatic async error handling

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5000;

const parseAllowedOrigins = () => {
  const fromClientUrl = (process.env.CLIENT_URL || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  const fromClientUrls = (process.env.CLIENT_URLS || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  return [
    ...new Set([
      ...fromClientUrl,
      ...fromClientUrls,
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
    ]),
  ];
};

const allowedOrigins = parseAllowedOrigins();

// ─── Security & Middleware ──────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging (dev mode)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ─── Routes ────────────────────────────────────────────
app.use('/api/shipments', require('./routes/shipments'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/analytics', require('./routes/analytics'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    app: 'SmartChain AI Backend',
    gemini: process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here'
      ? 'configured'
      : 'mock mode',
  });
});

// ─── 404 Handler ───────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ─── Global Error Handler ───────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// ─── Start Server ───────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 SmartChain AI Backend');
  console.log('─────────────────────────────────');
  console.log(`🌐 Server:  http://localhost:${PORT}`);
  console.log(`📦 API:     http://localhost:${PORT}/api`);
  console.log(`❤️  Health:  http://localhost:${PORT}/api/health`);
  console.log('─────────────────────────────────');
  console.log(`🤖 Gemini:  ${process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here' ? '✅ Configured' : '⚠️  Mock mode (add GEMINI_API_KEY)'}`);
  console.log('');
});

module.exports = app;
