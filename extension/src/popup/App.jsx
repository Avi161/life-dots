import React, { useState, useEffect, useCallback } from 'react';
import { loadSettings, saveSettings, loadAuthToken, saveAuthToken, clearAuthToken } from '../utils/storage.js';
import { hydrateFromRemote as hydrateFromSettings } from '@dateEngine';
import { initDotMeta, hydrateMetaCache } from '../utils/dotMeta.js';
import { setAuthToken, fetchSettings, getCurrentUser } from '../utils/api.js';
import SetupScreen from './SetupScreen.jsx';
import Header from './Header.jsx';
import DotsSection from './DotsSection.jsx';
import TodoSection from './TodoSection.jsx';

export default function App() {
    const [ready, setReady] = useState(false);
    const [needsSetup, setNeedsSetup] = useState(false);
    const [theme, setTheme] = useState('light');
    const [settings, setSettings] = useState(null);
    const [activeTab, setActiveTab] = useState('dots');
    const [user, setUser] = useState(null);
    // refreshKey forces DotsSection to re-read dot meta after remote sync
    const [refreshKey, setRefreshKey] = useState(0);

    // ── Hydrate remote settings after login ───────────────────────────────────
    const hydrateRemoteSettings = useCallback(async () => {
        try {
            const remote = await fetchSettings();
            if (!remote) return false;

            // Merge remote into local settings
            const merged = {
                birth_date: remote.birth_date,
                expected_lifespan: remote.expected_lifespan,
                theme: remote.theme ?? 'light',
            };
            hydrateFromSettings(merged);

            if (remote.dot_meta) {
                hydrateMetaCache(remote.dot_meta);
            }
            if (remote.theme) setTheme(remote.theme);

            await saveSettings(merged);
            setSettings(merged);
            setRefreshKey((k) => k + 1);

            return !remote.birth_date; // true = new user, needs setup
        } catch (err) {
            console.error('Failed to load remote settings:', err);
            return false;
        }
    }, []);

    // ── Bootstrap on popup open ───────────────────────────────────────────────
    useEffect(() => {
        async function init() {
            await initDotMeta();

            // Restore persisted auth token
            const token = await loadAuthToken();
            if (token) {
                setAuthToken(token);
                try {
                    const u = await getCurrentUser();
                    setUser(u?.user ?? u);
                    await hydrateRemoteSettings();
                } catch {
                    // Token expired — clear it
                    await clearAuthToken();
                    setAuthToken(null);
                }
            }

            // Load local settings (may have been hydrated from remote above)
            const stored = await loadSettings();
            if (!stored || !stored.birth_date) {
                setNeedsSetup(true);
            } else {
                hydrateFromSettings(stored);
                setTheme(stored.theme ?? 'light');
                setSettings(stored);
            }

            setReady(true);
        }
        init();
    }, [hydrateRemoteSettings]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    // ── Login handler (called from Header after OAuth completes) ──────────────
    const handleLogin = useCallback(async (token) => {
        setAuthToken(token);
        await saveAuthToken(token);

        try {
            const u = await getCurrentUser();
            setUser(u?.user ?? u);
            const isNewUser = await hydrateRemoteSettings();
            if (isNewUser) setNeedsSetup(true);
        } catch (err) {
            console.error('Post-login sync failed:', err);
        }
    }, [hydrateRemoteSettings]);

    // ── Logout handler ────────────────────────────────────────────────────────
    const handleLogout = useCallback(async () => {
        setAuthToken(null);
        await clearAuthToken();
        setUser(null);
    }, []);

    const toggleTheme = async () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        const updated = { ...(settings ?? {}), theme: next };
        setSettings(updated);
        await saveSettings(updated);
    };

    const handleSetupDone = async (birth_date, expected_lifespan) => {
        const newSettings = { birth_date, expected_lifespan, theme };
        hydrateFromSettings(newSettings);
        await saveSettings(newSettings);
        setSettings(newSettings);
        setNeedsSetup(false);
    };

    if (!ready) {
        return <div style={{ width: 400, height: 560, background: 'var(--bg)' }} />;
    }

    if (needsSetup) {
        return <SetupScreen onDone={handleSetupDone} />;
    }

    return (
        <div style={{ width: 400, height: 560, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Header
                theme={theme}
                onToggleTheme={toggleTheme}
                user={user}
                onLogin={handleLogin}
                onLogout={handleLogout}
            />

            {/* Tab switcher — rectangle divided in two */}
            <div className="tab-switcher">
                <button
                    className={`tab-btn ${activeTab === 'dots' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dots')}
                >
                    Dots
                </button>
                <div className="tab-divider" />
                <button
                    className={`tab-btn ${activeTab === 'todos' ? 'active' : ''}`}
                    onClick={() => setActiveTab('todos')}
                >
                    Todo
                </button>
            </div>

            {/* Content — fills remaining space */}
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                {activeTab === 'dots'
                    ? <DotsSection refreshKey={refreshKey} />
                    : <TodoSection />
                }
            </div>
        </div>
    );
}
