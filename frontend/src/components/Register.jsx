import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Lock, UserPlus, AlertCircle } from 'lucide-react';

export default function Register({ onSwitchToLogin }) {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    gender: 'MALE',
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (formData.password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      await register(formData);
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <h2>Create Parent Account</h2>
        <p>Register as a parent to manage tuition payments and view invoices</p>
      </div>

      {errorMsg && (
        <div className="alert-error">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="first_name">First Name</label>
            <div className="input-icon-wrapper">
              <User className="input-icon" size={18} />
              <input
                id="first_name"
                name="first_name"
                type="text"
                placeholder="Abebe"
                value={formData.first_name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="last_name">Last Name</label>
            <div className="input-icon-wrapper">
              <User className="input-icon" size={18} />
              <input
                id="last_name"
                name="last_name"
                type="text"
                placeholder="Kebede"
                value={formData.last_name}
                onChange={handleChange}
                required
              />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <div className="input-icon-wrapper">
            <Mail className="input-icon" size={18} />
            <input
              id="email"
              name="email"
              type="email"
              placeholder="parent@example.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="phone_number">Phone Number</label>
            <div className="input-icon-wrapper">
              <Phone className="input-icon" size={18} />
              <input
                id="phone_number"
                name="phone_number"
                type="tel"
                placeholder="+251911223344"
                value={formData.phone_number}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="gender">Gender</label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="select-input"
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="password">Password (min 8 characters)</label>
          <div className="input-icon-wrapper">
            <Lock className="input-icon" size={18} />
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={8}
            />
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? (
            <span className="spinner-row">
              <span className="spinner"></span> Creating Account...
            </span>
          ) : (
            <span className="btn-content">
              <UserPlus size={18} /> Complete Registration
            </span>
          )}
        </button>
      </form>

      <div className="auth-footer">
        <p>
          Already have an account?{' '}
          <button type="button" onClick={onSwitchToLogin} className="btn-link">
            Sign In here
          </button>
        </p>
      </div>
    </div>
  );
}
