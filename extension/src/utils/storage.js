// Chrome storage helpers for the Life in Dots extension.
// Falls back to localStorage when chrome.storage is not available (dev mode).

const isChromeExt = typeof chrome !== 'undefined' && chrome.storage?.local;

export function storageGet(keys) {
    return new Promise((resolve) => {
        if (isChromeExt) {
            chrome.storage.local.get(keys, resolve);
        } else {
            const result = {};
            const keyList = Array.isArray(keys) ? keys : Object.keys(keys);
            keyList.forEach((k) => {
                const val = localStorage.getItem('lifedots_ext_' + k);
                if (val !== null) {
                    try { result[k] = JSON.parse(val); } catch { result[k] = val; }
                } else if (!Array.isArray(keys) && keys[k] !== undefined) {
                    result[k] = keys[k];
                }
            });
            resolve(result);
        }
    });
}

export function storageSet(items) {
    return new Promise((resolve) => {
        if (isChromeExt) {
            chrome.storage.local.set(items, resolve);
        } else {
            Object.entries(items).forEach(([k, v]) => {
                localStorage.setItem('lifedots_ext_' + k, JSON.stringify(v));
            });
            resolve();
        }
    });
}

export async function loadSettings() {
    const result = await storageGet({ settings: null });
    return result.settings ?? null;
}

export async function saveSettings(settings) {
    await storageSet({ settings });
}

export async function loadDotMeta() {
    const result = await storageGet({ dotMeta: {} });
    return result.dotMeta ?? {};
}

export async function saveDotMeta(dotMeta) {
    await storageSet({ dotMeta });
}

export async function loadTodos() {
    const result = await storageGet({ todos: [] });
    return result.todos ?? [];
}

export async function saveTodos(todos) {
    await storageSet({ todos });
}

// ── Auth token ────────────────────────────────────────────────────────────────

export async function loadAuthToken() {
    const result = await storageGet({ authToken: null });
    return result.authToken ?? null;
}

export async function saveAuthToken(token) {
    await storageSet({ authToken: token });
}

export async function clearAuthToken() {
    await storageSet({ authToken: null });
}

// ── Journal ────────────────────────────────────────────────────────────────────

export async function loadJournals() {
    const result = await storageGet({ journals: {} });
    return result.journals ?? {};
}

export async function saveJournals(journals) {
    await storageSet({ journals });
}

export async function getJournalEntry(contextKey) {
    const journals = await loadJournals();
    return journals[contextKey] ?? '';
}

export async function setJournalEntry(contextKey, content) {
    const journals = await loadJournals();
    if (!content || content.trim() === '') {
        delete journals[contextKey];
    } else {
        journals[contextKey] = content;
    }
    await saveJournals(journals);
}
