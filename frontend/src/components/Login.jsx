import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, LogIn, AlertCircle, Sparkles } from 'lucide-react';

export default function Login({ onSwitchToRegister }) {
  const { login, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!email || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setLocalError(err.message || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoFill = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <h2>Welcome Back</h2>
        <p>Sign in to access your FeeBridge account and student fee portal</p>
      </div>

      {(localError || error) && (
        <div className="alert-error">
          <AlertCircle size={18} />
          <span>{localError || error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <div className="input-icon-wrapper">
            <Mail className="input-icon" size={18} />
            <input
              id="email"
              type="email"
              placeholder="parent@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div className="input-icon-wrapper">
            <Lock className="input-icon" size={18} />
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? (
            <span className="spinner-row">
              <span className="spinner"></span> Signing in...
            </span>
          ) : (
            <span className="btn-content">
              <LogIn size={18} /> Sign In
            </span>
          )}
        </button>
      </form>

      <div className="auth-footer">
        <p>
          Don't have an account?{' '}
          <button type="button" onClick={onSwitchToRegister} className="btn-link">
            Create Parent Account
          </button>
        </p>
      </div>

      <div className="demo-credentials-box">
        <div className="demo-title">
          <Sparkles size={14} />
          <span>Quick Demo / Testing</span>
        </div>
        <div className="demo-actions">
          <button
            type="button"
            className="btn-demo btn-demo-parent"
            onClick={() => handleDemoFill('tinsaye@gmail.com', '12345678')}
          >
            Parent Demo
          </button>
          <button
            type="button"
            className="btn-demo btn-demo-staff"
            onClick={() => handleDemoFill('newstaff@example.com', '12345678')}
          >
            Staff Demo
          </button>
          <button
            type="button"
            className="btn-demo btn-demo-admin"
            onClick={() => handleDemoFill('bini@gmail.com', '12345678')}
          >
            Admin Demo
          </button>
        </div>
      </div>
    </div>
  );
}
