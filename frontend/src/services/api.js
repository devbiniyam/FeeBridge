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

  async payDirect(invoiceId, amount, method = 'CBE', fundingSource = '', sourceAccount = '', referenceNumber = '') {
    const payload = {
      invoice: invoiceId,
      amount: amount,
      method: method,
      funding_source: fundingSource || method,
      source_account: sourceAccount,
      reference_number: referenceNumber,
    };
    const res = await apiRequest('/payments/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Payment failed.' }));
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

export const walletService = {
  async getMyWallet() {
    const res = await apiRequest('/wallets/my-wallet/');
    if (!res.ok) {
      throw new Error('Failed to load wallet details.');
    }
    return res.json();
  },

  async getTransactions() {
    const res = await apiRequest('/wallets/transactions/');
    if (!res.ok) {
      throw new Error('Failed to load wallet transactions.');
    }
    return res.json();
  },

  async deposit(amount, fundingSource = 'CBE', sourceAccount = '', referenceNumber = '') {
    const res = await apiRequest('/wallets/deposit/', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        funding_source: fundingSource,
        source_account: sourceAccount,
        reference_number: referenceNumber,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Deposit failed.' }));
      const errorMsg = typeof err === 'object' ? Object.values(err)[0] : err;
      throw new Error(Array.isArray(errorMsg) ? errorMsg[0] : errorMsg || 'Deposit failed.');
    }
    return res.json();
  },

  async initializeDepositCheckout(amount) {
    const res = await apiRequest('/payments/checkout/initialize/', {
      method: 'POST',
      body: JSON.stringify({
        purpose: 'WALLET_DEPOSIT',
        amount: amount,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Deposit checkout failed.' }));
      const errorMsg = typeof err === 'object' ? Object.values(err)[0] : err;
      throw new Error(Array.isArray(errorMsg) ? errorMsg[0] : errorMsg || 'Checkout failed.');
    }
    return res.json();
  },
};

export const studentService = {
  async getStudents(params = {}) {
    const query = new URLSearchParams();
    if (params.grade) query.append('grade', params.grade);
    if (params.section) query.append('section', params.section);
    if (params.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await apiRequest(`/students/${qs}`);
    if (!res.ok) {
      throw new Error('Failed to load students.');
    }
    return res.json();
  },

  async getStudent(id) {
    const res = await apiRequest(`/students/${id}/`);
    if (!res.ok) {
      throw new Error('Failed to load student details.');
    }
    return res.json();
  },

  async createStudent(studentData) {
    const res = await apiRequest('/students/', {
      method: 'POST',
      body: JSON.stringify(studentData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create student.' }));
      const errorMsg = typeof err === 'object' ? Object.values(err)[0] : err;
      throw new Error(Array.isArray(errorMsg) ? errorMsg[0] : errorMsg || 'Failed to create student.');
    }
    return res.json();
  },

  async updateStudent(id, studentData) {
    const res = await apiRequest(`/students/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(studentData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update student.' }));
      const errorMsg = typeof err === 'object' ? Object.values(err)[0] : err;
      throw new Error(Array.isArray(errorMsg) ? errorMsg[0] : errorMsg || 'Failed to update student.');
    }
    return res.json();
  },

  async deleteStudent(id) {
    const res = await apiRequest(`/students/${id}/`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error('Failed to delete student.');
    }
    return true;
  },
};

export const notificationService = {
  async getNotifications(params = {}) {
    const query = new URLSearchParams();
    if (params.is_read !== undefined && params.is_read !== '') query.append('is_read', params.is_read);
    if (params.unread) query.append('unread', 'true');
    if (params.type) query.append('type', params.type);
    if (params.search) query.append('search', params.search);
    if (params.scope) query.append('scope', params.scope);
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await apiRequest(`/notifications/${qs}`);
    if (!res.ok) {
      throw new Error('Failed to load notifications.');
    }
    return res.json();
  },

  async getUnreadCount() {
    const res = await apiRequest('/notifications/unread-count/');
    if (!res.ok) {
      return { unread_count: 0 };
    }
    return res.json();
  },

  async markAsRead(id) {
    const res = await apiRequest(`/notifications/${id}/mark-as-read/`, {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error('Failed to mark notification as read.');
    }
    return res.json();
  },

  async markAllAsRead() {
    const res = await apiRequest('/notifications/mark-all-as-read/', {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error('Failed to mark all as read.');
    }
    return res.json();
  },

  async broadcast(payload) {
    const res = await apiRequest('/notifications/broadcast/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Broadcast failed.' }));
      const errorMsg = typeof err === 'object' ? Object.values(err)[0] : err;
      throw new Error(Array.isArray(errorMsg) ? errorMsg[0] : errorMsg || 'Broadcast failed.');
    }
    return res.json();
  },

  async dispatchReminders(reminderType = 'DUE_SOON') {
    const res = await apiRequest('/notifications/dispatch-reminders/', {
      method: 'POST',
      body: JSON.stringify({ reminder_type: reminderType }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to dispatch reminders.' }));
      const errorMsg = typeof err === 'object' ? Object.values(err)[0] : err;
      throw new Error(Array.isArray(errorMsg) ? errorMsg[0] : errorMsg || 'Failed to dispatch reminders.');
    }
    return res.json();
  },
};

export const feeStructureService = {
  async getFeeStructures() {
    const res = await apiRequest('/fee-structures/');
    if (!res.ok) {
      throw new Error('Failed to load fee structures.');
    }
    return res.json();
  },

  async createFeeStructure(data) {
    const res = await apiRequest('/fee-structures/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create fee structure.' }));
      const errorMsg = typeof err === 'object' ? Object.values(err)[0] : err;
      throw new Error(Array.isArray(errorMsg) ? errorMsg[0] : errorMsg || 'Failed to create fee structure.');
    }
    return res.json();
  },

  async updateFeeStructure(id, data) {
    const res = await apiRequest(`/fee-structures/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update fee structure.' }));
      const errorMsg = typeof err === 'object' ? Object.values(err)[0] : err;
      throw new Error(Array.isArray(errorMsg) ? errorMsg[0] : errorMsg || 'Failed to update fee structure.');
    }
    return res.json();
  },

  async deleteFeeStructure(id) {
    const res = await apiRequest(`/fee-structures/${id}/`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error('Failed to delete fee structure.');
    }
    return true;
  },
};

