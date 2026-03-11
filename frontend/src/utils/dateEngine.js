// ─── Configurable Birth Date & Lifespan ───
// Defaults shown until Supabase data loads after login
let BIRTH_DATE = new Date(2005, 8, 4); // September 4, 2005
let LIFESPAN_YEARS = 80;

function getTotalMonths() {
    return LIFESPAN_YEARS * 12;
}

let TOTAL_MONTHS = getTotalMonths();

/**
 * Update the birth date (called from Settings).
 */
export function setBirthDate(year, month, day) {
    BIRTH_DATE = new Date(year, month, day);
    TOTAL_MONTHS = getTotalMonths();
}

/**
 * Update the expected lifespan.
 */
export function setLifespanYears(years) {
    LIFESPAN_YEARS = years;
    TOTAL_MONTHS = getTotalMonths();
}

/**
 * Hydrate birth date and lifespan from remote settings (Supabase).
 */
export function hydrateFromRemote({ birth_date, expected_lifespan }) {
    if (birth_date) {
        const d = new Date(birth_date + 'T00:00:00');
        if (!isNaN(d.getTime())) {
            BIRTH_DATE = d;
            TOTAL_MONTHS = getTotalMonths();
        }
    }
    if (expected_lifespan != null) {
        const val = Number(expected_lifespan);
        if (!isNaN(val) && val > 0 && val <= 150) {
            LIFESPAN_YEARS = val;
            TOTAL_MONTHS = getTotalMonths();
        }
    }
}

/**
 * Return birth date and lifespan as an object suitable for the API.
 */
export function getSettingsForRemote() {
    const y = BIRTH_DATE.getFullYear();
    const m = String(BIRTH_DATE.getMonth() + 1).padStart(2, '0');
    const d = String(BIRTH_DATE.getDate()).padStart(2, '0');
    return {
        birth_date: `${y}-${m}-${d}`,
        expected_lifespan: LIFESPAN_YEARS,
    };
}

export function getLifespanYears() {
    return LIFESPAN_YEARS;
}

/**
 * Get the current birth date.
 */
export function getBirthDate() {
    return BIRTH_DATE;
}

const MONTH_NAMES = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const MONTH_NAMES_FULL = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Get the 0-based month index for a given (yearIndex, monthInYear) pair.
 * yearIndex is relative to birth (0 = birth year), monthInYear is 0-11
 * within that relative year offset.
 */
export function toMonthIndex(yearIndex, monthInYear) {
    return yearIndex * 12 + monthInYear;
}

/**
 * Get the year and month-of-year from a flat month index.
 */
export function fromMonthIndex(monthIndex) {
    const yearIndex = Math.floor(monthIndex / 12);
    const monthInYear = monthIndex % 12;
    return { yearIndex, monthInYear };
}

/**
 * Get the calendar date for a given month index (offset from birth).
 * Returns { year, month } where month is 0-indexed.
 */
export function getCalendarDate(monthIndex) {
    const birthYear = BIRTH_DATE.getFullYear();
    const birthMonth = BIRTH_DATE.getMonth();
    const totalMonth = birthMonth + monthIndex;
    const year = birthYear + Math.floor(totalMonth / 12);
    const month = totalMonth % 12;
    return { year, month };
}

/**
 * Get the actual calendar year and month for a yearIndex + monthInYear.
 */
export function getCalendarYearMonth(yearIndex, monthInYear) {
    const monthIndex = toMonthIndex(yearIndex, monthInYear);
    return getCalendarDate(monthIndex);
}

/**
 * Get the number of days in a specific calendar month.
 */
export function getDaysInMonth(calendarYear, calendarMonth) {
    return new Date(calendarYear, calendarMonth + 1, 0).getDate();
}

/**
 * Get a formatted label for a month index, e.g. "Jan 2006".
 */
export function getMonthLabel(monthIndex) {
    const { year, month } = getCalendarDate(monthIndex);
    return `${MONTH_NAMES[month]} ${year}`;
}

/**
 * Get the full month name, e.g. "September 2005".
 */
export function getMonthLabelFull(monthIndex) {
    const { year, month } = getCalendarDate(monthIndex);
    return `${MONTH_NAMES_FULL[month]} ${year}`;
}

