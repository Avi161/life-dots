import { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import DotGrid from './components/DotGrid';
import ThemeToggle from './components/ThemeToggle';
import ViewSelector from './components/ViewSelector';
import ExportButton from './components/ExportButton';
import JournalButton from './components/JournalButton';
import JournalOverlay from './components/JournalOverlay';
import TodoButton from './components/TodoButton';
import TodoOverlay from './components/TodoOverlay';
import Settings from './components/Settings';
import UserProfile from './components/UserProfile';
import useJournalContext from './hooks/useJournalContext';
import { fetchSettings, saveSettings, isAuthenticated, setAuthToken, getGoogleAuthUrl, getCurrentUser, fetchAllTodos } from './utils/api';
import { getLifeStats, getCalendarDate, getBirthDate, hydrateFromRemote, formatContextKey } from './utils/dateEngine';
import { getAllDotMeta, setDotMeta, hydrateMetaFromRemote } from './utils/dotMeta';
import AllJournalsModal from './components/AllJournalsModal';
import AllTodosModal from './components/AllTodosModal';
import { ListTodo, BookOpen, CalendarHeart } from 'lucide-react';

const viewVariants = {
  initial: (navDir) => {
    if (navDir === 'left') return { opacity: 0, x: -60, scale: 0.98 };
    if (navDir === 'right') return { opacity: 0, x: 60, scale: 0.98 };
    return { opacity: 0, y: 20, scale: 0.98 };
  },
  animate: { opacity: 1, x: 0, y: 0, scale: 1, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: (navDir) => {
    if (navDir === 'left') return { opacity: 0, x: 60, scale: 0.98, transition: { duration: 0.2 } };
    if (navDir === 'right') return { opacity: 0, x: -60, scale: 0.98, transition: { duration: 0.2 } };
    return { opacity: 0, y: -20, scale: 0.98, transition: { duration: 0.25 } };
  },
};

export default function App() {
  const [viewMode, setViewMode] = useState('years');
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null); // now stores calendar month (0-11)
  const [selectedDay, setSelectedDay] = useState(null);
  const [navStack, setNavStack] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [todoOpen, setTodoOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const navDirectionRef = useRef(null);
  const [heartbeat, setHeartbeat] = useState(true);
  const [theme, setTheme] = useState('light');
  const [defaultColor, setDefaultColor] = useState(() => {
    return localStorage.getItem('lifedots-default-color') || 'theme';
  });
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return !!localStorage.getItem('lifedots-auth-token');
  });
  const [user, setUser] = useState(null);
  const [journalFont, setJournalFont] = useState(() => {
    return localStorage.getItem('lifedots-journal-font') || 'Inter, sans-serif';
  });
  const [journalFontSize, setJournalFontSize] = useState(() => {
    return localStorage.getItem('lifedots-journal-font-size') || '14px';
  });
  const [isAllJournalsOpen, setIsAllJournalsOpen] = useState(false);
  const [isAllTodosOpen, setIsAllTodosOpen] = useState(false);
  const [pendingTodoContexts, setPendingTodoContexts] = useState([]);
  const [directJournalInfo, setDirectJournalInfo] = useState(null);

  const gridRef = useRef(null);
  const stats = getLifeStats();
  const { contextKey, displayTitle } = useJournalContext(viewMode, selectedYear, selectedMonth, selectedDay);

  const activeContextKey = directJournalInfo ? directJournalInfo.contextKey : contextKey;
  const activeDisplayTitle = directJournalInfo ? directJournalInfo.displayTitle : displayTitle;

  const hydrateRemoteSettings = useCallback(() => {
    return fetchSettings()
      .then((remote) => {
        if (!remote) return false;
        hydrateFromRemote(remote);
        if (remote.dot_meta) {
          hydrateMetaFromRemote(remote.dot_meta);
          if (remote.dot_meta['__defaultColor'] && remote.dot_meta['__defaultColor'].color) {
            const remoteColor = remote.dot_meta['__defaultColor'].color;
            setDefaultColor(remoteColor);
            localStorage.setItem('lifedots-default-color', remoteColor);
          }
        }
        if (remote.theme) setTheme(remote.theme);
        if (remote.heartbeat_enabled != null) setHeartbeat(remote.heartbeat_enabled);
        if (remote.journal_font) {
          setJournalFont(remote.journal_font);
          localStorage.setItem('lifedots-journal-font', remote.journal_font);
        }
        if (remote.journal_font_size) {
          setJournalFontSize(remote.journal_font_size);
          localStorage.setItem('lifedots-journal-font-size', remote.journal_font_size);
        }
        setRefreshKey((k) => k + 1);
        return remote.birth_date == null;
      })
      .catch((err) => {
        console.error('Failed to load remote settings:', err);
        return false;
      });
  }, []);

  const refreshPendingTodos = useCallback(async () => {
    if (!isAuthenticated()) return;
    try {
      const todos = await fetchAllTodos();
      const pendingKeys = todos.filter(t => !t.is_completed).map(t => t.context_key);
      setPendingTodoContexts([...new Set(pendingKeys)]);
    } catch (err) {
      console.error('Failed to fetch pending todos:', err);
    }
  }, []);

  const jumpToToday = useCallback(() => {
    const today = new Date();
    const birth = getBirthDate();
    if (!birth || today < birth) return;

    const yearIndex = today.getFullYear() - birth.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();

    if (yearIndex >= stats.totalYears) return;

    setSelectedYear(yearIndex);
    setSelectedMonth(month);
    setSelectedDay(day);
    setNavStack(['years', 'singleYear', 'singleMonth']);
    setViewMode('singleDay');
  }, [stats.totalYears]);

  const handleJumpToContext = useCallback((ctx) => {
    if (ctx === 'life') {
      setViewMode('years');
      setNavStack([]);
      setSelectedYear(null);
      setSelectedMonth(null);
      setSelectedDay(null);
      return;
    }

    const parts = ctx.split('-');
    if (parts[0] === 'year' && parts[1]) {
      const y = parseInt(parts[1], 10);
      setSelectedYear(y);
      if (parts[2] === 'month' && parts[3]) {
        const m = parseInt(parts[3], 10);
        setSelectedMonth(m);
        if (parts[4] === 'day' && parts[5]) {
          const d = parseInt(parts[5], 10);
          setSelectedDay(d);
          setViewMode('singleDay');
          setNavStack(['years', 'singleYear', 'singleMonth']);
        } else {
          setViewMode('singleMonth');
          setNavStack(['years', 'singleYear']);
          setSelectedDay(null);
        }
      } else {
        setViewMode('singleYear');
        setNavStack(['years']);
        setSelectedMonth(null);
        setSelectedDay(null);
      }
    }
  }, []);

  const handleOpenJournalFromAll = useCallback((key) => {
    setDirectJournalInfo({
      contextKey: key,
      displayTitle: formatContextKey(key),
      reopenAllJournals: true
    });
    setIsAllJournalsOpen(false);
    setJournalOpen(true);
  }, []);

  useEffect(() => {
    const basePath = import.meta.env.BASE_URL || '/';

    const hash = window.location.hash;
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get('access_token');

      if (accessToken) {
        localStorage.setItem('lifedots-auth-token', accessToken);
        setAuthToken(accessToken);
        setIsLoggedIn(true);

        window.history.replaceState({}, '', basePath);

        getCurrentUser()
          .then((u) => {
            setUser(u);
            return hydrateRemoteSettings();
          })
          .then((isNewUser) => {
            if (isNewUser) setSettingsOpen(true);
          })
          .catch((err) => {
            console.error('Auth init failed:', err);
            localStorage.removeItem('lifedots-auth-token');
            setAuthToken(null);
            setIsLoggedIn(false);
          });
        return;
      }
    }

    const token = localStorage.getItem('lifedots-auth-token');
    if (token) {
      setAuthToken(token);
      setIsLoggedIn(true);
      getCurrentUser()
        .then((u) => {
          setUser(u);
          return hydrateRemoteSettings();
        })
        .then((isNewUser) => {
          if (isNewUser) setSettingsOpen(true);
          refreshPendingTodos();
        })
        .catch((err) => {
          console.error('Failed to get user details:', err);
          localStorage.removeItem('lifedots-auth-token');
          setAuthToken(null);
          setIsLoggedIn(false);
        });
    }
  }, [hydrateRemoteSettings, refreshPendingTodos]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const syncThemeToRemote = useCallback((newTheme) => {
    if (isAuthenticated()) {
      saveSettings({ theme: newTheme }).catch((err) => console.error('Failed to sync theme:', err));
    }
  }, []);

  const toggleTheme = () => {
    setTheme((t) => {
      const next = t === 'light' ? 'dark' : 'light';
      syncThemeToRemote(next);
      return next;
    });
  };

  const handleLogin = useCallback(async () => {
    try {
      const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}auth/callback`;
      const { url } = await getGoogleAuthUrl(redirectTo);
      window.location.href = url;
    } catch (err) {
      console.error('Failed to start login:', err);
    }
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('lifedots-auth-token');
    localStorage.removeItem('lifedots-journal-entries');
    setAuthToken(null);
    setIsLoggedIn(false);

    // Force a complete client reload to wipe any in-memory app state and settings
    window.location.reload();
  }, []);

  const handleSaveDefaultColor = (newColor) => {
    if (newColor === defaultColor) return;

    const allMeta = getAllDotMeta();
    const oldColor = defaultColor === 'theme' ? null : defaultColor;

    for (const [dotId, meta] of Object.entries(allMeta)) {
      if (dotId === '__defaultColor') continue;
      if (meta.color === newColor) {
        setDotMeta(dotId, { color: oldColor, tag: meta.tag });
      }
    }

    setDotMeta('__defaultColor', { color: newColor, tag: null });

    localStorage.setItem('lifedots-default-color', newColor);
    setDefaultColor(newColor);
    setRefreshKey((k) => k + 1);
  };

  const handleSaveJournalFont = useCallback((font, size, skipDb = false) => {
    setJournalFont(font);
    setJournalFontSize(size);
    localStorage.setItem('lifedots-journal-font', font);
    localStorage.setItem('lifedots-journal-font-size', size);
    if (!skipDb && isAuthenticated()) {
      saveSettings({ journal_font: font, journal_font_size: size }).catch((err) =>
        console.error('Failed to sync journal font:', err)
      );
    }
  }, []);

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

    setViewMode(prev || 'years');
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
    setViewMode('years');
    setNavStack([]);
    setSelectedYear(null);
    setSelectedMonth(null);
    setSelectedDay(null);
    setRefreshKey((k) => k + 1);
  };

  const handleNavigateYear = useCallback((direction) => {
    navDirectionRef.current = direction > 0 ? 'right' : 'left';
    setSelectedYear((prev) => {
      if (prev === null) return prev;
      const next = prev + direction;
      if (next < 0) return 0;
      if (next >= stats.totalYears) return stats.totalYears - 1;
      return next;
    });
  }, [stats.totalYears]);

  const handleNavigateMonth = useCallback((direction) => {
    if (selectedMonth === null || selectedYear === null) return;
    navDirectionRef.current = direction > 0 ? 'right' : 'left';
    let newMonth = selectedMonth + direction;
    let newYear = selectedYear;

    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }

    if (newYear < 0) {
      newYear = 0;
      newMonth = 0;
    } else if (newYear >= stats.totalYears) {
      newYear = stats.totalYears - 1;
      newMonth = 11;
    }

    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  }, [selectedMonth, selectedYear, stats.totalYears]);

  const handleNavigateDay = useCallback((direction) => {
    if (selectedYear === null || selectedMonth === null || selectedDay === null) return;
    navDirectionRef.current = direction > 0 ? 'right' : 'left';
    const calYear = getBirthDate().getFullYear() + selectedYear;
    const d = new Date(calYear, selectedMonth, selectedDay + direction);

    // Do not navigate before birth date
    if (d < getBirthDate()) {
      return;
    }

    const newYearIndex = d.getFullYear() - getBirthDate().getFullYear();
    // Do not navigate past max lifespan
    if (newYearIndex >= stats.totalYears) {
      return;
    }

    setSelectedDay(d.getDate());
    setSelectedMonth(d.getMonth());
    setSelectedYear(newYearIndex);
  }, [selectedYear, selectedMonth, selectedDay, stats.totalYears]);

  const footerLabel = {
    months: 'Each dot is a month of your life',
    years: `${stats.totalYears} years · Right-click a dot to color or tag`,
    singleYear: 'Each dot is a month — click to see days',
    singleMonth: 'Each dot is a day — click to see hours',
    singleDay: 'Each dot is an hour of your day',
  }[viewMode];

  return (
    <div className="min-h-screen flex flex-col items-center px-4 relative" style={{ paddingTop: '80px', paddingBottom: '48px' }}>

      {/* User Profile — top right (next to settings) */}
      <UserProfile
        user={user}
        isLoggedIn={isLoggedIn}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      {/* All To-Dos button — top right */}
      <button
        onClick={() => setIsAllTodosOpen(true)}
        className="fixed top-5 z-40 rounded-full transition-all duration-200 flex items-center justify-center hover:scale-110 hover:opacity-80 active:scale-95"
        style={{
          right: '7.75rem',
          width: '40px',
          height: '40px',
          backgroundColor: 'var(--control-bg)',
          border: '1px solid var(--control-border)',
          color: 'var(--fg-muted)',
        }}
        aria-label="All To-Dos"
        title="All To-Dos"
        data-html2canvas-ignore="true"
      >
        <ListTodo size={18} strokeWidth={2} />
      </button>

      {/* All Journals button — top right */}
      <button
        onClick={() => setIsAllJournalsOpen(true)}
        className="fixed top-5 z-40 rounded-full transition-all duration-200 flex items-center justify-center hover:scale-110 hover:opacity-80 active:scale-95"
        style={{
          right: '11rem',
          width: '40px',
          height: '40px',
          backgroundColor: 'var(--control-bg)',
          border: '1px solid var(--control-border)',
          color: 'var(--fg-muted)',
        }}
        aria-label="All Journals"
        title="All Journals"
        data-html2canvas-ignore="true"
      >
        <BookOpen size={18} strokeWidth={2} />
      </button>

      {/* Settings button — top right */}
      <button
        onClick={() => setSettingsOpen(true)}
        className="fixed top-5 right-5 z-40 rounded-full transition-all duration-200 flex items-center justify-center hover:scale-110 hover:opacity-80 active:scale-95"
        style={{
          width: '40px',
          height: '40px',
          backgroundColor: 'var(--control-bg)',
          border: '1px solid var(--control-border)',
          color: 'var(--fg-muted)',
        }}
        aria-label="Settings"
        data-html2canvas-ignore="true"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          if (isAuthenticated()) {
            saveSettings({ heartbeat_enabled: val }).catch((err) => console.error('Failed to sync heartbeat:', err));
          }
        }}
        defaultColor={defaultColor}
        onSaveDefaultColor={handleSaveDefaultColor}
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
        refreshKey={refreshKey}
        journalFont={journalFont}
        journalFontSize={journalFontSize}
        onSaveFont={handleSaveJournalFont}
      />

      {/* Journal Overlay */}
      <AnimatePresence>
        {journalOpen && (
          <JournalOverlay
            contextKey={activeContextKey}
            displayTitle={activeDisplayTitle}
            onClose={() => {
              setJournalOpen(false);
              if (directJournalInfo && directJournalInfo.reopenAllJournals) {
                // small delay so animation doesn't look jarring
                setTimeout(() => setIsAllJournalsOpen(true), 150);
              }
              setDirectJournalInfo(null);
            }}
            journalFont={journalFont}
            journalFontSize={journalFontSize}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {todoOpen && (
          <TodoOverlay
            contextKey={contextKey}
            displayTitle={displayTitle}
            onClose={() => setTodoOpen(false)}
            onTodosChanged={refreshPendingTodos}
          />
        )}
      </AnimatePresence>

      <AllJournalsModal
        isOpen={isAllJournalsOpen}
        onClose={() => setIsAllJournalsOpen(false)}
        onJump={handleJumpToContext}
        onOpenJournal={handleOpenJournalFromAll}
      />

      <AllTodosModal
        isOpen={isAllTodosOpen}
        onClose={() => setIsAllTodosOpen(false)}
        onJump={handleJumpToContext}
        onTodosChanged={refreshPendingTodos}
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
        <div
          className="w-px h-5"
          style={{ backgroundColor: 'var(--control-border)' }}
        />
        <JournalButton onClick={() => setJournalOpen(true)} />
        <TodoButton onClick={() => setTodoOpen(true)} />
        <div
          className="w-px h-5"
          style={{ backgroundColor: 'var(--control-border)' }}
        />
        <button
          onClick={jumpToToday}
          className="p-[6px] rounded flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            color: 'var(--fg)',
            backgroundColor: 'var(--control-bg)',
            border: '1px solid var(--control-border)',
          }}
          title="Jump to Today"
        >
          <CalendarHeart size={16} />
        </button>
      </div>

      {/* Grid Area */}
      <main ref={gridRef} className="w-full max-w-4xl mx-auto">
        <AnimatePresence mode="wait" custom={navDirectionRef.current}>
          <motion.div
            key={viewMode + (selectedYear ?? '') + (selectedMonth ?? '') + (selectedDay ?? '')}
            custom={navDirectionRef.current}
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onAnimationComplete={() => { navDirectionRef.current = null; }}
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
              onNavigateYear={handleNavigateYear}
              onNavigateMonth={handleNavigateMonth}
              onNavigateDay={handleNavigateDay}
              heartbeat={heartbeat}
              defaultColor={defaultColor}
              updateTrigger={refreshKey}
              pendingTodoContexts={pendingTodoContexts}
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
