import { useMemo } from 'react';
import { getCalendarYear, MONTH_NAMES_FULL } from '../utils/dateEngine';

/**
 * Derives a contextKey and displayTitle for the journal
 * based on the current view state.
 */
export default function useJournalContext(viewMode, selectedYear, selectedMonth, selectedDay) {
    return useMemo(() => {
        // Default: life-level journal
        if (viewMode === 'months' || viewMode === 'years' || selectedYear == null) {
            return { contextKey: 'life', displayTitle: 'Life Journal' };
        }

        const calYear = getCalendarYear(selectedYear);

        // Single year view
        if (viewMode === 'singleYear' || selectedMonth == null) {
            return {
                contextKey: `year-${selectedYear}`,
                displayTitle: `Journal for Year ${calYear}`,
            };
        }

        const monthName = MONTH_NAMES_FULL[selectedMonth];

        // Single month view
        if (viewMode === 'singleMonth' || selectedDay == null) {
            return {
                contextKey: `year-${selectedYear}-month-${selectedMonth}`,
                displayTitle: `Journal for ${monthName} ${calYear}`,
            };
        }

        // Single day view
        return {
            contextKey: `year-${selectedYear}-month-${selectedMonth}-day-${selectedDay}`,
            displayTitle: `Journal for ${monthName} ${selectedDay}, ${calYear}`,
        };
    }, [viewMode, selectedYear, selectedMonth, selectedDay]);
}
