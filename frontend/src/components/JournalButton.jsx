import { BookOpen } from 'lucide-react';

export default function JournalButton({ onClick }) {
    return (
        <button
            onClick={onClick}
            className="p-2 rounded-full transition-colors duration-200"
            style={{
                backgroundColor: 'var(--control-bg)',
                color: 'var(--fg)',
            }}
            onMouseEnter={(e) =>
                (e.target.style.backgroundColor = 'var(--control-hover)')
            }
            onMouseLeave={(e) =>
                (e.target.style.backgroundColor = 'var(--control-bg)')
            }
            aria-label="Open journal"
        >
            <BookOpen size={16} />
        </button>
    );
}
