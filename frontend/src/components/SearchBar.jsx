import { Search, X } from 'lucide-react';

export default function SearchBar({ value, onChange, placeholder = 'Search...' }) {
    return (
        <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors"
            style={{
                backgroundColor: 'var(--control-bg)',
                borderColor: 'var(--control-border)',
            }}
        >
            <Search size={16} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="flex-1 bg-transparent border-none outline-none text-sm"
                style={{
                    color: 'var(--fg)',
                    caretColor: 'var(--fg)',
                    fontFamily: 'inherit',
                }}
            />
            {value && (
                <button
                    onClick={() => onChange('')}
                    className="p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    style={{ color: 'var(--fg-muted)', flexShrink: 0 }}
                    aria-label="Clear search"
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );
}
