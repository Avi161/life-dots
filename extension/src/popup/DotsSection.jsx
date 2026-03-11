import React, { useState, useCallback, useRef, useEffect } from 'react';
import { CalendarHeart } from 'lucide-react';
import {
    getBirthDate,
    getLifespanYears,
    getYearStatus,
    getMonthStatus,
    getYearLabel,
    getCalendarYear,
    getAgeLabel,
    getMonthsForYear,
    getDaysForMonth,
    getHoursForDay,
    getMonthLabel,
    getDayLabel,
    getHourLabel,
    getCurrentYearIndex,
    getCalendarDate,
    getLifeStats,
    MONTH_NAMES,
    MONTH_NAMES_FULL,
    TOTAL_MONTHS,
    LIFESPAN_YEARS,
} from '@dateEngine';
import { getAllDotMeta, setDotMeta } from '../utils/dotMeta.js';
import ContextMenu from './ContextMenu.jsx';
import JournalOverlay from './JournalOverlay.jsx';

// ── Journal context (mirrors useJournalContext hook from website) ──────────────
function getJournalContext(viewMode, selectedYear, selectedMonth, selectedDay) {
    if (viewMode === 'months' || viewMode === 'years' || selectedYear == null) {
        return { contextKey: 'life', displayTitle: 'Life Journal' };
    }
    const calYear = getCalendarYear(selectedYear);
    if (viewMode === 'singleYear' || selectedMonth == null) {
        return { contextKey: `year-${selectedYear}`, displayTitle: `Journal for Year ${calYear}` };
    }
    const monthName = MONTH_NAMES_FULL[selectedMonth];
    if (viewMode === 'singleMonth' || selectedDay == null) {
        return { contextKey: `year-${selectedYear}-month-${selectedMonth}`, displayTitle: `Journal for ${monthName} ${calYear}` };
    }
    return {
        contextKey: `year-${selectedYear}-month-${selectedMonth}-day-${selectedDay}`,
        displayTitle: `Journal for ${monthName} ${selectedDay}, ${calYear}`,
    };
}

// ── Dot component — matches website exactly ───────────────────────────────────
// Dot sizes at sm breakpoint (matches website)
const DOT_SIZE = { xs: 6, sm: 8, md: 14, lg: 36 };

const Dot = React.memo(function Dot({
    status, label, onClick, onContextMenu, dotId,
    size = 'sm', heartbeat = true, color = null,
}) {
    const [tooltip, setTooltip] = useState(null);

    if (status === 'before-birth') {
        const px = DOT_SIZE[size] ?? 8;
        return <div style={{ width: px, height: px, flexShrink: 0, visibility: 'hidden' }} />;
    }

    const px = DOT_SIZE[size] ?? 8;
    const isCurrent = status === 'current';
    const isLived = status === 'lived';

    const backgroundColor = isLived
        ? (color ?? 'var(--dot-lived)')
        : isCurrent
            ? (color ?? 'var(--dot-current)')
            : 'transparent';

    const border = isLived
        ? 'none'
        : isCurrent
            ? `1.5px solid ${color ?? 'var(--dot-current)'}`
            : `1.5px solid ${color ?? 'var(--dot-future-border)'}`;

    const handleCtx = (e) => {
        if (onContextMenu) {
            e.preventDefault();
            setTooltip(null);
            onContextMenu(e, dotId);
        }
    };

    return (
        <>
            <div
                className={isCurrent && heartbeat ? 'dot-current' : ''}
                style={{
                    width: px, height: px,
                    borderRadius: '50%',
                    flexShrink: 0,
                    backgroundColor,
                    border,
                    cursor: onClick || onContextMenu ? 'pointer' : 'default',
                    transition: 'transform 0.15s ease',
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                    position: 'relative',
                }}
                onClick={onClick}
                onContextMenu={handleCtx}
                onMouseEnter={(e) => {
                    setTooltip({ x: e.clientX, y: e.clientY - 30 });
                    if (onClick || onContextMenu) e.currentTarget.style.transform = 'scale(1.5)';
                }}
                onMouseMove={(e) => setTooltip({ x: e.clientX, y: e.clientY - 30 })}
                onMouseLeave={(e) => {
                    setTooltip(null);
                    e.currentTarget.style.transform = 'scale(1)';
                }}
                role={onClick ? 'button' : undefined}
                tabIndex={onClick ? 0 : undefined}
                aria-label={label}
            />
            {tooltip && (
                <div
                    className="ext-tooltip visible"
                    style={{ left: tooltip.x, top: tooltip.y, position: 'fixed' }}
                >
                    {label}
                </div>
            )}
        </>
    );
}, (prev, next) =>
    prev.status === next.status &&
    prev.label === next.label &&
    prev.color === next.color &&
    prev.size === next.size &&
    prev.heartbeat === next.heartbeat
);

