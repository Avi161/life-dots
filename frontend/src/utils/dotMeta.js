// ─── Dot Metadata (color + tag per dot ID) ───
// In-memory cache hydrated from Supabase on login.
// e.g. { "0": { color: "#e07070", tag: "born!" }, "24": { color: "#7ab87a", tag: null } }

import { saveSettings, isAuthenticated } from './api';

let metaCache = {};

export const PALETTE = [
    '#e07070', // soft rose
    '#e0a857', // amber
    '#7ab87a', // sage
    '#6faad4', // sky
    '#9e7fd4', // lavender
    '#333333', // dark gray (original-like)
];

/**
 * Get metadata for a specific dot ID.
 * @returns {{ color: string | null, tag: string | null }}
 */
export function getDotMeta(id) {
    return metaCache[String(id)] ?? { color: null, tag: null };
}

/**
 * Set metadata for a specific dot ID.
 * Pass null values to clear fields.
 */
export function setDotMeta(id, { color, tag }) {
    const key = String(id);
    if (color === null && (tag === null || tag === '')) {
        delete metaCache[key];
    } else {
        metaCache[key] = { color: color ?? null, tag: tag ?? null };
    }

    if (isAuthenticated()) {
        saveSettings({ dot_meta: { ...metaCache } }).catch((err) => console.error('Failed to sync dot_meta:', err));
    }
}

/**
 * Get all dot metadata as a plain object keyed by dot ID string.
 */
export function getAllDotMeta() {
    return { ...metaCache };
}

/**
 * Hydrate dot metadata from remote settings.
 * Replaces the local cache with the remote data.
 */
export function hydrateMetaFromRemote(meta) {
    if (meta && typeof meta === 'object') {
        metaCache = { ...meta };
    }
}