/**
 * Get a year label for a year index, e.g. "2005".
 */
export function getYearLabel(yearIndex) {
    return `${BIRTH_DATE.getFullYear() + yearIndex}`;
}

/**
 * Get the calendar year for a given yearIndex.
 */
export function getCalendarYear(yearIndex) {
    return BIRTH_DATE.getFullYear() + yearIndex;
}

/**
 * Get the age label, e.g. "Age 20"
 */
export function getAgeLabel(yearIndex) {
    return `Age ${yearIndex}`;
}

/**
 * Get a day label, e.g. "Mar 8, 2026".
 */
export function getDayLabel(calendarYear, calendarMonth, day) {
    return `${MONTH_NAMES[calendarMonth]} ${day}, ${calendarYear}`;
}

/**
 * Get an hour label, e.g. "3:00 AM" or "11:00 PM".
 */
export function getHourLabel(hour) {
    if (hour === 0) return '12:00 AM';
    if (hour === 12) return '12:00 PM';
    if (hour < 12) return `${hour}:00 AM`;
    return `${hour - 12}:00 PM`;
}

/**
 * Calculate the current month index (0-based) from now.
 */
export function getCurrentMonthIndex(now = new Date()) {
    const birthYear = BIRTH_DATE.getFullYear();
    const birthMonth = BIRTH_DATE.getMonth();

    const months = (now.getFullYear() - birthYear) * 12 + (now.getMonth() - birthMonth);
    return Math.max(0, Math.min(months, TOTAL_MONTHS - 1));
}

/**
 * Calculate the current year index (0-based) from now.
 * This is now calendar-year based: yearIndex = calendarYear - birthYear.
 */
export function getCurrentYearIndex(now = new Date()) {
    return now.getFullYear() - BIRTH_DATE.getFullYear();
}

/**
 * Get the status of a given month index.
 */
export function getMonthStatus(monthIndex, now = new Date()) {
    const currentMonth = getCurrentMonthIndex(now);
    if (monthIndex < currentMonth) return 'lived';
    if (monthIndex === currentMonth) return 'current';
    return 'future';
}

/**
 * Get the status of a given year index.
 */
export function getYearStatus(yearIndex, now = new Date()) {
    const currentYear = getCurrentYearIndex(now);
    if (yearIndex < currentYear) return 'lived';
    if (yearIndex === currentYear) return 'current';
    return 'future';
}

/**
 * Get status for a specific day within a calendar month.
 * day is 1-indexed.
 */
export function getDayStatus(calendarYear, calendarMonth, day, now = new Date()) {
    const dayDate = new Date(calendarYear, calendarMonth, day);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Before birth
    if (dayDate < BIRTH_DATE) return 'before-birth';

    if (dayDate < todayStart) return 'lived';
    if (dayDate.getTime() === todayStart.getTime()) return 'current';
    return 'future';
}

/**
 * Get status for a specific hour within the current day.
 * hour is 0-23.
 */
export function getHourStatus(calendarYear, calendarMonth, day, hour, now = new Date()) {
    const hourDate = new Date(calendarYear, calendarMonth, day, hour);
    const currentHourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());

    if (hourDate < currentHourStart) return 'lived';
    if (hourDate.getTime() === currentHourStart.getTime()) return 'current';
    return 'future';
}

/**
 * Get an array of 12 month objects for a specific year index.
 * Each year shows Jan-Dec of the corresponding CALENDAR year.
 * For the birth year, months before the birth month get status 'before-birth'.
 * For the last year, months after the end are also marked.
 */
export function getMonthsForYear(yearIndex, now = new Date()) {
    const calendarYear = getCalendarYear(yearIndex);
    const birthYear = BIRTH_DATE.getFullYear();
    const birthMonth = BIRTH_DATE.getMonth();
    const endYear = birthYear + LIFESPAN_YEARS;

    return Array.from({ length: 12 }, (_, calMonth) => {
        // Determine status
        const monthDate = new Date(calendarYear, calMonth, 1);
        const label = `${MONTH_NAMES[calMonth]} ${calendarYear}`;

        // Before birth
        if (calendarYear === birthYear && calMonth < birthMonth) {
            return {
                calMonth,
                status: 'before-birth',
                label,
                clickable: false,
            };
        }

        // After lifespan end
        if (calendarYear >= endYear) {
            return {
                calMonth,
                status: 'future',
                label,
                clickable: false,
            };
        }

        // Calculate the month index relative to birth for status
        const monthsSinceBirth = (calendarYear - birthYear) * 12 + calMonth - birthMonth;
        const status = getMonthStatus(monthsSinceBirth, now);

        return {
            calMonth,
            status,
            label,
            clickable: true,
        };
    });
}

