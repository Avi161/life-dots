import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, ExternalLink, LogOut } from 'lucide-react';
import { getGoogleAuthUrl } from '../utils/api.js';

const WEBSITE_URL = 'https://life-dots.vercel.app';

function openWebsite() {
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
        chrome.tabs.create({ url: WEBSITE_URL });
    } else {
        window.open(WEBSITE_URL, '_blank');
    }
}

/**
 * Launch Google OAuth via chrome.identity.launchWebAuthFlow.
 * Returns the access_token on success, null on failure/cancel.
 *
 * Supabase redirects to chrome.identity.getRedirectURL() with the access_token
 * in the URL hash after a successful login — same pattern as the website.
 */
async function launchGoogleAuth() {
    try {
        const redirectUrl = chrome.identity.getRedirectURL();
        const { url: oauthUrl } = await getGoogleAuthUrl(redirectUrl);

        return new Promise((resolve) => {
            chrome.identity.launchWebAuthFlow(
                { url: oauthUrl, interactive: true },
                (responseUrl) => {
                    if (chrome.runtime.lastError || !responseUrl) {
                        console.warn('Auth cancelled or failed:', chrome.runtime.lastError?.message);
                        resolve(null);
                        return;
                    }

                    // Supabase puts the token in the URL hash: #access_token=...
                    try {
                        const hash = new URL(responseUrl).hash.slice(1);
                        const params = new URLSearchParams(hash);
                        const token = params.get('access_token');
                        resolve(token ?? null);
                    } catch {
                        resolve(null);
                    }
                },
            );
        });
    } catch (err) {
        console.error('Failed to start Google auth:', err);
        return null;
    }
}

export default function Header({ theme, onToggleTheme, user, onLogin, onLogout }) {
    const [signingIn, setSigningIn] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    // Close user menu on outside click
    useEffect(() => {
        if (!menuOpen) return;
        function handleClick(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [menuOpen]);

    const handleSignIn = async () => {
        // chrome.identity is only available in real extension context
        if (typeof chrome === 'undefined' || !chrome.identity) {
            alert('Sign in is only available in the installed Chrome extension.');
            return;
        }
        setSigningIn(true);
        try {
            const token = await launchGoogleAuth();
            if (token) await onLogin(token);
        } finally {
            setSigningIn(false);
        }
    };

    const handleSignOut = async () => {
        setMenuOpen(false);
        await onLogout();
    };

    // Derive display initial from email or name
    const userInitial = user
        ? (user.user_metadata?.full_name?.[0] ?? user.email?.[0] ?? '?').toUpperCase()
        : null;

    const userLabel = user
        ? (user.user_metadata?.full_name ?? user.email ?? 'Signed in')
        : null;

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '11px 16px',
                flexShrink: 0,
            }}
        >
            {/* Logo + title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <DotIcon />
                <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--fg)' }}>
                    Life in Dots
                </span>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {/* Theme toggle */}
                <button
                    className="ctrl-btn"
                    onClick={onToggleTheme}
                    title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    aria-label="Toggle theme"
                >
                    {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                </button>

                {/* Open website */}
                <button
                    className="ctrl-btn"
                    onClick={openWebsite}
                    title="Open full website"
                    aria-label="Open full website"
                >
                    <ExternalLink size={15} />
                </button>

                {/* User / login button */}
                {user ? (
                    <div ref={menuRef} style={{ position: 'relative' }}>
                        {/* Signed-in: show avatar/initial with dropdown */}
                        <button
                            onClick={() => setMenuOpen((v) => !v)}
                            title={userLabel}
                            aria-label="Account menu"
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                background: 'var(--control-bg)',
                                border: '1px solid var(--control-border)',
                                borderRadius: 20,
                                padding: '3px 8px 3px 4px',
                                cursor: 'pointer',
                                transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--control-hover)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--control-bg)')}
                        >
                            {user.user_metadata?.avatar_url ? (
                                <img
                                    src={user.user_metadata.avatar_url}
                                    alt={userLabel}
                                    style={{ width: 20, height: 20, borderRadius: '50%', display: 'block' }}
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                <div style={{
                                    width: 20, height: 20, borderRadius: '50%',
                                    background: 'var(--fg)', color: 'var(--bg)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 10, fontWeight: 600, flexShrink: 0,
                                }}>
                                    {userInitial}
                                </div>
                            )}
                            <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--fg)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {user.user_metadata?.full_name?.split(' ')[0] ?? user.email?.split('@')[0]}
                            </span>
                        </button>

                        {menuOpen && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: 6,
                                background: 'var(--bg)',
                                border: '1px solid var(--control-border)',
                                borderRadius: 9,
                                boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
                                zIndex: 500,
                                minWidth: 160,
                                padding: '4px 0',
                                animation: 'ctx-in 0.1s ease-out both',
                            }}>
                                <div style={{ padding: '7px 14px 5px', borderBottom: '1px solid var(--control-border)', marginBottom: 3 }}>
                                    <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {userLabel}
                                    </p>
                                    <p style={{ fontSize: 10.5, color: 'var(--fg-muted)', fontWeight: 300 }}>
                                        Synced with website
                                    </p>
                                </div>
                                <button
                                    onClick={handleSignOut}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        width: '100%', textAlign: 'left',
                                        background: 'transparent', border: 'none',
                                        cursor: 'pointer', padding: '6px 14px',
                                        fontSize: 12.5, color: 'var(--fg)',
                                        fontFamily: 'inherit',
                                        transition: 'background 0.1s',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--control-hover)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <LogOut size={13} />
                                    Sign out
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Signed-out: prominent labeled "Sign in" pill button */
                    <button
                        onClick={handleSignIn}
                        disabled={signingIn}
                        aria-label="Sign in with Google"
                        style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            background: 'var(--fg)',
                            color: 'var(--bg)',
                            border: 'none',
                            borderRadius: 20,
                            padding: '4px 10px',
                            fontSize: 11.5,
                            fontWeight: 500,
                            fontFamily: 'inherit',
                            cursor: signingIn ? 'default' : 'pointer',
                            opacity: signingIn ? 0.6 : 1,
                            transition: 'opacity 0.15s',
                            whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => { if (!signingIn) e.currentTarget.style.opacity = '0.8'; }}
                        onMouseLeave={(e) => { if (!signingIn) e.currentTarget.style.opacity = '1'; }}
                    >
                        {signingIn ? (
                            <>
                                <div style={{
                                    width: 12, height: 12, borderRadius: '50%',
                                    border: '2px solid var(--bg)',
                                    borderTopColor: 'transparent',
                                    animation: 'spin 0.7s linear infinite',
                                }} />
                                Signing in…
                            </>
                        ) : (
                            <>
                                <GoogleIcon />
                                Sign in
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}

function GoogleIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="currentColor" opacity=".6"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="currentColor" opacity=".8"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="currentColor"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="currentColor" opacity=".7"/>
        </svg>
    );
}

function DotIcon() {
    return (
        <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--fg)', flexShrink: 0,
        }} />
    );
}
