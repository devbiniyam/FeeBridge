import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService, getTokens } from '../services/api';

const AuthContext = createContext(null);

// 5 Minutes Idle Timeout for Bank-grade Security
export const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const logout = useCallback((isAutoTimeout = false) => {
    try {
      authService.logout();
    } catch (e) {
      console.error('Logout error:', e);
    }
    localStorage.clear();
    sessionStorage.clear();
    setUser(null);
    if (isAutoTimeout) {
      setError('Session timed out after 5 minutes of inactivity. Please sign in again.');
    }
  }, []);

  // Initial session restoration with inactivity validation
  useEffect(() => {
    async function loadUser() {
      const tokens = getTokens();
      const lastActivity = localStorage.getItem('feebridge_last_activity');

      if (tokens?.access) {
        const elapsed = Date.now() - (parseInt(lastActivity, 10) || 0);

        // Check if 5 minutes expired while away or browser was closed
        if (lastActivity && elapsed > INACTIVITY_TIMEOUT_MS) {
          logout(true);
          setLoading(false);
          return;
        }

        try {
          const profile = await authService.getProfile();
          setUser(profile);
          localStorage.setItem('feebridge_last_activity', Date.now().toString());
        } catch (err) {
          console.error('Failed to load user profile:', err);
          logout(false);
        }
      }
      setLoading(false);
    }
    loadUser();
  }, [logout]);

  // Active idle timer and user activity tracker
  useEffect(() => {
    if (!user) return;

    let lastRecorded = Date.now();
    localStorage.setItem('feebridge_last_activity', lastRecorded.toString());

    // Throttled activity recorder (updates once every 5 seconds)
    const recordActivity = () => {
      const now = Date.now();
      if (now - lastRecorded > 5000) {
        lastRecorded = now;
        localStorage.setItem('feebridge_last_activity', now.toString());
      }
    };

    // Check if idle duration exceeds 5 minutes
    const checkInactivity = () => {
      const storedLast = parseInt(localStorage.getItem('feebridge_last_activity'), 10) || lastRecorded;
      if (Date.now() - storedLast >= INACTIVITY_TIMEOUT_MS) {
        console.warn('Inactivity timeout reached: automatically logging out user.');
        logout(true);
      }
    };

    // Listen to user interaction events
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((ev) => window.addEventListener(ev, recordActivity, { passive: true }));

    // Check immediately when user switches back to this browser tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic heartbeat check every 10 seconds
    const intervalId = setInterval(checkInactivity, 10000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, recordActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [user, logout]);

  const login = async (email, password) => {
    setError(null);
    try {
      const profile = await authService.login(email, password);
      setUser(profile);
      localStorage.setItem('feebridge_last_activity', Date.now().toString());
      return profile;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const register = async (userData) => {
    setError(null);
    try {
      const result = await authService.register(userData);
      const profile = await authService.login(userData.email, userData.password);
      setUser(profile);
      localStorage.setItem('feebridge_last_activity', Date.now().toString());
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const refreshProfile = async () => {
    try {
      const profile = await authService.getProfile();
      setUser(profile);
      return profile;
    } catch (err) {
      console.error('Failed to refresh profile:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, setError, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
