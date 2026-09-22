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

export const invoiceService = {
  async getInvoices() {
    const res = await apiRequest('/invoices/');
    if (!res.ok) {
      throw new Error('Failed to load invoices.');
    }
    return res.json();
  },

  async getInvoice(id) {
    const res = await apiRequest(`/invoices/${id}/`);
    if (!res.ok) {
      throw new Error('Failed to load invoice details.');
    }
    return res.json();
  },

  async generateBatchInvoices(payload) {
    const res = await apiRequest('/invoices/generate/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Invoice generation failed.' }));
      const errorMsg = typeof err === 'object' ? Object.values(err)[0] : err;
      throw new Error(Array.isArray(errorMsg) ? errorMsg[0] : errorMsg || 'Generation failed.');
    }
    return res.json();
  },
};

export const paymentService = {
  async payWithWallet(invoiceId, amount) {
    const payload = { invoice: invoiceId };
    if (amount) payload.amount = amount;
    const res = await apiRequest('/wallets/pay-invoice/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Wallet payment failed.' }));
      const errorMsg = typeof err === 'object' ? Object.values(err)[0] : err;
      throw new Error(Array.isArray(errorMsg) ? errorMsg[0] : errorMsg || 'Payment failed.');
    }
    return res.json();
  },

  async initializeCheckout(invoiceId, amount) {
    const payload = {
      purpose: 'INVOICE_PAYMENT',
      invoice: invoiceId,
      amount: amount,
    };
    const res = await apiRequest('/payments/checkout/initialize/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Checkout initialization failed.' }));
      const errorMsg = typeof err === 'object' ? Object.values(err)[0] : err;
      throw new Error(Array.isArray(errorMsg) ? errorMsg[0] : errorMsg || 'Could not initiate checkout.');
    }
    return res.json();
  },

  async verifyCheckout(txRef) {
    const res = await apiRequest(`/payments/checkout/verify/${txRef}/`);
    if (!res.ok) {
      throw new Error('Could not verify checkout transaction.');
    }
    return res.json();
  },
};