/**
 * Get an array of day objects for a specific calendar month.
 */
export function getDaysForMonth(calendarYear, calendarMonth, now = new Date()) {
    const count = getDaysInMonth(calendarYear, calendarMonth);
    return Array.from({ length: count }, (_, i) => {
        const day = i + 1;
        const status = getDayStatus(calendarYear, calendarMonth, day, now);
        return {
            day,
            status,
            label: getDayLabel(calendarYear, calendarMonth, day),
            clickable: status !== 'before-birth',
        };
    });
}

/**
 * Get an array of 24 hour objects for a specific day.
 */
export function getHoursForDay(calendarYear, calendarMonth, day, now = new Date()) {
    return Array.from({ length: 24 }, (_, hour) => {
        return {
            hour,
            status: getHourStatus(calendarYear, calendarMonth, day, hour, now),
            label: getHourLabel(hour),
        };
    });
}

/**
 * Get summary stats.
 */
export function getLifeStats(now = new Date()) {
    const currentMonthIdx = getCurrentMonthIndex(now);
    const lived = currentMonthIdx + 1;
    const remaining = TOTAL_MONTHS - lived;
    const percentLived = ((lived / TOTAL_MONTHS) * 100).toFixed(1);

    const ageYears = Math.floor(currentMonthIdx / 12);
    const ageMonths = currentMonthIdx % 12;

    return {
        totalMonths: TOTAL_MONTHS,
        totalYears: LIFESPAN_YEARS,
        monthsLived: lived,
        monthsRemaining: remaining,
        percentLived,
        ageYears,
        ageMonths,
        birthDate: BIRTH_DATE,
    };
}

/**
 * Parse a context key into a JavaScript Date object for chronological sorting.
 */
export function parseContextKeyToDate(contextKey) {
    if (contextKey === 'life') return BIRTH_DATE;

    const parts = contextKey.split('-');
    const yearIndex = parts.indexOf('year') !== -1 ? parseInt(parts[parts.indexOf('year') + 1], 10) : null;
    const monthIndex = parts.indexOf('month') !== -1 ? parseInt(parts[parts.indexOf('month') + 1], 10) : null;
    const day = parts.indexOf('day') !== -1 ? parseInt(parts[parts.indexOf('day') + 1], 10) : null;

    if (yearIndex === null) return BIRTH_DATE; // Fallback

    const calYear = getCalendarYear(yearIndex);

    if (monthIndex === null) {
        return new Date(calYear, 0, 1);
    }
    
    if (day === null) {
        return new Date(calYear, monthIndex, 1);
    }

    return new Date(calYear, monthIndex, day);
}

/**
 * Format a context key into a highly readable string.
 */
export function formatContextKey(contextKey) {
    if (contextKey === 'life') return 'Entire Life';

    const parts = contextKey.split('-');
    const yearIndex = parts.indexOf('year') !== -1 ? parseInt(parts[parts.indexOf('year') + 1], 10) : null;
    const monthIndex = parts.indexOf('month') !== -1 ? parseInt(parts[parts.indexOf('month') + 1], 10) : null;
    const day = parts.indexOf('day') !== -1 ? parseInt(parts[parts.indexOf('day') + 1], 10) : null;

    if (yearIndex === null) return 'Unknown Date';

    const calYear = getCalendarYear(yearIndex);

    if (monthIndex === null) {
        return `Year ${calYear}`;
    }

    const monthName = MONTH_NAMES_FULL[monthIndex];

    if (day === null) {
        return `${monthName} ${calYear}`;
    }

    return `${monthName} ${day}, ${calYear}`;
}

export { BIRTH_DATE, LIFESPAN_YEARS, TOTAL_MONTHS, MONTH_NAMES, MONTH_NAMES_FULL };
