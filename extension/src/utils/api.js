// Extension API wrapper — mirrors frontend/src/utils/api.js.
// Uses the same backend endpoints. Token is managed externally and passed in via setAuthToken.

const API_BASE = import.meta.env.VITE_API_URL || 'https://life-dots-backend.vercel.app';

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

async function apiFetch(path, options = {}) {
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

// ── Auth ───────────────────────────────────────────────────────────────────────

/**
 * Get the Google OAuth URL from the backend.
 * redirectTo should be chrome.identity.getRedirectURL() in the extension.
 */
export async function getGoogleAuthUrl(redirectTo) {
    const params = redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : '';
    return apiFetch(`/api/auth/google${params}`);
}

export async function getCurrentUser() {
    return apiFetch('/api/auth/me');
}

// ── Settings ──────────────────────────────────────────────────────────────────

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

// ── Journal ───────────────────────────────────────────────────────────────────

/**
 * Fetch a journal entry by context key.
 * Returns the entry content string, or null if none exists.
 */
export async function fetchJournalEntry(contextKey) {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;

    const res = await fetch(`${API_BASE}/api/journal/${encodeURIComponent(contextKey)}`, { headers });
    if (res.status === 404) return null;

    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message || 'Failed to fetch journal entry');

    // Backend returns { content: '...', ... } — extract just the content
    return json.data?.content ?? null;
}

/**
 * Create or update a journal entry.
 */
export async function saveJournalEntry(contextKey, content) {
    return apiFetch('/api/journal', {
        method: 'POST',
        body: JSON.stringify({ context_key: contextKey, content }),
    });
}
