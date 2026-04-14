/**
 * SmartChain AI — Main Application
 * React Router setup, layout, global alert count
 */
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Layout Components
import Sidebar from './components/Sidebar/Sidebar';
import Header from './components/Header/Header';

// Pages
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Shipments from './pages/Shipments/Shipments';
import ShipmentDetail from './pages/ShipmentDetail/ShipmentDetail';
import Analytics from './pages/Analytics/Analytics';
import Alerts from './pages/Alerts/Alerts';
import Chat from './pages/Chat/Chat';
import RouteOptimizer from './pages/RouteOptimizer/RouteOptimizer';
import Predictions from './pages/Predictions/Predictions';

// Services
import { alertsApi, getApiPayload } from './services/api';

// Page metadata for header
const PAGE_META = {
  '/': { title: 'Command Center', subtitle: 'Real-time supply chain overview' },
  '/shipments': { title: 'Shipments', subtitle: 'Track all active shipments' },
  '/analytics': { title: 'Analytics', subtitle: 'Performance insights & trends' },
  '/alerts': { title: 'Smart Alerts', subtitle: 'Notifications & risk triggers' },
  '/chat': { title: 'AI Assistant', subtitle: 'Powered by Google Gemini' },
  '/routes': { title: 'Route Optimizer', subtitle: 'AI-powered path optimization' },
  '/predictions': { title: 'AI Predictions', subtitle: 'Delay forecasting engine' },
};

const AppLayout = ({ children, alertCount, onAlertCountChange }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const path = window.location.pathname;
  const meta = PAGE_META[path] || PAGE_META['/'];

  return (
    <div className="app-layout">
      <Sidebar alertCount={alertCount} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="mobile-overlay" onClick={() => setIsSidebarOpen(false)}></div>
      )}
      <div className="main-content">
        <Header title={meta.title} subtitle={meta.subtitle} alertCount={alertCount} onMenuClick={() => setIsSidebarOpen(true)} />
        <main>
          {React.cloneElement(children, { onAlertCountChange })}
        </main>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children, role, setRole }) => {
  if (!role) {
    return <Navigate to="/login" replace />;
  }
  return React.cloneElement(children, { role, setRole });
};

function App() {
  const [alertCount, setAlertCount] = useState(0);
  const [role, setRole] = useState(localStorage.getItem('sc_role'));

  // Fetch initial unread alert count
  useEffect(() => {
    alertsApi.getAll({ unreadOnly: true })
      .then((res) => {
        const payload = getApiPayload(res);
        console.log('[App] unread alerts payload:', payload);
        setAlertCount(payload.unreadCount || 0);
      })
      .catch((err) => {
        console.error('[App] failed to fetch unread alerts:', err.message);
      });
  }, []);

  return (
    <BrowserRouter>
      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-medium)',
            borderRadius: '10px',
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#f43f5e', secondary: '#fff' } },
        }}
      />

      <Routes>
        <Route path="/login" element={<Login onLogin={setRole} />} />
        
        <Route path="/" element={
          <ProtectedRoute role={role} setRole={setRole}>
            <AppLayout alertCount={alertCount} onAlertCountChange={setAlertCount}>
              <Dashboard />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/shipments" element={
          <ProtectedRoute role={role} setRole={setRole}>
            <AppLayout alertCount={alertCount} onAlertCountChange={setAlertCount}>
              <Shipments />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/shipments/:id" element={
          <ProtectedRoute role={role} setRole={setRole}>
            <AppLayout alertCount={alertCount} onAlertCountChange={setAlertCount}>
              <ShipmentDetail />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute role={role} setRole={setRole}>
            <AppLayout alertCount={alertCount} onAlertCountChange={setAlertCount}>
              <Analytics />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/alerts" element={
          <ProtectedRoute role={role} setRole={setRole}>
            <AppLayout alertCount={alertCount} onAlertCountChange={setAlertCount}>
              <Alerts onAlertCountChange={setAlertCount} />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/chat" element={
          <ProtectedRoute role={role} setRole={setRole}>
            <AppLayout alertCount={alertCount} onAlertCountChange={setAlertCount}>
              <Chat />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/routes" element={
          <ProtectedRoute role={role} setRole={setRole}>
            <AppLayout alertCount={alertCount} onAlertCountChange={setAlertCount}>
              <RouteOptimizer />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/predictions" element={
          <ProtectedRoute role={role} setRole={setRole}>
            <AppLayout alertCount={alertCount} onAlertCountChange={setAlertCount}>
              <Predictions />
            </AppLayout>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
