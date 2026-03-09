// ─── Dot Metadata (color + tag per dot ID) ───
// Stored in localStorage as a JSON object keyed by dot ID string.
// e.g. { "0": { color: "#e07070", tag: "born!" }, "24": { color: "#7ab87a", tag: null } }

import { saveSettings, isAuthenticated } from './api';

const STORAGE_KEY = 'lifedots-meta';

export const PALETTE = [
    '#e07070', // soft rose
    '#e0a857', // amber
    '#7ab87a', // sage
    '#6faad4', // sky
    '#9e7fd4', // lavender
    '#333333', // dark gray (original-like)
];

function loadMeta() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch {
        // ignore parse errors
    }
    return {};
}

function saveMeta(meta) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
}

/**
 * Get metadata for a specific dot ID.
 * @returns {{ color: string | null, tag: string | null }}
 */
export function getDotMeta(id) {
    const meta = loadMeta();
    return meta[String(id)] ?? { color: null, tag: null };
}

/**
 * Set metadata for a specific dot ID.
 * Pass null values to clear fields.
 */
export function setDotMeta(id, { color, tag }) {
    const meta = loadMeta();
    const key = String(id);
    if (color === null && (tag === null || tag === '')) {
        delete meta[key];
    } else {
        meta[key] = { color: color ?? null, tag: tag ?? null };
    }
    saveMeta(meta);

    if (isAuthenticated()) {
        saveSettings({ dot_meta: meta }).catch(() => {});
    }
}

/**
 * Get all dot metadata as a plain object keyed by dot ID string.
 */
export function getAllDotMeta() {
    return loadMeta();
}

/**
 * Hydrate dot metadata from remote settings.
 * Replaces the local cache with the remote data.
 */
export function hydrateMetaFromRemote(meta) {
    if (meta && typeof meta === 'object') {
        saveMeta(meta);
    }
}
