import React from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './login.css';

const Login = ({ onLogin }) => {
  const navigate = useNavigate();

  const handleLogin = (role) => {
    localStorage.setItem('sc_role', role);
    onLogin(role);
    toast.success(`Logged in as ${role.toUpperCase()}`);
    navigate('/');
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="login-logo-icon">🔗</div>
          <h1>SmartChain AI</h1>
          <p>Hackathon Demo Portal</p>
        </div>

        <div className="login-options">
          <button className="login-btn admin-btn" onClick={() => handleLogin('admin')}>
            <span className="btn-icon">🛡️</span>
            <div className="btn-text">
              <strong>Login as Admin</strong>
              <span>Full control (Add/Edit/Delete shipments)</span>
            </div>
            <span className="btn-arrow">→</span>
          </button>

          <button className="login-btn user-btn" onClick={() => handleLogin('user')}>
            <span className="btn-icon">👤</span>
            <div className="btn-text">
              <strong>Continue as User</strong>
              <span>View-only (Tracking and Analytics)</span>
            </div>
            <span className="btn-arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
