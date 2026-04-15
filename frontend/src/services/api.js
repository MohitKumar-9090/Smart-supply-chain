/**
 * API Service — Axios client for SmartChain AI backend
 */
import axios from 'axios';

const normalizeApiBase = (input) => {
  const fallback = import.meta.env.PROD
    ? 'https://smart-supply-chain.onrender.com/api'
    : 'http://localhost:5000/api';
  const raw = (input || fallback).trim();

  try {
    const url = new URL(raw);
    url.pathname = url.pathname.replace(/\/+$/, '');
    if (!url.pathname.endsWith('/api')) {
      url.pathname = `${url.pathname}/api`.replace(/\/{2,}/g, '/');
    }
    return url.toString().replace(/\/+$/, '');
  } catch {
    return fallback;
  }
};

const API_BASE = normalizeApiBase(import.meta.env.VITE_API_URL);

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor (add auth token when available)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sc_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor (unified error handling)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const msg = error.response?.data?.message || error.message || 'Request failed';
    return Promise.reject(new Error(msg));
  }
);

// API response helpers for backend shape: { success, data, ...meta }
export const getApiPayload = (response) => response?.data || {};
export const getApiData = (response, fallback = null) => {
  const payload = getApiPayload(response);
  return payload?.data ?? fallback;
};

if (import.meta.env.DEV) {
  console.log('[API] Base URL:', API_BASE);
}

// ─── Shipments ───────────────────────────────
export const shipmentsApi = {
  getAll: (params) => api.get('/shipments', { params }),
  getById: (id) => api.get(`/shipments/${id}`),
  create: (data) => api.post('/shipments', data),
  update: (id, data) => api.put(`/shipments/${id}`, data),
  delete: (id) => api.delete(`/shipments/${id}`),
};

// ─── AI ──────────────────────────────────────
export const aiApi = {
  predict: (data) => api.post('/ai/predict', data),
  optimizeRoute: (data) => api.post('/ai/route', data),
  chat: (message, conversationHistory) =>
    api.post('/ai/chat', { message, conversationHistory }),
};

// ─── Alerts ──────────────────────────────────
export const alertsApi = {
  getAll: (params) => api.get('/alerts', { params }),
  markRead: (id) => api.put(`/alerts/${id}/read`),
  markAllRead: () => api.put('/alerts/read-all/all'),
  create: (data) => api.post('/alerts', data),
  delete: (id) => api.delete(`/alerts/${id}`),
};

// ─── Analytics ────────────────────────────────
export const analyticsApi = {
  getSummary: () => api.get('/analytics/summary'),
  getDelayPatterns: () => api.get('/analytics/delay-patterns'),
  getRiskHeatmap: () => api.get('/analytics/risk-heatmap'),
};

// ─── Health ───────────────────────────────────
export const healthApi = {
  check: () => api.get('/health'),
};

export default api;