// ── TagBadge ──────────────────────────────────────────────────────────────────
function TagBadge({ tag }) {
    if (!tag) return null;
    return (
        <span style={{
            fontSize: 8.5,
            color: 'var(--fg-muted)',
            fontWeight: 400,
            letterSpacing: '0.02em',
            textAlign: 'center',
            maxWidth: 52,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
        }}>
            {tag}
        </span>
    );
}

// ── ViewSelector — exact match of website component ───────────────────────────
function ViewSelector({ viewMode, onChange, onBack }) {
    const showBack = viewMode === 'singleYear' || viewMode === 'singleMonth' || viewMode === 'singleDay';

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {showBack ? (
                <button
                    className="view-pill"
                    style={{
                        backgroundColor: 'var(--control-bg)',
                        color: 'var(--fg)',
                        border: '1px solid var(--control-border)',
                    }}
                    onClick={onBack}
                >
                    ← Back
                </button>
            ) : (
                ['years', 'months'].map((key) => (
                    <button
                        key={key}
                        className="view-pill"
                        style={{
                            backgroundColor: viewMode === key ? 'var(--fg)' : 'var(--control-bg)',
                            color: viewMode === key ? 'var(--bg)' : 'var(--fg)',
                        }}
                        onClick={() => onChange(key)}
                    >
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                    </button>
                ))
            )}
        </div>
    );
}

