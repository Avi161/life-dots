import { useState, useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY = 'lifedots-journal-entries';

function readAll() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
        return {};
    }
}

/**
 * Reads / writes a single journal entry (HTML string) keyed by `contextKey`
 * in localStorage. Auto-saves with a 500 ms debounce.
 *
 * Returns { content, setContent, saveStatus }
 *   saveStatus: 'idle' | 'saving' | 'saved'
 */
export default function useLocalJournal(contextKey) {
    const [content, setContentState] = useState(() => {
        const all = readAll();
        return all[contextKey] || '';
    });
    const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved
    const timerRef = useRef(null);
    const savedTimerRef = useRef(null);
    const latestContentRef = useRef(content); // Synchronous tracking for unmounts

    // Sync state if contextKey changes while hook is still mounted
    useEffect(() => {
        const all = readAll();
        const initialContent = all[contextKey] || '';
        setContentState(initialContent);
        latestContentRef.current = initialContent;
        setSaveStatus('idle');

        // Clear pending timers on key change
        return () => {
            clearTimeout(timerRef.current);
            clearTimeout(savedTimerRef.current);
        };
    }, [contextKey]);

    const forceSave = useCallback(() => {
        clearTimeout(timerRef.current);
        clearTimeout(savedTimerRef.current);

        const value = latestContentRef.current;
        const all = readAll();
        const isEmpty = !value || value === '<p></p>' || value.trim() === '';

        if (!isEmpty) {
            all[contextKey] = value;
        } else {
            delete all[contextKey]; // clean up empty entries
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
        setSaveStatus('saved');

        savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
    }, [contextKey]);

    const setContent = useCallback(
        (value) => {
            setContentState(value);
            latestContentRef.current = value; // Update ref synchronously
            setSaveStatus('saving');

            // Debounce the write
            clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                forceSave();
            }, 500);
        },
        [forceSave], // forceSave depends on contextKey
    );

    // Auto-save when the component entirely unmounts (e.g., overlay is closed)
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                // If there was a pending save, execute it immediately on unmount
                forceSave();
            }
        };
    }, [forceSave]);

    return { content, setContent, saveStatus, forceSave };
}
