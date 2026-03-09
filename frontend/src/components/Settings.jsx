import { useState, useEffect } from 'react';
import { getBirthDate, setBirthDate, setLifespanYears, getLifespanYears, MONTH_NAMES_FULL } from '../utils/dateEngine';
import { saveSettings, isAuthenticated } from '../utils/api';
import { getAllDotMeta } from '../utils/dotMeta';
import { PALETTE } from '../utils/dotMeta';

export default function Settings({ isOpen, onClose, onBirthDateChange, heartbeat, onHeartbeatChange, defaultColor, onSaveDefaultColor, isLoggedIn, onLogout, refreshKey }) {
    const [year, setYear] = useState(() => getBirthDate().getFullYear());
    const [month, setMonth] = useState(() => getBirthDate().getMonth());
    const [day, setDay] = useState(() => String(getBirthDate().getDate()));
    const [lifespan, setLifespan] = useState(() => getLifespanYears());
    const [localDefaultColor, setLocalDefaultColor] = useState(defaultColor);

    useEffect(() => {
        const b = getBirthDate();
        setYear(b.getFullYear());
        setMonth(b.getMonth());
        setDay(String(b.getDate()));
        setLifespan(getLifespanYears());
        setLocalDefaultColor(defaultColor);
    }, [isOpen, defaultColor, refreshKey]);

    if (!isOpen) return null;

    const handleSave = () => {
        const dayNum = Math.max(1, Math.min(parseInt(day) || 1, daysInMonth));
        setBirthDate(year, month, dayNum);
        setLifespanYears(lifespan);

        if (isAuthenticated()) {
            const m = String(month + 1).padStart(2, '0');
            const d = String(dayNum).padStart(2, '0');
            saveSettings({
                birth_date: `${year}-${m}-${d}`,
                expected_lifespan: Number(lifespan) || 80,
                dot_meta: getAllDotMeta(),
            }).catch((err) => console.error('Failed to save settings:', err));
        }

        if (localDefaultColor !== defaultColor) {
            onSaveDefaultColor(localDefaultColor);
        }
        onBirthDateChange();
        onClose();
    };

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const inputStyle = {
        backgroundColor: 'var(--control-bg)',
        color: 'var(--fg)',
        border: '1px solid var(--control-border)',
        padding: '10px 14px',
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
            onClick={onClose}
        >
            <div
                className="rounded-2xl shadow-2xl w-full max-w-sm mx-4"
                style={{
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--control-border)',
                    padding: '32px 28px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <h2
                    className="text-lg font-semibold"
                    style={{ color: 'var(--fg)', marginBottom: '4px' }}
                >
                    Settings
                </h2>
                <p
                    className="text-xs font-light"
                    style={{ color: 'var(--fg-muted)', marginBottom: '24px' }}
                >
                    Personalize your life in dots
                </p>

                {/* Section: Birth Date */}
                <p
                    className="text-[10px] font-semibold tracking-widest uppercase"
                    style={{ color: 'var(--fg-muted)', marginBottom: '14px' }}
                >
                    Birth Date
                </p>

                {/* Year + Day row */}
                <div className="flex gap-3" style={{ marginBottom: '12px' }}>
                    <label className="flex-1">
                        <span
                            className="text-xs font-medium block"
                            style={{ color: 'var(--fg-muted)', marginBottom: '6px' }}
                        >
                            Year
                        </span>
                        <input
                            type="number"
                            min="1920"
                            max="2025"
                            value={year}
                            onChange={(e) => {
                                const val = e.target.value;
                                setYear(val === '' ? '' : parseInt(val) || 2000);
                            }}
                            className="w-full rounded-lg text-sm outline-none"
                            style={inputStyle}
                        />
                    </label>
                    <label style={{ width: '80px', flexShrink: 0 }}>
                        <span
                            className="text-xs font-medium block"
                            style={{ color: 'var(--fg-muted)', marginBottom: '6px' }}
                        >
                            Day
                        </span>
                        <input
                            type="number"
                            min="1"
                            max={daysInMonth}
                            value={day}
                            onChange={(e) => setDay(e.target.value)}
                            onBlur={() => {
                                const val = parseInt(day);
                                setDay(String(isNaN(val) ? 1 : Math.max(1, Math.min(val, daysInMonth))));
                            }}
                            className="w-full rounded-lg text-sm outline-none"
                            style={inputStyle}
                        />
                    </label>
                </div>

                {/* Month */}
                <label className="block" style={{ marginBottom: '20px' }}>
                    <span
                        className="text-xs font-medium block"
                        style={{ color: 'var(--fg-muted)', marginBottom: '6px' }}
                    >
                        Month
                    </span>
                    <select
                        value={month}
                        onChange={(e) => setMonth(parseInt(e.target.value))}
                        className="w-full rounded-lg text-sm outline-none"
                        style={inputStyle}
                    >
                        {MONTH_NAMES_FULL.map((name, i) => (
                            <option key={i} value={i}>
                                {name}
                            </option>
                        ))}
                    </select>
                </label>

                {/* Divider */}
                <div
                    style={{
                        height: '1px',
                        backgroundColor: 'var(--control-border)',
                        marginBottom: '20px',
                    }}
                />

                {/* Section: Life Expectancy */}
                <p
                    className="text-[10px] font-semibold tracking-widest uppercase"
                    style={{ color: 'var(--fg-muted)', marginBottom: '14px' }}
                >
                    Life Expectancy
                </p>

                <label className="block" style={{ marginBottom: '28px' }}>
                    <span
                        className="text-xs font-medium block"
                        style={{ color: 'var(--fg-muted)', marginBottom: '6px' }}
                    >
                        Expected years to live
                    </span>
                    <input
                        type="number"
                        min="1"
                        max="150"
                        value={lifespan}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                                setLifespan('');
                            } else {
                                const num = parseInt(val);
                                if (!isNaN(num)) setLifespan(Math.max(1, Math.min(num, 150)));
                            }
                        }}
                        onBlur={() => {
                            if (lifespan === '' || isNaN(lifespan)) setLifespan(80);
                        }}
                        className="w-full rounded-lg text-sm outline-none"
                        style={inputStyle}
                    />
                </label>

                {/* Divider */}
                <div
                    style={{
                        height: '1px',
                        backgroundColor: 'var(--control-border)',
                        marginBottom: '20px',
                    }}
                />

                {/* Section: Preferences */}
                <p
                    className="text-[10px] font-semibold tracking-widest uppercase"
                    style={{ color: 'var(--fg-muted)', marginBottom: '14px' }}
                >
                    Preferences
                </p>

                {/* Default Dot Color */}
                <div style={{ marginBottom: '24px' }}>
                    <span
                        className="text-xs font-medium block"
                        style={{ color: 'var(--fg)', marginBottom: '8px' }}
                    >
                        Default dot color
                    </span>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setLocalDefaultColor('theme')}
                            className="swatch-btn"
                            style={{
                                backgroundColor: 'var(--dot-lived)',
                                outline: localDefaultColor === 'theme' ? '2px solid var(--fg)' : 'none',
                                outlineOffset: '2px',
                            }}
                            title="Theme Adaptive"
                            type="button"
                        />
                        {PALETTE.map((color) => (
                            <button
                                key={color}
                                className="swatch-btn"
                                style={{
                                    backgroundColor: color,
                                    outline: localDefaultColor === color ? `2px solid ${color}` : 'none',
                                    outlineOffset: '2px',
                                }}
                                onClick={() => setLocalDefaultColor(color)}
                                title={color}
                                type="button"
                            />
                        ))}
                    </div>
                </div>

                <div
                    className="flex items-center justify-between"
                    style={{ marginBottom: '28px' }}
                >
                    <div>
                        <span
                            className="text-xs font-medium block"
                            style={{ color: 'var(--fg)' }}
                        >
                            Heartbeat pulse
                        </span>
                        <span
                            className="text-[10px] font-light"
                            style={{ color: 'var(--fg-muted)' }}
                        >
                            Animate the current time dot
                        </span>
                    </div>
                    <button
                        onClick={() => onHeartbeatChange(!heartbeat)}
                        className="relative rounded-full transition-colors duration-200"
                        style={{
                            width: '44px',
                            height: '24px',
                            backgroundColor: heartbeat ? 'var(--fg)' : 'var(--control-border)',
                            flexShrink: 0,
                        }}
                        type="button"
                    >
                        <span
                            className="absolute rounded-full transition-transform duration-200"
                            style={{
                                width: '18px',
                                height: '18px',
                                backgroundColor: 'var(--bg)',
                                top: '50%',
                                left: heartbeat ? '23px' : '3px',
                                transform: 'translateY(-50%)',
                            }}
                        />
                    </button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded-full text-sm font-medium transition-colors"
                        style={{
                            padding: '11px 16px',
                            backgroundColor: 'var(--control-bg)',
                            color: 'var(--fg)',
                            border: '1px solid var(--control-border)',
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 rounded-full text-sm font-medium transition-colors"
                        style={{
                            padding: '11px 16px',
                            backgroundColor: 'var(--fg)',
                            color: 'var(--bg)',
                        }}
                    >
                        Save
                    </button>
                </div>

                {isLoggedIn && (
                    <>
                        <div
                            style={{
                                height: '1px',
                                backgroundColor: 'var(--control-border)',
                                marginTop: '20px',
                                marginBottom: '20px',
                            }}
                        />
                        <button
                            onClick={() => { onLogout(); onClose(); }}
                            className="w-full rounded-full text-sm font-medium transition-colors"
                            style={{
                                padding: '11px 16px',
                                backgroundColor: 'var(--control-bg)',
                                color: '#e07070',
                                border: '1px solid var(--control-border)',
                            }}
                            type="button"
                        >
                            Sign out
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