// ── Main DotsSection ──────────────────────────────────────────────────────────
export default function DotsSection({ refreshKey = 0 }) {
    const now = new Date();
    const stats = getLifeStats(now);
    const birth = getBirthDate();
    const lifespanYears = getLifespanYears();
    const currentYearIdx = getCurrentYearIndex(now);

    // Navigation state — mirrors website App.jsx exactly
    const [viewMode, setViewMode] = useState('years');
    const [selectedYear, setSelectedYear] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [selectedDay, setSelectedDay] = useState(null);
    const [navStack, setNavStack] = useState([]);

    // Dot metadata
    const [meta, setMeta] = useState(() => getAllDotMeta());
    const [contextMenu, setContextMenu] = useState(null);

    // Journal
    const [journalOpen, setJournalOpen] = useState(false);
    const { contextKey, displayTitle } = getJournalContext(viewMode, selectedYear, selectedMonth, selectedDay);

    const refreshMeta = useCallback(() => setMeta(getAllDotMeta()), []);

    // Re-read dot meta when parent signals a remote sync completed
    useEffect(() => {
        if (refreshKey > 0) refreshMeta();
    }, [refreshKey, refreshMeta]);

    // ── Navigation handlers (exact mirror of website) ──────────────────────────

    const pushView = useCallback((mode) => {
        setNavStack((prev) => [...prev, viewMode]);
        setViewMode(mode);
    }, [viewMode]);

    const handleBack = useCallback(() => {
        const prev = navStack[navStack.length - 1];
        setNavStack((s) => s.slice(0, -1));

        if (viewMode === 'singleDay') {
            setSelectedDay(null);
        } else if (viewMode === 'singleMonth') {
            setSelectedMonth(null);
            if (prev === 'months') setSelectedYear(null);
        } else if (viewMode === 'singleYear') {
            setSelectedYear(null);
            setSelectedMonth(null);
            setSelectedDay(null);
        }

        setViewMode(prev || 'years');
    }, [navStack, viewMode]);

    const handleViewChange = useCallback((mode) => {
        setViewMode(mode);
        setNavStack([]);
        setSelectedYear(null);
        setSelectedMonth(null);
        setSelectedDay(null);
    }, []);

    const handleYearClick = useCallback((yearIndex) => {
        setSelectedYear(yearIndex);
        setNavStack((prev) => [...prev, viewMode]);
        setViewMode('singleYear');
    }, [viewMode]);

    const handleMonthClick = useCallback((calMonth) => {
        setSelectedMonth(calMonth);
        setNavStack((prev) => [...prev, viewMode]);
        setViewMode('singleMonth');
    }, [viewMode]);

    const handleMonthGridClick = useCallback((monthIndex) => {
        const { year: calYear, month: calMonth } = getCalendarDate(monthIndex);
        const yearIndex = calYear - birth.getFullYear();
        setSelectedYear(yearIndex);
        setSelectedMonth(calMonth);
        setNavStack((prev) => [...prev, viewMode]);
        setViewMode('singleMonth');
    }, [viewMode, birth]);

    const handleDayClick = useCallback((day) => {
        setSelectedDay(day);
        setNavStack((prev) => [...prev, viewMode]);
        setViewMode('singleDay');
    }, [viewMode]);

    const handleNavigateYear = useCallback((direction) => {
        setSelectedYear((prev) => {
            if (prev == null) return prev;
            const next = prev + direction;
            if (next < 0) return 0;
            if (next >= stats.totalYears) return stats.totalYears - 1;
            return next;
        });
    }, [stats.totalYears]);

    const handleNavigateMonth = useCallback((direction) => {
        if (selectedMonth == null || selectedYear == null) return;
        let newMonth = selectedMonth + direction;
        let newYear = selectedYear;
        if (newMonth < 0) { newMonth = 11; newYear -= 1; }
        else if (newMonth > 11) { newMonth = 0; newYear += 1; }
        if (newYear < 0) { newYear = 0; newMonth = 0; }
        else if (newYear >= stats.totalYears) { newYear = stats.totalYears - 1; newMonth = 11; }
        setSelectedMonth(newMonth);
        setSelectedYear(newYear);
    }, [selectedMonth, selectedYear, stats.totalYears]);

    const handleNavigateDay = useCallback((direction) => {
        if (selectedYear == null || selectedMonth == null || selectedDay == null) return;
        const calYear = birth.getFullYear() + selectedYear;
        const d = new Date(calYear, selectedMonth, selectedDay + direction);
        if (d < birth) return;
        const newYearIndex = d.getFullYear() - birth.getFullYear();
        if (newYearIndex >= stats.totalYears) return;
        setSelectedDay(d.getDate());
        setSelectedMonth(d.getMonth());
        setSelectedYear(newYearIndex);
    }, [selectedYear, selectedMonth, selectedDay, stats.totalYears, birth]);

    const jumpToToday = useCallback(() => {
        if (!birth || now < birth) return;
        const yearIndex = now.getFullYear() - birth.getFullYear();
        if (yearIndex >= stats.totalYears) return;
        setSelectedYear(yearIndex);
        setSelectedMonth(now.getMonth());
        setSelectedDay(now.getDate());
        setNavStack(['years', 'singleYear', 'singleMonth']);
        setViewMode('singleDay');
    }, [birth, stats.totalYears]);

    // Context menu handlers
    const handleContextMenu = useCallback((e, dotId) => {
        setContextMenu({ x: e.clientX, y: e.clientY, dotId });
    }, []);

    const handleMetaUpdate = useCallback(async (dotId, { color, tag }) => {
        await setDotMeta(dotId, { color, tag });
        refreshMeta();
    }, [refreshMeta]);

    // Helper: month index from calendar year+month
    const getMonthIdxFromCal = (calYear, calMonth) => {
        return (calYear - birth.getFullYear()) * 12 + (calMonth - birth.getMonth());
    };

    // Footer label (matches website)
    const footerLabel = {
        months: `${stats.totalMonths} months · ${stats.percentLived}% lived`,
        years: `${stats.totalYears} years · Right-click a dot to color or tag`,
        singleYear: 'Each dot is a month — click to see days',
        singleMonth: 'Each dot is a day — click to see hours',
        singleDay: 'Each dot is an hour of your day',
    }[viewMode] || '';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>
            {/* View nav row */}
            <div className="view-nav">
                <div className="view-nav-left">
                    <ViewSelector
                        viewMode={viewMode}
                        onChange={handleViewChange}
                        onBack={handleBack}
                    />
                </div>
                <div className="view-nav-right">
                    {/* Journal button */}
                    <button
                        className="ctrl-btn"
                        onClick={() => setJournalOpen(true)}
                        title="Open journal"
                        aria-label="Open journal"
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                        </svg>
                    </button>
                    {/* Jump to Today */}
                    <button
                        className="ctrl-btn"
                        onClick={jumpToToday}
                        title="Jump to today"
                        aria-label="Jump to today"
                    >
                        <CalendarHeart size={15} />
                    </button>
                </div>
            </div>

            {/* Dot grid — scrollable, vertically centered for compact views */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
                justifyContent: viewMode === 'years' ? 'center' : 'flex-start',
            }}>
                <DotGridContent
                    viewMode={viewMode}
                    selectedYear={selectedYear}
                    selectedMonth={selectedMonth}
                    selectedDay={selectedDay}
                    meta={meta}
                    now={now}
                    birth={birth}
                    stats={stats}
                    onYearClick={handleYearClick}
                    onMonthClick={handleMonthClick}
                    onMonthGridClick={handleMonthGridClick}
                    onDayClick={handleDayClick}
                    onNavigateYear={handleNavigateYear}
                    onNavigateMonth={handleNavigateMonth}
                    onNavigateDay={handleNavigateDay}
                    onContextMenu={handleContextMenu}
                    getMonthIdxFromCal={getMonthIdxFromCal}
                />

                {/* Footer label */}
                <p style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 300, textAlign: 'center', flexShrink: 0 }}>
                    {footerLabel}
                </p>
            </div>

            {/* Context menu */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    dotId={contextMenu.dotId}
                    meta={meta[String(contextMenu.dotId)] ?? { color: null, tag: null }}
                    onUpdate={handleMetaUpdate}
                    onClose={() => setContextMenu(null)}
                />
            )}

            {/* Journal overlay */}
            {journalOpen && (
                <JournalOverlay
                    contextKey={contextKey}
                    displayTitle={displayTitle}
                    onClose={() => setJournalOpen(false)}
                />
            )}
        </div>
    );
}

