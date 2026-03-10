const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

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

export async function getGoogleAuthUrl(redirectTo) {
  const params = redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : '';
  return apiFetch(`/api/auth/google${params}`);
}

export async function exchangeAuthCode(code) {
  return apiFetch(`/api/auth/callback?code=${encodeURIComponent(code)}`);
}

export async function getCurrentUser() {
  return apiFetch('/api/auth/me');
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

/**
 * Fetch a journal entry by context key (e.g. 'life', 'year-20', 'year-20-month-3').
 * Returns the entry data object, or null if no entry exists (404).
 */
export async function fetchJournalEntry(contextKey) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetch(
    `${API_BASE}/api/journal/${encodeURIComponent(contextKey)}`,
    { headers },
  );

  if (res.status === 404) return null;

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || 'Failed to fetch journal entry');
  }

  return json.data;
}

/**
 * Create or update a journal entry via POST (upsert).
 */
export async function saveJournalEntry(contextKey, content) {
  return apiFetch('/api/journal', {
    method: 'POST',
    body: JSON.stringify({ context_key: contextKey, content }),
  });
}
