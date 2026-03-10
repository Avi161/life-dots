export default function ViewSelector({ viewMode, onChange, onBack }) {
    const showBack = viewMode === 'singleYear' || viewMode === 'singleMonth' || viewMode === 'singleDay';

    const tabs = [
        { key: 'years', label: 'Years' },
        { key: 'months', label: 'Months' },
    ];

    return (
        <div className="flex items-center gap-2">
            {showBack && (
                <button
                    onClick={onBack}
                    className="text-sm font-medium rounded-full transition-all duration-200 hover:scale-105 hover:opacity-80 active:scale-95"
                    style={{
                        padding: '8px 19px',
                        backgroundColor: 'var(--control-bg)',
                        color: 'var(--fg)',
                        border: '1px solid var(--control-border)',
                    }}
                >
                    ← Back
                </button>
            )}

            {!showBack &&
                tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => onChange(tab.key)}
                        className="relative text-sm font-medium rounded-full transition-all duration-200 hover:scale-105 hover:opacity-80 active:scale-95"
                        style={{
                            padding: '8px 19px',
                            backgroundColor:
                                viewMode === tab.key ? 'var(--fg)' : 'var(--control-bg)',
                            color:
                                viewMode === tab.key ? 'var(--bg)' : 'var(--fg)',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
        </div>
    );
}
