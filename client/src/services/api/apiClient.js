/**
 * ScopePilot Centralized API Client
 *
 * Handles HTTP requests, JWT token injection, error envelopes, and base URL configuration.
 */

const RAW_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
export const API_BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');

export const TOKEN_STORAGE_KEY = 'scopepilot_auth_token';
export const USER_STORAGE_KEY = 'scopepilot_auth_user';

export class ApiError extends Error {
  constructor(message, status = 500, errors = [], raw = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.raw = raw;
    this.isUnauthorized = status === 401;
    this.isForbidden = status === 403;
    this.isNotFound = status === 404;
    this.isConflict = status === 409;
    this.isValidationError = status === 400 && errors.length > 0;
  }
}

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    /* ignore storage quota errors */
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  try {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  } catch {
    /* ignore storage quota errors */
  }
}

export function clearAuthSession() {
  setStoredToken(null);
  setStoredUser(null);
}

/**
 * Core HTTP request runner
 */
async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = getStoredToken();
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (networkError) {
    throw new ApiError(
      `Network connection failed: unable to reach API at ${API_BASE_URL}. (${networkError.message})`,
      0,
      [],
      networkError
    );
  }

  let payload = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  } else {
    payload = await response.text();
  }

  if (!response.ok) {
    let message =
      (payload && typeof payload === 'object' && payload.message) ||
      `HTTP Error ${response.status}: ${response.statusText}`;
    const errors =
      (payload && typeof payload === 'object' && Array.isArray(payload.errors) && payload.errors) ||
      [];

    if (response.status === 401) {
      // Notify application of auth expiration if needed
      window.dispatchEvent(new CustomEvent('scopepilot:unauthorized'));
    }

    if (errors.length > 0) {
      const details = errors
        .map((e) => (typeof e === 'string' ? e : e.message || `${e.field}: invalid`))
        .filter(Boolean)
        .join(', ');
      if (details) {
        message = `${message}: ${details}`;
      }
    }

    throw new ApiError(message, response.status, errors, payload);
  }

  // Handle standard { success: true, message: '...', data: ... } envelope
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data;
  }

  return payload;
}

export const apiClient = {
  get: (endpoint, options) => request(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options) => request(endpoint, { method: 'POST', body, ...options }),
  patch: (endpoint, body, options) => request(endpoint, { method: 'PATCH', body, ...options }),
  put: (endpoint, body, options) => request(endpoint, { method: 'PUT', body, ...options }),
  delete: (endpoint, options) => request(endpoint, { method: 'DELETE', ...options }),
  checkHealth: async () => {
    try {
      return await request('/health', { method: 'GET' });
    } catch {
      return null;
    }
  },
};
