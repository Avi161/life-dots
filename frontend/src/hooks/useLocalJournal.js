import { useState, useEffect, useRef, useCallback } from 'react';
import { isAuthenticated, fetchJournalEntry, saveJournalEntry, deleteJournalEntry } from '../utils/api';

const STORAGE_KEY = 'lifedots-journal-entries';

function readAll() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
        return {};
    }
}

function writeAll(all) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

/**
 * Backend-first, local-fallback journal hook.
 *
 * - If authenticated → loads from / saves to the API.
 * - If not authenticated → uses localStorage.
 * - Exposes `isLoading` so the editor can delay mounting until data arrives.
 *
 * Returns { content, setContent, saveStatus, forceSave, isLoading }
 *   saveStatus: 'idle' | 'saving' | 'saved'
 */
export default function useLocalJournal(contextKey) {
    const [content, setContentState] = useState('');
    const [saveStatus, setSaveStatus] = useState('idle');
    const [isLoading, setIsLoading] = useState(true);

    const timerRef = useRef(null);
    const savedTimerRef = useRef(null);
    const latestContentRef = useRef('');
    const contextKeyRef = useRef(contextKey);

    // Keep contextKeyRef in sync so callbacks always see the latest value
    useEffect(() => {
        contextKeyRef.current = contextKey;
    }, [contextKey]);

    // ── Load on mount / key change ──────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        setSaveStatus('idle');

        // Clear any pending save timers from the previous key
        clearTimeout(timerRef.current);
        clearTimeout(savedTimerRef.current);

        async function load() {
            if (isAuthenticated()) {
                try {
                    const entry = await fetchJournalEntry(contextKey);
                    if (!cancelled) {
                        const value = entry?.content || '';
                        setContentState(value);
                        latestContentRef.current = value;
                    }
                } catch {
                    // Network error → fall back to localStorage
                    if (!cancelled) {
                        const value = readAll()[contextKey] || '';
                        setContentState(value);
                        latestContentRef.current = value;
                    }
                }
            } else {
                const value = readAll()[contextKey] || '';
                setContentState(value);
                latestContentRef.current = value;
            }

            if (!cancelled) setIsLoading(false);
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [contextKey]);

    // ── Persist helper (sync for localStorage, fire-and-forget for API) ─
    const persist = useCallback((key, value) => {
        const isEmpty =
            !value ||
            value === '<p></p>' ||
            value === '<p><br></p>' ||
            value.trim() === '';

        if (isAuthenticated()) {
            if (!isEmpty) {
                saveJournalEntry(key, value).catch(() => {
                    // API failed → save to localStorage as a safety net
                    const all = readAll();
                    all[key] = value;
                    writeAll(all);
                });
            }
            // If empty we intentionally do nothing (don't delete remotely on every keystroke)
        } else {
            const all = readAll();
            if (!isEmpty) {
                all[key] = value;
            } else {
                delete all[key];
            }
            writeAll(all);
        }
    }, []);

    // ── forceSave ───────────────────────────────────────────────────────
    const forceSave = useCallback(() => {
        clearTimeout(timerRef.current);
        clearTimeout(savedTimerRef.current);

        const key = contextKeyRef.current;
        const val = latestContentRef.current;
        const isEmpty = !val || val === '<p></p>' || val === '<p><br></p>' || val.trim() === '';

        if (isAuthenticated() && isEmpty) {
            deleteJournalEntry(key).catch(() => {});
        }

        persist(key, val);
        setSaveStatus('saved');

        savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
    }, [persist]);

    // ── setContent (debounced 500ms) ────────────────────────────────────
    const setContent = useCallback(
        (value) => {
            setContentState(value);
            latestContentRef.current = value;
            setSaveStatus('saving');

            clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                forceSave();
            }, 500);
        },
        [forceSave],
    );

    // ── Flush on unmount ────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                // Fire one final save synchronously (API call is fire-and-forget)
                const key = contextKeyRef.current;
                const val = latestContentRef.current;
                const isEmpty = !val || val === '<p></p>' || val === '<p><br></p>' || val.trim() === '';

                if (isAuthenticated() && isEmpty) {
                    deleteJournalEntry(key).catch(() => {});
                }
                persist(key, val);
            }
            clearTimeout(savedTimerRef.current);
        };
    }, [persist]);

    return { content, setContent, saveStatus, forceSave, isLoading };
}
