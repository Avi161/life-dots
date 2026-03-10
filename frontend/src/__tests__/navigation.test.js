/**
 * Edge-case tests for year / month / day navigation logic.
 *
 * These are pure-logic tests that exercise the same boundary conditions
 * used by handleNavigateYear, handleNavigateMonth, and handleNavigateDay
 * in App.jsx.  They run in Node with no DOM or React required.
 *
 * Run: node src/__tests__/navigation.test.js
 */

const LIFESPAN_YEARS = 80;

// ─── Year navigation ───────────────────────────────────────────────
function navigateYear(currentYear, direction) {
    const next = currentYear + direction;
    if (next < 0) return 0;
    if (next >= LIFESPAN_YEARS) return LIFESPAN_YEARS - 1;
    return next;
}

// ─── Month navigation ──────────────────────────────────────────────
function navigateMonth(currentYear, currentMonth, direction) {
    let newMonth = currentMonth + direction;
    let newYear = currentYear;

    if (newMonth < 0) {
        newMonth = 11;
        newYear -= 1;
    } else if (newMonth > 11) {
        newMonth = 0;
        newYear += 1;
    }

    // Clamp to valid range
    if (newYear < 0) {
        newYear = 0;
        newMonth = 0;
    } else if (newYear >= LIFESPAN_YEARS) {
        newYear = LIFESPAN_YEARS - 1;
        newMonth = 11;
    }

    return { year: newYear, month: newMonth };
}

// ─── Day navigation ────────────────────────────────────────────────
// birthDate is a JS Date; selectedYear is a yearIndex
function navigateDay(birthDate, selectedYear, selectedMonth, selectedDay, direction) {
    const calYear = birthDate.getFullYear() + selectedYear;
    const d = new Date(calYear, selectedMonth, selectedDay + direction);

    if (d < birthDate) return null; // blocked

    const newYearIndex = d.getFullYear() - birthDate.getFullYear();
    if (newYearIndex >= LIFESPAN_YEARS) return null; // blocked

    return { year: newYearIndex, month: d.getMonth(), day: d.getDate() };
}

// ─── Simple test harness ───────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(condition, label) {
    if (condition) {
        passed++;
        console.log(`  ✅ ${label}`);
    } else {
        failed++;
        console.error(`  ❌ ${label}`);
    }
}

function assertDeepEqual(actual, expected, label) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (ok) {
        passed++;
        console.log(`  ✅ ${label}`);
    } else {
        failed++;
        console.error(`  ❌ ${label}  — got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    }
}

// ════════════════════════════════════════════════════════════════════
// Year tests
// ════════════════════════════════════════════════════════════════════
console.log('\n── Year navigation ──');

assert(navigateYear(20, 1) === 21, 'Normal right: 20 → 21');
assert(navigateYear(20, -1) === 19, 'Normal left: 20 → 19');
assert(navigateYear(0, -1) === 0, 'Left at boundary: 0 stays 0');
assert(navigateYear(79, 1) === 79, 'Right at max: 79 stays 79');
assert(navigateYear(0, 1) === 1, 'Right from 0: 0 → 1');
assert(navigateYear(79, -1) === 78, 'Left from max: 79 → 78');

// ════════════════════════════════════════════════════════════════════
// Month tests
// ════════════════════════════════════════════════════════════════════
console.log('\n── Month navigation ──');

assertDeepEqual(navigateMonth(2, 3, 1), { year: 2, month: 4 }, 'Normal right: Mar→Apr same year');
assertDeepEqual(navigateMonth(2, 3, -1), { year: 2, month: 2 }, 'Normal left: Mar→Feb same year');
assertDeepEqual(navigateMonth(2, 11, 1), { year: 3, month: 0 }, 'Right wraps Dec→Jan next year');
assertDeepEqual(navigateMonth(3, 0, -1), { year: 2, month: 11 }, 'Left wraps Jan→Dec prev year');
assertDeepEqual(navigateMonth(0, 0, -1), { year: 0, month: 0 }, 'Left at absolute start: stays Jan yr0');
assertDeepEqual(navigateMonth(79, 11, 1), { year: 79, month: 11 }, 'Right at absolute end: stays Dec yr79');
assertDeepEqual(navigateMonth(0, 11, 1), { year: 1, month: 0 }, 'Dec yr0 right goes Jan yr1');
assertDeepEqual(navigateMonth(1, 0, -1), { year: 0, month: 11 }, 'Jan yr1 left goes Dec yr0');

// ════════════════════════════════════════════════════════════════════
// Day tests
// ════════════════════════════════════════════════════════════════════
console.log('\n── Day navigation ──');

const birth = new Date(2005, 8, 4); // Sep 4 2005

// Normal
assertDeepEqual(
    navigateDay(birth, 21, 2, 15, 1), // Mar 15 2026 → Mar 16 2026
    { year: 21, month: 2, day: 16 },
    'Normal right: Mar 15→16'
);
assertDeepEqual(
    navigateDay(birth, 21, 2, 15, -1), // Mar 15 2026 → Mar 14 2026
    { year: 21, month: 2, day: 14 },
    'Normal left: Mar 15→14'
);

// Cross month boundary
assertDeepEqual(
    navigateDay(birth, 21, 2, 31, 1), // Mar 31 2026 → Apr 1 2026
    { year: 21, month: 3, day: 1 },
    'Right crosses month: Mar 31→Apr 1'
);
assertDeepEqual(
    navigateDay(birth, 21, 3, 1, -1), // Apr 1 2026 → Mar 31 2026
    { year: 21, month: 2, day: 31 },
    'Left crosses month: Apr 1→Mar 31'
);

// Cross year boundary
assertDeepEqual(
    navigateDay(birth, 20, 11, 31, 1), // Dec 31 2025 → Jan 1 2026
    { year: 21, month: 0, day: 1 },
    'Right crosses year: Dec 31→Jan 1'
);
assertDeepEqual(
    navigateDay(birth, 21, 0, 1, -1), // Jan 1 2026 → Dec 31 2025
    { year: 20, month: 11, day: 31 },
    'Left crosses year: Jan 1→Dec 31'
);

// Cannot navigate before birth
assert(
    navigateDay(birth, 0, 8, 4, -1) === null,
    'Left blocked at birth date (Sep 4 2005)'
);

// Cannot navigate past lifespan
const lastYear = LIFESPAN_YEARS - 1; // 79 → calendar year 2084
assert(
    navigateDay(birth, lastYear, 11, 31, 1) === null,
    'Right blocked past lifespan end'
);

// Feb edge: leap year → 29 days
assertDeepEqual(
    navigateDay(birth, 19, 1, 28, 1), // Feb 28 2024 → Feb 29 2024 (leap year)
    { year: 19, month: 1, day: 29 },
    'Feb 28→29 in leap year 2024'
);
assertDeepEqual(
    navigateDay(birth, 21, 1, 28, 1), // Feb 28 2026 → Mar 1 2026 (non-leap)
    { year: 21, month: 2, day: 1 },
    'Feb 28→Mar 1 in non-leap year 2026'
);

// ════════════════════════════════════════════════════════════════════
// Summary
// ════════════════════════════════════════════════════════════════════
console.log(`\n─────────────────────`);
console.log(`Total: ${passed + failed}  |  ✅ ${passed}  |  ❌ ${failed}`);
if (failed > 0) process.exit(1);