// ── Grid content renderer ─────────────────────────────────────────────────────
function DotGridContent({
    viewMode, selectedYear, selectedMonth, selectedDay,
    meta, now, birth, stats,
    onYearClick, onMonthClick, onMonthGridClick, onDayClick,
    onNavigateYear, onNavigateMonth, onNavigateDay,
    onContextMenu, getMonthIdxFromCal,
}) {
    const getDm = (id) => meta[String(id)] ?? { color: null, tag: null };

    // ── Hours View ──────────────────────────────────────────────────────────────
    if (viewMode === 'singleDay') {
        const calYear = getCalendarYear(selectedYear);
        const hours = getHoursForDay(calYear, selectedMonth, selectedDay, now);
        const parentDotId = `day_${calYear}_${selectedMonth}_${selectedDay}`;
        const parentTag = meta[parentDotId]?.tag;
        const dayLabel = getDayLabel(calYear, selectedMonth, selectedDay) + (parentTag ? ` · ${parentTag}` : '');

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
                <NavHeader label={dayLabel} onPrev={() => onNavigateDay(-1)} onNext={() => onNavigateDay(1)} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px 16px', maxWidth: 340 }}>
                    {hours.map((h) => {
                        const dotId = `hour_${calYear}_${selectedMonth}_${selectedDay}_${h.hour}`;
                        const dm = getDm(dotId);
                        const label = dm.tag ? `${h.label} · ${dm.tag}` : h.label;
                        return (
                            <div key={h.hour} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                                <Dot status={h.status} label={label} dotId={dotId} size="lg" color={dm.color} onContextMenu={onContextMenu} />
                                <span style={{ fontSize: 9, color: 'var(--fg-muted)', fontWeight: 500 }}>
                                    {h.hour === 0 ? '12a' : h.hour === 12 ? '12p' : h.hour < 12 ? `${h.hour}a` : `${h.hour - 12}p`}
                                </span>
                                <TagBadge tag={dm.tag} />
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // ── Days View ───────────────────────────────────────────────────────────────
    if (viewMode === 'singleMonth') {
        const calYear = getCalendarYear(selectedYear);
        const days = getDaysForMonth(calYear, selectedMonth, now);
        const parentDotId = String(getMonthIdxFromCal(calYear, selectedMonth));
        const parentTag = meta[parentDotId]?.tag;
        const monthLabel = `${MONTH_NAMES[selectedMonth]} ${calYear}` + (parentTag ? ` · ${parentTag}` : '');
        const visibleDays = days.filter((d) => d.status !== 'before-birth');

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
                <NavHeader label={monthLabel} onPrev={() => onNavigateMonth(-1)} onNext={() => onNavigateMonth(1)} subLabel={`${visibleDays.length} days`} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px 16px', maxWidth: 340 }}>
                    {days.map((d) => {
                        const dotId = `day_${calYear}_${selectedMonth}_${d.day}`;
                        const dm = getDm(dotId);
                        const label = dm.tag ? `${d.label} · ${dm.tag}` : d.label;
                        return (
                            <div key={d.day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, position: 'relative' }}>
                                <Dot
                                    status={d.status}
                                    label={label}
                                    dotId={dotId}
                                    size="md"
                                    color={dm.color}
                                    onClick={d.clickable ? () => onDayClick(d.day) : undefined}
                                    onContextMenu={d.status !== 'before-birth' ? onContextMenu : undefined}
                                />
                                <span style={{
                                    fontSize: 9,
                                    color: 'var(--fg-muted)',
                                    fontWeight: 500,
                                    visibility: d.status === 'before-birth' ? 'hidden' : 'visible',
                                }}>
                                    {d.day}
                                </span>
                                <TagBadge tag={dm.tag} />
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // ── Single Year View (12 months) ────────────────────────────────────────────
    if (viewMode === 'singleYear') {
        const calYear = getCalendarYear(selectedYear);
        const months = getMonthsForYear(selectedYear, now);
        const parentDotId = `year_${selectedYear}`;
        const parentTag = meta[parentDotId]?.tag;
        const yearLabel = getYearLabel(selectedYear) + (parentTag ? ` · ${parentTag}` : '');
        const ageLabel = getAgeLabel(selectedYear);

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
                <NavHeader label={yearLabel} onPrev={() => onNavigateYear(-1)} onNext={() => onNavigateYear(1)} subLabel={ageLabel} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px 24px', padding: '0 8px' }}>
                    {months.map((m) => {
                        const dotId = String(getMonthIdxFromCal(calYear, m.calMonth));
                        const dm = getDm(dotId);
                        const label = dm.tag ? `${m.label} · ${dm.tag}` : m.label;
                        return (
                            <div key={m.calMonth} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative' }}>
                                <Dot
                                    status={m.status}
                                    label={label}
                                    dotId={dotId}
                                    size="lg"
                                    color={dm.color}
                                    onClick={m.clickable ? () => onMonthClick(m.calMonth) : undefined}
                                    onContextMenu={m.status !== 'before-birth' ? onContextMenu : undefined}
                                />
                                <span style={{
                                    fontSize: 9.5,
                                    fontWeight: 500,
                                    letterSpacing: '0.06em',
                                    textTransform: 'uppercase',
                                    color: 'var(--fg-muted)',
                                    visibility: m.status === 'before-birth' ? 'hidden' : 'visible',
                                }}>
                                    {MONTH_NAMES[m.calMonth]}
                                </span>
                                <TagBadge tag={dm.tag} />
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // ── Years View (lifespan dots) ──────────────────────────────────────────────
    if (viewMode === 'years') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
                <p style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 300 }}>
                    Each dot is a year of your life
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '6px 16px', maxWidth: 340, margin: '0 auto', justifyItems: 'center' }}>
                    {Array.from({ length: LIFESPAN_YEARS }, (_, i) => {
                        const dotId = `year_${i}`;
                        const dm = getDm(dotId);
                        const rawLabel = `${getYearLabel(i)} · ${getAgeLabel(i)}`;
                        const label = dm.tag ? `${rawLabel} · ${dm.tag}` : rawLabel;
                        return (
                            <div key={dotId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                <Dot
                                    status={getYearStatus(i, now)}
                                    label={label}
                                    dotId={dotId}
                                    size="md"
                                    color={dm.color}
                                    onClick={() => onYearClick(i)}
                                    onContextMenu={onContextMenu}
                                />
                                <TagBadge tag={dm.tag} />
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // ── Months View (full lifespan as months) ───────────────────────────────────
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(24, minmax(0, 1fr))',
                gap: '3px',
                width: '100%',
                maxWidth: 360,
            }}>
                {Array.from({ length: TOTAL_MONTHS }, (_, i) => {
                    const dotId = String(i);
                    const dm = getDm(dotId);
                    const label = dm.tag ? `${getMonthLabel(i)} · ${dm.tag}` : getMonthLabel(i);
                    return (
                        <Dot
                            key={`m-${i}`}
                            status={getMonthStatus(i, now)}
                            label={label}
                            dotId={dotId}
                            size="xs"
                            color={dm.color}
                            onClick={() => onMonthGridClick(i)}
                            onContextMenu={onContextMenu}
                        />
                    );
                })}
            </div>
        </div>
    );
}

// ── Nav header with prev/next arrows ─────────────────────────────────────────
function NavHeader({ label, onPrev, onNext, subLabel }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'center' }}>
            <button
                className="ctrl-btn"
                onClick={onPrev}
                style={{ padding: 3 }}
                aria-label="Previous"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                </svg>
            </button>
            <div style={{ textAlign: 'center', flex: 1 }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg)', letterSpacing: '-0.02em', display: 'block' }}>
                    {label}
                </span>
                {subLabel && (
                    <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 300 }}>
                        {subLabel}
                    </span>
                )}
            </div>
            <button
                className="ctrl-btn"
                onClick={onNext}
                style={{ padding: 3 }}
                aria-label="Next"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                </svg>
            </button>
        </div>
    );
}
