import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import DotGrid from './components/DotGrid';
import ThemeToggle from './components/ThemeToggle';
import ViewSelector from './components/ViewSelector';
import ExportButton from './components/ExportButton';
import Settings from './components/Settings';
import AuthButton from './components/AuthButton';
import { getLifeStats, getCalendarDate, getBirthDate } from './utils/dateEngine';
import { getAllDotMeta, setDotMeta } from './utils/dotMeta';

const VIEW_TRANSITION = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, y: -20, scale: 0.98, transition: { duration: 0.25 } },
};

export default function App() {
  const [viewMode, setViewMode] = useState('months');
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null); // now stores calendar month (0-11)
  const [selectedDay, setSelectedDay] = useState(null);
  const [navStack, setNavStack] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [heartbeat, setHeartbeat] = useState(() => {
    return localStorage.getItem('lifedots-heartbeat') !== 'off';
  });
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('lifedots-theme') || 'light';
  });
  const [defaultColor, setDefaultColor] = useState(() => {
    return localStorage.getItem('lifedots-default-color') || 'theme';
  });

  const gridRef = useRef(null);
  const stats = getLifeStats();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('lifedots-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  };

  const handleSaveDefaultColor = (newColor) => {
    if (newColor === defaultColor) return;

    const allMeta = getAllDotMeta();
    const oldColor = defaultColor === 'theme' ? null : defaultColor;

    for (const [dotId, meta] of Object.entries(allMeta)) {
      if (meta.color === newColor) {
        setDotMeta(dotId, { color: oldColor, tag: meta.tag });
      }
    }

    localStorage.setItem('lifedots-default-color', newColor);
    setDefaultColor(newColor);
    setRefreshKey((k) => k + 1);
  };

  const pushView = (mode) => {
    setNavStack((prev) => [...prev, viewMode]);
    setViewMode(mode);
  };

  const handleYearClick = (yearIndex) => {
    setSelectedYear(yearIndex);
    pushView('singleYear');
  };

  // monthInYear is now a calendar month (0=Jan, 11=Dec)
  const handleMonthClick = (calMonth) => {
    setSelectedMonth(calMonth);
    pushView('singleMonth');
  };

  const handleMonthGridClick = (monthIndex) => {
    const { year: calYear, month: calMonth } = getCalendarDate(monthIndex);
    const yearIndex = calYear - getBirthDate().getFullYear();
    setSelectedYear(yearIndex);
    setSelectedMonth(calMonth);
    pushView('singleMonth');
  };

  const handleDayClick = (day) => {
    setSelectedDay(day);
    pushView('singleDay');
  };

  const handleBack = () => {
    const prev = navStack[navStack.length - 1];
    setNavStack((s) => s.slice(0, -1));

    if (viewMode === 'singleDay') {
      setSelectedDay(null);
    } else if (viewMode === 'singleMonth') {
      setSelectedMonth(null);
      if (prev === 'months') {
        setSelectedYear(null);
      }
    } else if (viewMode === 'singleYear') {
      setSelectedYear(null);
      setSelectedMonth(null);
      setSelectedDay(null);
    }

    setViewMode(prev || 'months');
  };

  const handleViewChange = (mode) => {
    setViewMode(mode);
    setNavStack([]);
    setSelectedYear(null);
    setSelectedMonth(null);
    setSelectedDay(null);
  };

  const handleBirthDateChange = () => {
    // Reset to top-level view and force re-render
    setViewMode('months');
    setNavStack([]);
    setSelectedYear(null);
    setSelectedMonth(null);
    setSelectedDay(null);
    setRefreshKey((k) => k + 1);
  };

  const footerLabel = {
    months: 'Each dot is a month of your life',
    years: 'Each dot is a year of your life',
    singleYear: 'Each dot is a month — click to see days',
    singleMonth: 'Each dot is a day — click to see hours',
    singleDay: 'Each dot is an hour of your day',
  }[viewMode];

  return (
    <div className="min-h-screen flex flex-col items-center px-4 relative" style={{ paddingTop: '80px', paddingBottom: '48px' }}>

      {/* Auth Button — top left */}
      <AuthButton />

      {/* Settings button — top right */}
      <button
        onClick={() => setSettingsOpen(true)}
        className="fixed top-5 right-5 z-40 rounded-full transition-colors duration-200"
        style={{
          padding: '8px',
          backgroundColor: 'var(--control-bg)',
          border: '1px solid var(--control-border)',
          color: 'var(--fg-muted)',
        }}
        aria-label="Settings"
        data-html2canvas-ignore="true"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>

      {/* Settings Modal */}
      <Settings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onBirthDateChange={handleBirthDateChange}
        heartbeat={heartbeat}
        onHeartbeatChange={(val) => {
          setHeartbeat(val);
          localStorage.setItem('lifedots-heartbeat', val ? 'on' : 'off');
        }}
        defaultColor={defaultColor}
        onSaveDefaultColor={handleSaveDefaultColor}
      />

      {/* Header */}
      <header className="w-full max-w-4xl mx-auto text-center" style={{ marginBottom: '28px' }}>
        <h1
          className="text-lg sm:text-xl font-semibold tracking-tight"
          style={{ color: 'var(--fg)' }}
        >
          life in dots
        </h1>
        <p
          className="text-xs sm:text-sm mt-2 font-light"
          style={{ color: 'var(--fg-muted)' }}
        >
          {stats.ageYears} years, {stats.ageMonths} months old · {stats.percentLived}% lived
        </p>
      </header>

      {/* Controls */}
      <div
        className="flex items-center gap-3"
        style={{ marginBottom: '24px' }}
        data-html2canvas-ignore="true"
      >
        <ViewSelector
          viewMode={viewMode}
          onChange={handleViewChange}
          onBack={handleBack}
        />
        <div
          className="w-px h-5"
          style={{ backgroundColor: 'var(--control-border)' }}
        />
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
        <ExportButton targetRef={gridRef} />
      </div>

      {/* Grid Area */}
      <main ref={gridRef} className="w-full max-w-4xl mx-auto" key={refreshKey}>
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode + (selectedYear ?? '') + (selectedMonth ?? '') + (selectedDay ?? '')}
            {...VIEW_TRANSITION}
          >
            <DotGrid
              viewMode={viewMode}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              selectedDay={selectedDay}
              onYearClick={handleYearClick}
              onMonthClick={handleMonthClick}
              onMonthGridClick={handleMonthGridClick}
              onDayClick={handleDayClick}
              heartbeat={heartbeat}
              defaultColor={defaultColor}
            />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer style={{ marginTop: '60px' }}>
        <p
          className="text-[10px] font-light tracking-wider uppercase"
          style={{ color: 'var(--fg-muted)' }}
        >
          {footerLabel}
        </p>
      </footer>
    </div>
  );
}
