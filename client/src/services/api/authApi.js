import { apiClient, setStoredToken, setStoredUser, clearAuthSession, getStoredUser, getStoredToken } from './apiClient.js';

export async function login({ email, password }) {
  const result = await apiClient.post('/auth/login', { email, password });
  if (result?.token) {
    setStoredToken(result.token);
  }
  if (result?.user) {
    setStoredUser(result.user);
  }
  return result;
}

export async function register({ name, email, password, role }) {
  const payload = { name, email, password };
  if (role) payload.role = role;
  const result = await apiClient.post('/auth/register', payload);
  if (result?.token) {
    setStoredToken(result.token);
  }
  if (result?.user) {
    setStoredUser(result.user);
  }
  return result;
}

export async function getMe() {
  const token = getStoredToken();
  if (!token) return null;
  try {
    const user = await apiClient.get('/auth/me');
    setStoredUser(user);
    return user;
  } catch (err) {
    if (err.isUnauthorized) {
      clearAuthSession();
      return null;
    }
    throw err;
  }
}

export function getCurrentSession() {
  const token = getStoredToken();
  const user = getStoredUser();
  if (!token || !user) return null;
  return user;
}

export function logout() {
  clearAuthSession();
}
