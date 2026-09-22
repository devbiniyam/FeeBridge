const API_BASE_URL = 'http://127.0.0.1:8000/api';

export const getTokens = () => {
  const tokens = localStorage.getItem('feebridge_tokens');
  return tokens ? JSON.parse(tokens) : null;
};

export const setTokens = (tokens) => {
  localStorage.setItem('feebridge_tokens', JSON.stringify(tokens));
};

export const clearTokens = () => {
  localStorage.removeItem('feebridge_tokens');
};

export async function apiRequest(endpoint, options = {}) {
  const tokens = getTokens();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (tokens?.access) {
    headers['Authorization'] = `Bearer ${tokens.access}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized (token expired)
  if (response.status === 401 && tokens?.refresh) {
    const refreshRes = await fetch(`${API_BASE_URL}/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: tokens.refresh }),
    });

    if (refreshRes.ok) {
      const newTokens = await refreshRes.json();
      setTokens({ ...tokens, access: newTokens.access });
      headers['Authorization'] = `Bearer ${newTokens.access}`;
      return fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
    } else {
      clearTokens();
      window.location.reload();
      throw new Error('Session expired. Please log in again.');
    }
  }

  return response;
}

export const authService = {
  async login(email, password) {
    const res = await fetch(`${API_BASE_URL}/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Invalid credentials' }));
      throw new Error(err.detail || 'Login failed. Please check your credentials.');
    }
    const data = await res.json();
    setTokens(data);
    return this.getProfile();
  },

  async register(userData) {
    const res = await fetch(`${API_BASE_URL}/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
      const firstError = Object.values(err)[0];
      const errorMsg = Array.isArray(firstError) ? firstError[0] : (err.detail || 'Registration failed');
      throw new Error(errorMsg);
    }
    return res.json();
  },

  async getProfile() {
    const res = await apiRequest('/me/');
    if (!res.ok) {
      throw new Error('Could not fetch user profile');
    }
    return res.json();
  },

  logout() {
    clearTokens();
  },
};
