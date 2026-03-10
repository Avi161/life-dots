import { useState, useCallback, useRef } from 'react';
import useLongPress from '../hooks/useLongPress';
import { motion, AnimatePresence } from 'framer-motion';
import {
    getMonthStatus,
    getYearStatus,
    getMonthLabel,
    getYearLabel,
    getCalendarYear,
    getAgeLabel,
    getDayLabel,
    getHourLabel,
    getMonthsForYear,
    getDaysForMonth,
    getHoursForDay,
    getLifeStats,
    getBirthDate,
    TOTAL_MONTHS,
    LIFESPAN_YEARS,
    MONTH_NAMES,
} from '../utils/dateEngine';
import { getAllDotMeta, setDotMeta } from '../utils/dotMeta';
import Tooltip from './Tooltip';
import ContextMenu from './ContextMenu';
import TagBadge from './TagBadge';

const DOT_VARIANTS = {
    hidden: { opacity: 0, scale: 0.3 },
    visible: (i) => ({
        opacity: 1,
        scale: 1,
        transition: {
            delay: Math.min((i || 0) * 0.0005, 0.6), // default to 0 if i is string
            duration: 0.3,
            ease: 'easeOut',
        },
    }),
    exit: { opacity: 0, scale: 0.5, transition: { duration: 0.2 } },
};

function sizeClass(size) {
    const map = {
        xs: 'w-[5px] h-[5px] sm:w-[7px] sm:h-[7px] md:w-[8px] md:h-[8px]',
        sm: 'w-[6px] h-[6px] sm:w-[8px] sm:h-[8px] md:w-[10px] md:h-[10px]',
        md: 'w-[10px] h-[10px] sm:w-[14px] sm:h-[14px] md:w-[18px] md:h-[18px]',
        lg: 'w-[28px] h-[28px] sm:w-[36px] sm:h-[36px] md:w-[44px] md:h-[44px]',
    };
    return map[size] || map.sm;
}

function Dot({ status, label, onClick, onContextMenu, index, size = 'sm', heartbeat = true, color = null, defaultColor = 'theme' }) {
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const dotRef = useRef(null);

    // Long-press for mobile touch devices
    const longPressHandlers = useLongPress(onContextMenu, index);

    // Hide before-birth dots (invisible placeholder to preserve grid layout)
    if (status === 'before-birth') {
        return <div className={sizeClass(size)} style={{ visibility: 'hidden' }} />;
    }

    const handleMouseEnter = useCallback((e) => {
        setShowTooltip(true);
        setTooltipPos({ x: e.clientX, y: e.clientY - 30 });
    }, []);

    const handleMouseMove = useCallback((e) => {
        setTooltipPos({ x: e.clientX, y: e.clientY - 30 });
    }, []);

    const handleMouseLeave = useCallback(() => {
        setShowTooltip(false);
    }, []);

    const handleContextMenu = useCallback((e) => {
        if (onContextMenu) {
            e.preventDefault();
            setShowTooltip(false);
            onContextMenu(e, index); // index is the dotId
        }
    }, [onContextMenu, index]);

    const baseStyle = `rounded-full transition-all duration-200 ${sizeClass(size)}`;

    let dotStyle;
    if (status === 'lived' || (status === 'current' && !heartbeat)) {
        dotStyle = 'cursor-pointer hover:scale-150';
    } else if (status === 'current') {
        dotStyle = 'dot-current cursor-pointer';
    } else {
        dotStyle = 'cursor-pointer hover:scale-125';
    }

    // Compute background and border based on status + custom color
    let backgroundColor;
    let border;

    const baseColor = defaultColor === 'theme' ? 'var(--dot-lived)' : defaultColor;
    const baseCurrentColor = defaultColor === 'theme' ? 'var(--dot-current)' : defaultColor;

    if (status === 'lived') {
        backgroundColor = color ?? baseColor;
        border = 'none';
    } else if (status === 'current') {
        backgroundColor = color ?? baseCurrentColor;
        border = `1.5px solid ${color ?? baseCurrentColor}`;
    } else {
        // future
        backgroundColor = 'transparent';
        border = `1.5px solid ${color ?? 'var(--dot-future-border)'}`;
    }

    // for variants, if index is a string, generate a lightweight hash or just use 0
    const animationDelayIndex = typeof index === 'number' ? index : 0;

    return (
        <>
            <motion.div
                ref={dotRef}
                custom={animationDelayIndex}
                variants={DOT_VARIANTS}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={`${baseStyle} ${dotStyle}`}
                style={{
                    backgroundColor,
                    border,
                    touchAction: 'pan-y', // Allows vertical scrolling on phones
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                    userSelect: 'none'
                }}
                onClick={onClick}
                onContextMenu={handleContextMenu}
                onMouseEnter={handleMouseEnter}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                {...longPressHandlers}
                role="button"
                tabIndex={0}
                aria-label={label}
            />
            {showTooltip && (
                <Tooltip text={label} x={tooltipPos.x} y={tooltipPos.y} />
            )}
        </>
    );
}

