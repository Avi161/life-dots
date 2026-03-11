import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getJournalEntry, setJournalEntry } from '../utils/storage.js';
import { isAuthenticated, fetchJournalEntry, saveJournalEntry } from '../utils/api.js';

const SAVE_DEBOUNCE_MS = 600;

export default function JournalOverlay({ contextKey, displayTitle, onClose }) {
    const [content, setContent] = useState('');
    const [saved, setSaved] = useState(true);
    const [loading, setLoading] = useState(true);
    const saveTimerRef = useRef(null);
    const textareaRef = useRef(null);

    // Load existing journal entry on open
    useEffect(() => {
        setLoading(true);
        async function load() {
            let entry = '';
            if (isAuthenticated()) {
                // Try backend first; fall back to local if fetch fails
                try {
                    const remote = await fetchJournalEntry(contextKey);
                    entry = remote ?? '';
                } catch {
                    entry = await getJournalEntry(contextKey);
                }
            } else {
                entry = await getJournalEntry(contextKey);
            }
            setContent(entry);
            setSaved(true);
            setLoading(false);
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    const len = textareaRef.current.value.length;
                    textareaRef.current.setSelectionRange(len, len);
                }
            }, 60);
        }
        load();
    }, [contextKey]);

    // Persist change — write to backend if logged in, always write locally too
    const persist = useCallback(async (val) => {
        const promises = [setJournalEntry(contextKey, val)];
        if (isAuthenticated()) {
            promises.push(saveJournalEntry(contextKey, val).catch((err) => {
                console.warn('Failed to sync journal to backend:', err);
            }));
        }
        await Promise.all(promises);
        setSaved(true);
    }, [contextKey]);

    const handleChange = useCallback((e) => {
        const val = e.target.value;
        setContent(val);
        setSaved(false);
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => persist(val), SAVE_DEBOUNCE_MS);
    }, [persist]);

    const handleClose = useCallback(async () => {
        clearTimeout(saveTimerRef.current);
        await persist(content);
        onClose();
    }, [content, persist, onClose]);

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') handleClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [handleClose]);

    const statusText = loading ? 'Loading…' : saved ? (isAuthenticated() ? 'Synced' : 'Saved') : 'Saving…';

    return (
        <div className="journal-overlay fade-in">
            {/* Top bar */}
            <div className="journal-overlay-header">
                <button
                    onClick={handleClose}
                    className="ctrl-btn"
                    style={{ gap: 4, display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 500, color: 'var(--fg-muted)', padding: '4px 6px' }}
                    aria-label="Close journal"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 5l-7 7 7 7" />
                    </svg>
                    Back
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', letterSpacing: '-0.01em' }}>
                        {displayTitle}
                    </span>
                    <span style={{ fontSize: 10.5, color: 'var(--fg-muted)', fontWeight: 300 }}>
                        {statusText}
                    </span>
                </div>

                {/* Spacer to keep title centered */}
                <div style={{ width: 60 }} />
            </div>

            {/* Textarea */}
            {loading ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{
                        width: 18, height: 18, borderRadius: '50%',
                        border: '2px solid var(--fg-muted)',
                        borderTopColor: 'var(--fg)',
                        animation: 'spin 0.7s linear infinite',
                    }} />
                </div>
            ) : (
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={handleChange}
                    placeholder="Start writing…"
                    className="journal-textarea"
                />
            )}
        </div>
    );
}
