import { LogIn } from 'lucide-react';

export default function AuthButton({ isLoggedIn, onLogin }) {
    if (isLoggedIn) return null;

    return (
        <button
            onClick={onLogin}
            className="fixed top-5 left-5 z-40 rounded-full transition-colors duration-200 flex items-center justify-center"
            style={{
                padding: '8px',
                backgroundColor: 'var(--control-bg)',
                border: '1px solid var(--control-border)',
                color: 'var(--fg-muted)',
            }}
            aria-label="Sign in / Sign up"
            data-html2canvas-ignore="true"
        >
            <LogIn size={18} strokeWidth={2} />
        </button>
    );
}