export default function DotGrid({
    viewMode,
    selectedYear,
    selectedMonth,
    selectedDay,
    onYearClick,
    onMonthClick,
    onMonthGridClick,
    onDayClick,
    heartbeat = true,
    defaultColor = 'theme',
}) {
    const now = new Date();
    const stats = getLifeStats(now);

    // ─── Dot metadata (color + tag) ───
    const [meta, setMeta] = useState(() => getAllDotMeta());
    const [contextMenu, setContextMenu] = useState(null); // { x, y, dotId }

    const handleContextMenu = useCallback((e, dotId) => {
        setContextMenu({ x: e.clientX, y: e.clientY, dotId });
    }, []);

    const handleMetaUpdate = useCallback((dotId, { color, tag }) => {
        setDotMeta(dotId, { color, tag });
        setMeta(getAllDotMeta());
    }, []);

    const closeContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    // Helper: get month index (0-1079) from calendar year+month
    const getMonthIndexFromCalendar = (calYear, calMonth) => {
        const birthYear = getBirthDate().getFullYear();
        const birthMonth = getBirthDate().getMonth();
        return (calYear - birthYear) * 12 + (calMonth - birthMonth);
    };

    // ─── Shared Context Menu Renderer ───
    const renderContextMenu = () => {
        if (!contextMenu) return null;
        return (
            <ContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                dotId={contextMenu.dotId}
                meta={meta[String(contextMenu.dotId)] ?? { color: null, tag: null }}
                onUpdate={handleMetaUpdate}
                onClose={closeContextMenu}
            />
        );
    };

    // ─── Hours View (24 dots) ───
    if (viewMode === 'singleDay') {
        const calYear = getCalendarYear(selectedYear);
        const calMonth = selectedMonth;
        const hours = getHoursForDay(calYear, calMonth, selectedDay, now);
        let dayLabel = getDayLabel(calYear, calMonth, selectedDay);

        // Append day tag to header if it exists
        const parentDotId = `day_${calYear}_${calMonth}_${selectedDay}`;
        const parentTag = meta[parentDotId]?.tag;
        if (parentTag) dayLabel += ` · ${parentTag}`;

        return (
            <div className="flex flex-col items-center gap-6" style={{ position: 'relative' }}>
                <div className="text-center">
                    <h2
                        className="text-2xl font-semibold tracking-tight"
                        style={{ color: 'var(--fg)' }}
                    >
                        {dayLabel}
                    </h2>
                    <p
                        className="text-sm mt-1 font-light"
                        style={{ color: 'var(--fg-muted)' }}
                    >
                        24 hours · Right-click a dot to color or tag
                    </p>
                </div>

                <motion.div
                    className="grid grid-cols-6 gap-x-3 gap-y-6 sm:gap-x-4 sm:gap-y-6 max-w-md mx-auto"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <AnimatePresence>
                        {hours.map((h) => {
                            const dotId = `hour_${calYear}_${calMonth}_${selectedDay}_${h.hour}`;
                            const dotMeta = meta[dotId] ?? {};
                            const label = dotMeta.tag ? `${h.label} · ${dotMeta.tag}` : h.label;

                            return (
                                <div
                                    key={h.hour}
                                    className="flex flex-col items-center gap-1.5 relative"
                                >
                                    <Dot
                                        status={h.status}
                                        label={label}
                                        index={dotId}
                                        size="lg"
                                        heartbeat={heartbeat}
                                        color={dotMeta.color ?? null}
                                        defaultColor={defaultColor}
                                        onContextMenu={handleContextMenu}
                                    />
                                    <span
                                        className="text-[9px] font-medium"
                                        style={{ color: 'var(--fg-muted)' }}
                                    >
                                        {h.label}
                                    </span>
                                    <TagBadge tag={dotMeta.tag} />
                                </div>
                            );
                        })}
                    </AnimatePresence>
                </motion.div>
                {renderContextMenu()}
            </div>
        );
    }

    // ─── Days View (28-31 dots) ───
    if (viewMode === 'singleMonth') {
        const calYear = getCalendarYear(selectedYear);
        const calMonth = selectedMonth;
        const days = getDaysForMonth(calYear, calMonth, now);
        let monthLabel = `${MONTH_NAMES[calMonth]} ${calYear}`;

        // Append month tag to header if it exists
        const parentDotId = String(getMonthIndexFromCalendar(calYear, calMonth));
        const parentTag = meta[parentDotId]?.tag;
        if (parentTag) monthLabel += ` · ${parentTag}`;
        const visibleDays = days.filter(d => d.status !== 'before-birth');

        return (
            <div className="flex flex-col items-center gap-6" style={{ position: 'relative' }}>
                <div className="text-center">
                    <h2
                        className="text-2xl font-semibold tracking-tight"
                        style={{ color: 'var(--fg)' }}
                    >
                        {monthLabel}
                    </h2>
                    <p
                        className="text-sm mt-1 font-light"
                        style={{ color: 'var(--fg-muted)' }}
                    >
                        {visibleDays.length} days · Right-click a dot to color or tag
                    </p>
                </div>

                <motion.div
                    className="grid grid-cols-7 gap-x-3 gap-y-6 sm:gap-x-4 sm:gap-y-6 max-w-sm mx-auto"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <AnimatePresence>
                        {days.map((d) => {
                            const dotId = `day_${calYear}_${calMonth}_${d.day}`;
                            const dotMeta = meta[dotId] ?? {};
                            const label = dotMeta.tag ? `${d.label} · ${dotMeta.tag}` : d.label;

                            return (
                                <div
                                    key={d.day}
                                    className="flex flex-col items-center gap-1.5 relative"
                                >
                                    <Dot
                                        status={d.status}
                                        label={label}
                                        onClick={d.clickable ? () => onDayClick(d.day) : undefined}
                                        onContextMenu={d.status !== 'before-birth' ? handleContextMenu : undefined}
                                        index={dotId}
                                        size="md"
                                        heartbeat={heartbeat}
                                        color={dotMeta.color ?? null}
                                        defaultColor={defaultColor}
                                    />
                                    <span
                                        className="text-[9px] font-medium"
                                        style={{
                                            color: 'var(--fg-muted)',
                                            visibility: d.status === 'before-birth' ? 'hidden' : 'visible',
                                        }}
                                    >
                                        {d.day}
                                    </span>
                                    <TagBadge tag={dotMeta.tag} />
                                </div>
                            );
                        })}
                    </AnimatePresence>
                </motion.div>
                {renderContextMenu()}
            </div>
        );
    }

    // ─── Single Year View (12 dots, Jan-Dec) ───
    if (viewMode === 'singleYear') {
        const months = getMonthsForYear(selectedYear, now);
        let yearLabel = getYearLabel(selectedYear);
        const ageLabel = getAgeLabel(selectedYear);
        const calYear = getCalendarYear(selectedYear);

        // Append year tag to header if it exists
        const parentDotId = `year_${selectedYear}`;
        const parentTag = meta[parentDotId]?.tag;
        if (parentTag) yearLabel += ` · ${parentTag}`;

        return (
            <div className="flex flex-col items-center gap-6" style={{ position: 'relative' }}>
                <div className="text-center">
                    <h2
                        className="text-2xl font-semibold tracking-tight"
                        style={{ color: 'var(--fg)' }}
                    >
                        {yearLabel}
                    </h2>
                    <p
                        className="text-sm mt-1 font-light"
                        style={{ color: 'var(--fg-muted)' }}
                    >
                        {ageLabel} · Right-click a dot to color or tag
                    </p>
                </div>

                <motion.div
                    className="grid grid-cols-4 sm:grid-cols-6 gap-x-4 gap-y-7 sm:gap-x-5 sm:gap-y-8"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <AnimatePresence>
                        {months.map((m) => {
                            // Using stringified monthIndex for backward compatibility with what the user just set!
                            const dotId = String(getMonthIndexFromCalendar(calYear, m.calMonth));
                            const dotMeta = meta[dotId] ?? {};
                            const label = dotMeta.tag ? `${m.label} · ${dotMeta.tag}` : m.label;

                            return (
                                <div
                                    key={m.calMonth}
                                    className="flex flex-col items-center gap-2 relative"
                                >
                                    <Dot
                                        status={m.status}
                                        label={label}
                                        onClick={m.clickable ? () => onMonthClick(m.calMonth) : undefined}
                                        onContextMenu={m.status !== 'before-birth' ? handleContextMenu : undefined}
                                        index={dotId}
                                        size="lg"
                                        heartbeat={heartbeat}
                                        color={dotMeta.color ?? null}
                                        defaultColor={defaultColor}
                                    />
                                    <span
                                        className="text-[10px] font-medium tracking-wide uppercase"
                                        style={{
                                            color: 'var(--fg-muted)',
                                            visibility: m.status === 'before-birth' ? 'hidden' : 'visible',
                                        }}
                                    >
                                        {MONTH_NAMES[m.calMonth]}
                                    </span>
                                    <TagBadge tag={dotMeta.tag} />
                                </div>
                            );
                        })}
                    </AnimatePresence>
                </motion.div>
                {renderContextMenu()}
            </div>
        );
    }

    // ─── Years View (80 dots) ───
    if (viewMode === 'years') {
        return (
            <div className="flex flex-col items-center gap-6" style={{ position: 'relative' }}>
                <div className="text-center">
                    <p
                        className="text-sm font-light"
                        style={{ color: 'var(--fg-muted)' }}
                    >
                        {stats.totalYears} years · Right-click a dot to color or tag
                    </p>
                </div>

                <motion.div
                    className="grid grid-cols-8 sm:grid-cols-10 gap-x-3 gap-y-6 sm:gap-x-4 sm:gap-y-6 max-w-md mx-auto"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <AnimatePresence>
                        {Array.from({ length: LIFESPAN_YEARS }, (_, i) => {
                            const dotId = `year_${i}`;
                            const dotMeta = meta[dotId] ?? {};
                            const rawLabel = `${getYearLabel(i)} · ${getAgeLabel(i)}`;
                            const label = dotMeta.tag ? `${rawLabel} · ${dotMeta.tag}` : rawLabel;

                            return (
                                <div key={dotId} className="flex flex-col items-center gap-1.5 relative">
                                    <Dot
                                        status={getYearStatus(i, now)}
                                        label={label}
                                        onClick={() => onYearClick(i)}
                                        onContextMenu={handleContextMenu}
                                        index={dotId}
                                        size="md"
                                        heartbeat={heartbeat}
                                        color={dotMeta.color ?? null}
                                        defaultColor={defaultColor}
                                    />
                                    <TagBadge tag={dotMeta.tag} />
                                </div>
                            );
                        })}
                    </AnimatePresence>
                </motion.div>
                {renderContextMenu()}
            </div>
        );
    }

    // ─── Default: Months View (960+ dots) ───
    return (
        <div className="flex flex-col items-center gap-6" style={{ position: 'relative' }}>
            <div className="text-center">
                <p
                    className="text-sm font-light"
                    style={{ color: 'var(--fg-muted)' }}
                >
                    {stats.totalMonths} months · {stats.percentLived}% lived · Right-click a dot to color or tag
                </p>
            </div>

            <motion.div
                className="gap-[3px] sm:gap-[4px] md:gap-[5px] mx-auto"
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(24, minmax(0, 1fr))',
                    maxWidth: '720px',
                    width: '100%',
                    padding: '0 12px',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <AnimatePresence>
                    {Array.from({ length: TOTAL_MONTHS }, (_, i) => {
                        // Using stringified monthIndex for backward compatibility!
                        const dotId = String(i);
                        const dotMeta = meta[dotId] ?? {};
                        const label = dotMeta.tag ? `${getMonthLabel(i)} · ${dotMeta.tag}` : getMonthLabel(i);

                        return (
                            <Dot
                                key={`month-${i}`}
                                status={getMonthStatus(i, now)}
                                label={label}
                                onClick={() => onMonthGridClick(i)}
                                onContextMenu={handleContextMenu}
                                index={dotId}
                                size="sm"
                                heartbeat={heartbeat}
                                color={dotMeta.color ?? null}
                                defaultColor={defaultColor}
                            />
                        );
                        // Deliberately NOT adding TagBadge here to keep the intense grid clean!
                    })}
                </AnimatePresence>
            </motion.div>
            {renderContextMenu()}
        </div>
    );
}
