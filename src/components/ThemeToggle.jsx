import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ theme, onToggle }) {
    return (
        <button
            onClick={onToggle}
            className="p-2 rounded-full transition-colors duration-200"
            style={{
                backgroundColor: 'var(--control-bg)',
                color: 'var(--fg)',
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = 'var(--control-hover)')}
            onMouseLeave={(e) => (e.target.style.backgroundColor = 'var(--control-bg)')}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
    );
}
