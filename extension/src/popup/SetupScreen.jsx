import React, { useState } from 'react';

export default function SetupScreen({ onDone }) {
    const [birthDate, setBirthDate] = useState('');
    const [lifespan, setLifespan] = useState('80');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (!birthDate) {
            setError('Please enter your birth date.');
            return;
        }

        const ls = parseInt(lifespan, 10);
        if (isNaN(ls) || ls < 1 || ls > 150) {
            setError('Lifespan must be between 1 and 150.');
            return;
        }

        onDone(birthDate, ls);
    };

    return (
        <div
            className="fade-in"
            style={{
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
                background: 'var(--bg)',
                minHeight: 300,
            }}
        >
            {/* Dot grid preview */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', padding: '0 8px' }}>
                {Array.from({ length: 40 }, (_, i) => (
                    <div
                        key={i}
                        style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: i < 8 ? 'var(--dot-lived)' : 'transparent',
                            border: i < 8 ? 'none' : '1.5px solid var(--dot-future-border)',
                            opacity: i < 8 ? 1 : 0.7,
                        }}
                    />
                ))}
            </div>

            <div style={{ textAlign: 'center' }}>
                <h1
                    style={{
                        fontSize: 17,
                        fontWeight: 600,
                        letterSpacing: '-0.02em',
                        color: 'var(--fg)',
                        marginBottom: 6,
                    }}
                >
                    Life in Dots
                </h1>
                <p style={{ fontSize: 12.5, color: 'var(--fg-muted)', fontWeight: 300, lineHeight: 1.5 }}>
                    Your life, visualized as dots.
                    <br />
                    Set up to get started.
                </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--fg-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        Birth Date
                    </label>
                    <input
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        style={{
                            background: 'var(--control-bg)',
                            color: 'var(--fg)',
                            border: '1px solid var(--control-border)',
                            borderRadius: 8,
                            padding: '7px 10px',
                            fontSize: 13,
                            fontFamily: 'inherit',
                            outline: 'none',
                            width: '100%',
                            colorScheme: 'inherit',
                        }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--fg-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        Expected Lifespan (years)
                    </label>
                    <input
                        type="number"
                        min="1"
                        max="150"
                        value={lifespan}
                        onChange={(e) => setLifespan(e.target.value)}
                        style={{
                            background: 'var(--control-bg)',
                            color: 'var(--fg)',
                            border: '1px solid var(--control-border)',
                            borderRadius: 8,
                            padding: '7px 10px',
                            fontSize: 13,
                            fontFamily: 'inherit',
                            outline: 'none',
                            width: '100%',
                        }}
                    />
                </div>

                {error && (
                    <p style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>{error}</p>
                )}

                <button
                    type="submit"
                    style={{
                        background: 'var(--fg)',
                        color: 'var(--bg)',
                        border: 'none',
                        borderRadius: 8,
                        padding: '9px 0',
                        fontSize: 13,
                        fontWeight: 500,
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        width: '100%',
                        marginTop: 2,
                        transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                    Get Started
                </button>
            </form>
        </div>
    );
}
