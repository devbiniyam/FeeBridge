import React, { useState } from 'react';
import { Mail, Lock, KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, Send } from 'lucide-react';
import { authService } from '../services/api';

export default function ForgotPassword({ onSwitchToLogin }) {
  const [step, setStep] = useState(1); // 1: Email, 2: Code & New Password, 3: Success
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [demoCodeHint, setDemoCodeHint] = useState('');

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!email) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await authService.requestPasswordReset(email.trim());
      if (res.demo_code_hint) {
        setDemoCodeHint(res.demo_code_hint);
      }
      setStep(2);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to send reset code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!code || code.trim().length !== 6) {
      setErrorMessage('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-check.');
      return;
    }

    setSubmitting(true);
    try {
      await authService.confirmPasswordReset({
        email: email.trim(),
        code: code.trim(),
        new_password: newPassword,
      });
      setStep(3);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to reset password. Please verify the code.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-card">
      {step === 1 && (
        <>
          <div className="auth-header">
            <h2>Reset Password</h2>
            <p>Enter your registered email address to receive a 6-digit verification code</p>
          </div>

          {errorMessage && (
            <div className="alert-error">
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleRequestCode} className="auth-form">
            <div className="form-group">
              <label htmlFor="reset-email">Email Address</label>
              <div className="input-icon-wrapper">
                <Mail className="input-icon" size={18} />
                <input
                  id="reset-email"
                  type="email"
                  placeholder="parent@feebridge.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? (
                <span className="spinner-row">
                  <span className="spinner"></span> Sending Code...
                </span>
              ) : (
                <span className="btn-content">
                  <Send size={18} /> Send Reset Code
                </span>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <button
              type="button"
              onClick={() => onSwitchToLogin(email)}
              className="btn-link btn-back-row"
            >
              <ArrowLeft size={16} /> Back to Sign In
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="auth-header">
            <h2>Verify Code & New Password</h2>
            <p>
              We sent a verification code to <strong>{email}</strong>
            </p>
          </div>

          {demoCodeHint && (
            <div className="alert-info" style={{ marginBottom: '16px' }}>
              <span>Verification code sent to email. Code: <strong>{demoCodeHint}</strong></span>
            </div>
          )}

          {errorMessage && (
            <div className="alert-error">
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleConfirmReset} className="auth-form">
            <div className="form-group">
              <label htmlFor="reset-code">6-Digit Verification Code</label>
              <div className="input-icon-wrapper">
                <KeyRound className="input-icon" size={18} />
                <input
                  id="reset-code"
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  required
                  style={{ letterSpacing: '4px', fontSize: '1.1rem', fontWeight: 600 }}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="new-password">New Password (min 8 characters)</label>
              <div className="input-icon-wrapper password-input-wrapper">
                <Lock className="input-icon" size={18} />
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirm-password">Confirm New Password</label>
              <div className="input-icon-wrapper password-input-wrapper">
                <Lock className="input-icon" size={18} />
                <input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? (
                <span className="spinner-row">
                  <span className="spinner"></span> Resetting Password...
                </span>
              ) : (
                <span className="btn-content">
                  <CheckCircle2 size={18} /> Reset Password
                </span>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn-link btn-back-row"
            >
              <ArrowLeft size={16} /> Re-enter Email
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <div className="auth-success-box" style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', marginBottom: '16px' }}>
            <CheckCircle2 size={40} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            Password Reset Successful!
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '24px' }}>
            Your account password has been safely updated. You can now sign in with your new credentials.
          </p>

          <button
            type="button"
            className="btn-primary"
            onClick={() => onSwitchToLogin(email)}
          >
            Sign In with New Password
          </button>
        </div>
      )}
    </div>
  );
}
