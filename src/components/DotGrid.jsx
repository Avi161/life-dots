import { useState, useCallback, useRef } from 'react';
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
import Tooltip from './Tooltip';

const DOT_VARIANTS = {
    hidden: { opacity: 0, scale: 0.3 },
    visible: (i) => ({
        opacity: 1,
        scale: 1,
        transition: {
            delay: Math.min(i * 0.0005, 0.6),
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

function Dot({ status, label, onClick, index, size = 'sm', heartbeat = true }) {
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const dotRef = useRef(null);

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

    const baseStyle = `rounded-full transition-all duration-200 ${sizeClass(size)}`;

    let dotStyle;
    if (status === 'lived' || (status === 'current' && !heartbeat)) {
        dotStyle = 'cursor-pointer hover:scale-150';
    } else if (status === 'current') {
        dotStyle = 'dot-current cursor-pointer';
    } else {
        dotStyle = 'cursor-pointer hover:scale-125';
    }

    return (
        <>
            <motion.div
                ref={dotRef}
                custom={index}
                variants={DOT_VARIANTS}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={`${baseStyle} ${dotStyle}`}
                style={{
                    backgroundColor:
                        status === 'lived'
                            ? 'var(--dot-lived)'
                            : status === 'current'
                                ? 'var(--dot-current)'
                                : 'transparent',
                    border:
                        status === 'future'
                            ? '1.5px solid var(--dot-future-border)'
                            : status === 'current'
                                ? '1.5px solid var(--dot-current)'
                                : 'none',
                }}
                onClick={onClick}
                onMouseEnter={handleMouseEnter}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
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
}) {
    const now = new Date();
    const stats = getLifeStats(now);

    // ─── Hours View (24 dots) ───
    if (viewMode === 'singleDay') {
        const calYear = getCalendarYear(selectedYear);
        const calMonth = selectedMonth; // calendar month 0-11
        const hours = getHoursForDay(calYear, calMonth, selectedDay, now);
        const dayLabel = getDayLabel(calYear, calMonth, selectedDay);

        return (
            <div className="flex flex-col items-center gap-6">
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
                        24 hours
                    </p>
                </div>

                <motion.div
                    className="grid grid-cols-6 gap-3 sm:gap-4 max-w-md mx-auto"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <AnimatePresence>
                        {hours.map((h) => (
                            <div
                                key={h.hour}
                                className="flex flex-col items-center gap-1.5"
                            >
                                <Dot
                                    status={h.status}
                                    label={h.label}
                                    index={h.hour}
                                    size="lg"
                                    heartbeat={heartbeat}
                                />
                                <span
                                    className="text-[9px] font-medium"
                                    style={{ color: 'var(--fg-muted)' }}
                                >
                                    {h.label}
                                </span>
                            </div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            </div>
        );
    }

    // ─── Days View (28-31 dots) ───
    if (viewMode === 'singleMonth') {
        const calYear = getCalendarYear(selectedYear);
        const calMonth = selectedMonth; // calendar month 0-11
        const days = getDaysForMonth(calYear, calMonth, now);
        const monthLabel = `${MONTH_NAMES[calMonth]} ${calYear}`;
        const visibleDays = days.filter(d => d.status !== 'before-birth');

        return (
            <div className="flex flex-col items-center gap-6">
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
                        {visibleDays.length} days · Click a dot to see hours
                    </p>
                </div>

                <motion.div
                    className="grid grid-cols-7 gap-3 sm:gap-4 max-w-sm mx-auto"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <AnimatePresence>
                        {days.map((d) => (
                            <div
                                key={d.day}
                                className="flex flex-col items-center gap-1.5"
                            >
                                <Dot
                                    status={d.status}
                                    label={d.label}
                                    onClick={d.clickable ? () => onDayClick(d.day) : undefined}
                                    index={d.day}
                                    size="md"
                                    heartbeat={heartbeat}
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
                            </div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            </div>
        );
    }

    // ─── Single Year View (12 dots, Jan-Dec) ───
    if (viewMode === 'singleYear') {
        const months = getMonthsForYear(selectedYear, now);
        const yearLabel = getYearLabel(selectedYear);
        const ageLabel = getAgeLabel(selectedYear);

        return (
            <div className="flex flex-col items-center gap-6">
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
                        {ageLabel} · Click a month to see days
                    </p>
                </div>

                <motion.div
                    className="grid grid-cols-4 sm:grid-cols-6 gap-4 sm:gap-5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <AnimatePresence>
                        {months.map((m) => (
                            <div
                                key={m.calMonth}
                                className="flex flex-col items-center gap-2"
                            >
                                <Dot
                                    status={m.status}
                                    label={m.label}
                                    onClick={m.clickable ? () => onMonthClick(m.calMonth) : undefined}
                                    index={m.calMonth}
                                    size="lg"
                                    heartbeat={heartbeat}
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
                            </div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            </div>
        );
    }

    // ─── Years View (80 dots) ───
    if (viewMode === 'years') {
        return (
            <div className="flex flex-col items-center gap-6">
                <div className="text-center">
                    <p
                        className="text-sm font-light"
                        style={{ color: 'var(--fg-muted)' }}
                    >
                        {stats.totalYears} years · Click a dot to explore
                    </p>
                </div>

                <motion.div
                    className="grid grid-cols-8 sm:grid-cols-10 gap-3 sm:gap-4 max-w-md mx-auto"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <AnimatePresence>
                        {Array.from({ length: LIFESPAN_YEARS }, (_, i) => (
                            <Dot
                                key={`year-${i}`}
                                status={getYearStatus(i, now)}
                                label={`${getYearLabel(i)} · ${getAgeLabel(i)}`}
                                onClick={() => onYearClick(i)}
                                index={i}
                                size="md"
                                heartbeat={heartbeat}
                            />
                        ))}
                    </AnimatePresence>
                </motion.div>
            </div>
        );
    }

    // ─── Default: Months View (960 dots) ───
    return (
        <div className="flex flex-col items-center gap-6">
            <div className="text-center">
                <p
                    className="text-sm font-light"
                    style={{ color: 'var(--fg-muted)' }}
                >
                    {stats.totalMonths} months · {stats.percentLived}% lived
                </p>
            </div>

            <motion.div
                className="grid gap-[3px] sm:gap-[4px] md:gap-[5px] mx-auto"
                style={{
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
                    {Array.from({ length: TOTAL_MONTHS }, (_, i) => (
                        <Dot
                            key={`month-${i}`}
                            status={getMonthStatus(i, now)}
                            label={getMonthLabel(i)}
                            onClick={() => onMonthGridClick(i)}
                            index={i}
                            size="sm"
                            heartbeat={heartbeat}
                        />
                    ))}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
