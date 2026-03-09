const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

export function isAuthenticated() {
  return authToken !== null;
}

export async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error?.message || 'API request failed');
  }

  return json.data;
}

export async function fetchSettings() {
  if (!authToken) return null;
  return apiFetch('/api/settings');
}

export async function saveSettings(settings) {
  if (!authToken) return null;
  return apiFetch('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}
