import { useState, useEffect } from 'react';
import { LogIn, User } from 'lucide-react';

export default function AuthButton() {
    // Conceptual auth state: backend will eventually set a 'lifedots-token' cookie/localStorage
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        // Quick check for an auth token (this logic will be finalized by backend)
        const token = localStorage.getItem('lifedots-token');
        if (token) {
            setIsLoggedIn(true);
        }
    }, []);

    const handleLoginClick = () => {
        // Redirect to the placeholder backend Google OAuth route
        window.location.href = '/api/auth/google';
    };

    const baseStyle = {
        padding: '8px',
        backgroundColor: 'var(--control-bg)',
        border: '1px solid var(--control-border)',
        color: 'var(--fg-muted)',
    };

    return (
        <button
            onClick={handleLoginClick}
            className="fixed top-5 left-5 z-40 rounded-full transition-colors duration-200 flex items-center justify-center"
            style={baseStyle}
            aria-label={isLoggedIn ? "User Profile" : "Sign in / Sign up"}
            data-html2canvas-ignore="true"
        >
            {isLoggedIn ? (
                <User size={18} strokeWidth={2} />
            ) : (
                <LogIn size={18} strokeWidth={2} />
            )}
        </button>
    );
}
