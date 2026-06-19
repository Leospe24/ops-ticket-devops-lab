const API_URL = import.meta.env.VITE_API_URL || '';

function getToken() {
  return localStorage.getItem('token');
}

function setToken(token) {
  localStorage.setItem('token', token);
}

function removeToken() {
  localStorage.removeItem('token');
}

function buildHeaders(contentType = true) {
  const headers = {};
  if (contentType) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse(response) {
  try {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorMessage = data.error || `Request failed with status ${response.status}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      const error = new Error('Unable to connect to the API server. Please check your network connection.');
      error.status = 0;
      throw error;
    }
    throw err;
  }
}

export const api = {
  // Auth
  async register({ email, password, role = 'user' }) {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ email, password, role }),
    });
    return handleResponse(res);
  },

  async login({ email, password }) {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse(res);
    if (data.token) {
      setToken(data.token);
    }
    return data;
  },

  logout() {
    removeToken();
  },

  isAuthenticated() {
    return !!getToken();
  },

  getToken,

  // Tickets
  async getTickets(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${API_URL}/api/tickets?${query}` : `${API_URL}/api/tickets`;
    const res = await fetch(url, {
      headers: buildHeaders(false),
    });
    return handleResponse(res);
  },

  async createTicket(ticket) {
    const res = await fetch(`${API_URL}/api/tickets`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(ticket),
    });
    return handleResponse(res);
  },

  async updateTicket(id, updates) {
    const res = await fetch(`${API_URL}/api/tickets/${id}`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(updates),
    });
    return handleResponse(res);
  },

  async getStats() {
    const res = await fetch(`${API_URL}/api/tickets/stats`, {
      headers: buildHeaders(false),
    });
    return handleResponse(res);
  },
};
