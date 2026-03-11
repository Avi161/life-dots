// Dot metadata (color + tag) for the extension — backed by chrome.storage.local.
import { loadDotMeta, saveDotMeta } from './storage.js';

export const PALETTE = [
    '#e07070', // soft rose
    '#e0a857', // amber
    '#7ab87a', // sage
    '#6faad4', // sky
    '#9e7fd4', // lavender
    '#333333', // dark gray
];

let metaCache = {};

export function hydrateMetaCache(meta) {
    if (meta && typeof meta === 'object') {
        metaCache = { ...meta };
    }
}

export async function initDotMeta() {
    const stored = await loadDotMeta();
    metaCache = stored;
}

export function getDotMeta(id) {
    return metaCache[String(id)] ?? { color: null, tag: null };
}

export function getAllDotMeta() {
    return { ...metaCache };
}

export async function setDotMeta(id, { color, tag }) {
    const key = String(id);
    if (color === null && (tag === null || tag === '')) {
        delete metaCache[key];
    } else {
        metaCache[key] = { color: color ?? null, tag: tag ?? null };
    }
    await saveDotMeta({ ...metaCache });
}
