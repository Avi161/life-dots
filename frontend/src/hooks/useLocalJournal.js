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
    const [content, setContentState] = useState('');
    const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved
    const timerRef = useRef(null);
    const savedTimerRef = useRef(null);

    // Load entry whenever contextKey changes
    useEffect(() => {
        const all = readAll();
        setContentState(all[contextKey] || '');
        setSaveStatus('idle');

        // Clear pending timers on key change
        return () => {
            clearTimeout(timerRef.current);
            clearTimeout(savedTimerRef.current);
        };
    }, [contextKey]);

    const setContent = useCallback(
        (value) => {
            setContentState(value);
            setSaveStatus('saving');

            // Debounce the write
            clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                const all = readAll();
                // Treat empty paragraphs as empty
                const isEmpty = !value || value === '<p></p>' || value.trim() === '';
                if (!isEmpty) {
                    all[contextKey] = value;
                } else {
                    delete all[contextKey]; // clean up empty entries
                }
                localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
                setSaveStatus('saved');

                // Reset to idle after a brief flash
                clearTimeout(savedTimerRef.current);
                savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
            }, 500);
        },
        [contextKey],
    );

    return { content, setContent, saveStatus };
}
