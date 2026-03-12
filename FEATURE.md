# FEATURE.md — LifeDots Roadmap

> This file tracks planned features. Each feature is self-contained so you can implement one at a time.
> Tags: `[requested]` = user-requested · `[suggested]` = added recommendation

---

## Table of Contents

| ID | Feature | Status |
|----|---------|--------|
| F01 | All Journals — create, filter, sort | planned |
| F02 | All Todos — inline creation | planned |
| F03 | Remove "Jump to Today" button | planned |
| F04 | Replace CalendarHeart jump icon | planned |
| F05 | Dot size slider | planned |
| F06 | Life expectancy health calculator | planned |
| F07 | Streak system | planned |
| F08 | Mobile PWA + bottom nav | planned |
| F09 | Life chapters (named eras) | planned |
| F10 | Full-text journal search | planned |
| F11 | Writing prompts | planned |
| F12 | Recurring todos | planned |
| F13 | Heatmap activity view | planned |
| F14 | Time capsule entries | planned |

---

## F01 — All Journals: Create, Filter & Sort `[requested]`

### What
Transform the All Journals modal from a read-only list into a full journaling hub. Users can create a new journal entry here by choosing a scope (today, a specific date, a year, a month, or life), write in the same rich-text editor, and it automatically syncs to the correct dot.

### User Stories
- As a user, I want to write a journal from the All Journals page without having to navigate to a dot first.
- As a user, I want to sort and filter my entries so I can find past writing easily.
- As a user, I want journals grouped by life → year → month → day so the hierarchy is clear.

### UI Changes (`AllJournalsModal.jsx`)

**Header row — add "New Entry" button:**
- A `+ New Entry` button sits next to the close button.
- Clicking it opens an inline creation form (slide-down panel above the list).

**Creation form (inline, not a new modal):**
```
[ Scope selector ] → dropdown: "Today" | "This year" | "This month" | "Specific date" | "Life"
[ Date picker ]   → shown only when "Specific date" selected (native <input type="date">)
[ Open editor ]   → opens the full JournalOverlay with the context key computed from the selection
```
When the user selects scope + optional date and clicks "Write":
- Compute the `context_key` from the selection using `dateEngine.js`
- Open `JournalOverlay` with that `context_key`
- On close, refresh the list

**Sorting toolbar (above the entry list):**
```
Sort by: [ Date written ▼ ] [ Last edited ▼ ]   Order: [ Newest first ↕ ]
```

**Grouping toggle:**
```
[ Flat list ] [ Grouped by period ]
```
- Flat list: entries sorted by chosen field
- Grouped: collapsible sections Life → Year 1 → Year 2 → … with nested month/day entries inside

**Entry card changes:**
- Replace `<CalendarHeart>` jump button with a plain arrow icon (`→`) or text link `"Go to dot"`
- Show `context_key` label as a breadcrumb: `Life / Year 28 / March / Day 15`
- Show `updated_at` as secondary label: `edited Mar 15, 2026`
- Add a snippet (first 120 chars, stripped HTML) as preview

**Filtering:**
- Text input to filter by content snippet or period label

### Implementation Steps

1. **`AllJournalsModal.jsx`**
   - Add `sortBy` state (`'date' | 'edited'`), `sortOrder` state (`'desc' | 'asc'`), `groupMode` state (`'flat' | 'grouped'`), `filterText` state
   - Add `showCreate` state for the inline creation form
   - Add scope selector + date picker UI
   - Add `handleCreate(scope, date)` → computes `context_key`, calls `onOpenJournal(contextKey)` (new prop from App.jsx)
   - Implement `groupEntries(journals)` utility: group by extracting year/month from `context_key`
   - Implement sorting and filtering logic locally (no new API calls)

2. **`App.jsx`**
   - Pass an `onOpenJournal` prop to `AllJournalsModal` that sets `contextKey` and opens `JournalOverlay`
   - After `JournalOverlay` closes, re-fetch the journals list (pass a `refresh` callback)

3. **`dateEngine.js`** — no changes needed; `context_key` computation already exists

4. **No backend changes** — all new journal entries use the existing `POST /api/journal` upsert

---

## F02 — All Todos: Inline Creation `[requested]`

### What
Add a quick-create form to the All Todos modal so users can add a new todo from the list view without navigating to a specific dot first.

### UI Changes (`AllTodosModal.jsx`)

**Add "New Todo" button in header** (same pattern as F01).

**Inline creation form:**
```
[ Task text input                          ]
[ Scope: Today | Specific date | Life ... ] [ Due date (optional) ]
[ Add ]
```
- Scope selector computes the `context_key`
- Calls `createTodo(contextKey, task, dueDate)` on submit
- Refreshes list inline

**Entry card changes:**
- Replace `<CalendarHeart>` jump button with plain `→` arrow icon (see F04)
- Add delete button (trash icon) on each todo

### Implementation Steps

1. **`AllTodosModal.jsx`**
   - Add `showCreate`, `newTask`, `newScope`, `newDate`, `newDueDate` states
   - `handleCreate()` → `createTodo(...)` → re-run `loadTodos()`
   - Add delete handler calling `deleteTodo(id)` with optimistic UI removal
   - Replace `CalendarHeart` icon

2. **`api.js`** — `deleteTodo` already exists; no new API calls needed

3. **No backend changes**

---

## F03 — Remove "Jump to Today" Button from Main Header `[requested]`

### What
The `CalendarHeart` button in the main controls bar ("Jump to Today") should be removed. It's visual noise for a minimalistic interface.

### Implementation Steps

1. **`App.jsx`** — remove the `<button onClick={jumpToToday}>` block (~lines 552–563) and its lucide import
2. **`App.jsx`** — optionally keep the `jumpToToday` function itself and expose it only via keyboard shortcut (e.g. `T` key) if desired
3. Remove `CalendarHeart` from the `lucide-react` import line if unused elsewhere

---

## F04 — Replace CalendarHeart Jump Icon `[requested]`

### What
Inside `AllJournalsModal` and `AllTodosModal`, the jump button uses `<CalendarHeart>` which looks out of place. Replace it with a minimal arrow or plain text.

### Implementation Steps

1. **`AllJournalsModal.jsx`**
   - Replace `<CalendarHeart size={16} />` + `"Jump"` with `→` (unicode arrow) or `<ArrowRight size={14} />` from lucide
   - Update button label to `"Go"` or remove label entirely

2. **`AllTodosModal.jsx`** — same change

3. Remove `CalendarHeart` import from both files if no longer used

---

## F05 — Dot Size Slider `[requested]`

### What
A slider in Settings lets users scale the dot grid up or down (50% → 200%). At 100% (default) behavior is unchanged. Larger dots make the grid more tap-friendly on mobile; smaller dots let more of the grid fit on screen.

### User Story
As a mobile user, I want larger dots so I can tap them without mis-clicking. As a desktop user, I want smaller dots to see my whole life on one screen.

### UI (`Settings.jsx`)
Add a new **"Dot Size"** section with a range slider:
```
Dot Size
[ ●──────────── ] 100%
Small              Large
```
Range: 50–200, step: 5, default: 100. Live preview updates the grid as the slider moves.

### Data
- Store `dot_size` (integer 50–200) in `profiles` via `PUT /api/settings`
- Persist in `localStorage` as `lifedots-dot-size` for non-logged-in users
- Read on startup same way as `defaultColor`

### Implementation Steps

1. **`backend/src/controllers/settings.js`**
   - Add `dot_size: z.number().int().min(50).max(200).optional()` to `updateSchema`

2. **`frontend/src/utils/dateEngine.js`** (or a new `dotSize.js` util)
   - Export `getDotSize()` / `setDotSize(n)` reading from localStorage
   - Export `hydrateDotSizeFromRemote(n)`

3. **`App.jsx`**
   - Add `dotSize` state, initialize from `localStorage.getItem('lifedots-dot-size') || 100`
   - In `hydrateRemoteSettings`, read `remote.dot_size` and sync
   - Pass `dotSize` down to `DotGrid`
   - Add `handleSaveDotSize(n)` that calls `saveSettings({ dot_size: n })`

4. **`Settings.jsx`**
   - Add `Dot Size` section with `<input type="range" min={50} max={200} step={5} />`
   - Call `onSaveDotSize` as the user drags (debounce 300ms)

5. **`DotGrid.jsx`**
   - Accept `dotSize` prop
   - Apply scale: `const scale = dotSize / 100`
   - Multiply dot width/height/gap by scale
   - This also increases touch targets proportionally

6. **Backend `profiles` table** — add column:
   ```sql
   ALTER TABLE public.profiles ADD COLUMN dot_size INTEGER NOT NULL DEFAULT 100;
   ```

---

## F06 — Life Expectancy Health Calculator `[requested]`

### What
Instead of manually typing a number, users answer a short health questionnaire. The app computes an evidence-based life expectancy estimate and sets `expected_lifespan` automatically. Optionally, a weekly check-in updates the estimate and animates new dots being added to the grid.

### Scientific Basis
The model uses additive adjustments to a national baseline (default: 79 years for global average, user can optionally set country for a more accurate baseline). Adjustments are derived from published meta-analyses:

| Factor | Options | Adjustment (years) | Source |
|--------|---------|-------------------|--------|
| Exercise | Sedentary / 1-2x week / 3-5x week (150+ min) / Daily vigorous | 0 / +1.5 / +3.4 / +4.5 | Lee et al. 2012, Lancet |
| Diet | Processed/western / Average / Mediterranean or whole-food / Plant-based | −2 / 0 / +2.5 / +3 | Sofi et al. 2008, BMJ |
| Smoking | Current / Quit <10yr / Quit >10yr / Never | −10 / −3 / −1 / 0 | Doll et al. 2004 |
| Alcohol | Heavy (3+/day) / Moderate (1-2/day) / Light / None | −4 / 0 / +0.5 / +1 | Wood et al. 2018, Lancet |
| Sleep | <6hr / 6-7hr / 7-9hr (optimal) / >9hr | −2 / −0.5 / 0 / −1 | Cappuccio et al. 2010 |
| Chronic stress | High / Moderate / Low | −2.8 / 0 / +1.5 | Epel et al. |
| BMI | <18.5 / 18.5-24.9 / 25-29.9 / ≥30 | −2 / 0 / −1 / −4 | Berrington de González 2010 |
| Social connections | Isolated / Average / Strong network | −5 / 0 / +5 | Holt-Lunstad et al. 2010 |
| Purpose/meaning | Low / Moderate / High | 0 / +2 / +4 | Hill et al. 2019, Psych Science |
| Chronic conditions | ✓ Diabetes / ✓ Heart disease / ✓ Hypertension / None | −6 / −5 / −2 / 0 | various |

**Formula:**
```
estimated_lifespan = clamp(national_baseline + Σ(adjustments), 50, 110)
```
The result is rounded to the nearest whole year and applied as `expected_lifespan`.

> **Privacy note:** The questionnaire collects sensitive personal health data (BMI, smoking status, chronic conditions). This data is protected by Supabase RLS — no other user can ever read it. Add a one-line disclaimer in the calculator UI before Step 1: *"Your answers are private and stored only on your account. They are never shared or used for anything other than calculating your grid."*

### UI — Multi-step questionnaire modal

A new `HealthCalculatorModal` component. Shown when user clicks a new **"Calculate"** link next to the life expectancy input in Settings, or automatically for new users after first login.

**Step flow (5 screens, progress bar at top):**
```
Step 1 of 5 — Activity & Sleep
  How often do you exercise?
  ○ Rarely / never   ○ 1–2× a week   ○ 3–5× a week   ○ Daily vigorous

  How many hours do you sleep?
  ○ Under 6   ○ 6–7   ○ 7–9   ○ More than 9

Step 2 of 5 — Diet & Substance Use
  How would you describe your diet?
  ○ Mostly processed / fast food
  ○ Mixed / average
  ○ Mostly whole foods / Mediterranean
  ○ Primarily plant-based

  Do you smoke?  ○ Yes, currently  ○ Used to  ○ Never

  Alcohol?  ○ Heavy  ○ Moderate  ○ Light  ○ None

Step 3 of 5 — Wellbeing
  How often do you feel chronically stressed?
  ○ Often   ○ Sometimes   ○ Rarely

  How strong are your social connections?
  ○ I'm mostly isolated   ○ Some social ties   ○ Strong network

  Do you have a strong sense of purpose?
  ○ Not really   ○ Somewhat   ○ Yes, clearly

Step 4 of 5 — Health Status
  BMI range (optional)  ○ Under 18.5  ○ 18.5–25  ○ 25–30  ○ 30+

  Any diagnosed chronic conditions? (check all that apply)
  ☐ Type 2 diabetes   ☐ Heart disease   ☐ Hypertension   ☐ None of these

Step 5 of 5 — Result
  Based on your responses, your estimated lifespan is:

              82 years

  [  Use this estimate  ]  [ Enter manually instead ]
```

### Weekly Check-in (Stretch Goal)

If enabled in Settings ("Update estimate with weekly check-ins"), the app shows a short 3-question modal once a week:
- "Did your exercise habits change this week?"
- "Did your diet improve or slip?"
- "How's your stress level been?"

**Dynamic dot expansion:** If the new estimate is higher than the previous, animate N new dots appearing at the far end of the grid (the "future" end), one at a time, with a subtle glow effect. If lower, dots quietly fade from the far end. This creates a visceral feedback loop: improve your habits, watch your life visibly grow.

**State persistence:**
- Store answers in `profiles.health_data` (new JSONB column)
- Store `health_score_updated_at` to know when to prompt for a check-in
- The computation is done client-side; only the final `expected_lifespan` is saved to the backend

### Implementation Steps

1. **Database:**
   ```sql
   ALTER TABLE public.profiles
     ADD COLUMN health_data JSONB NOT NULL DEFAULT '{}'::jsonb;
   ```

2. **Backend `controllers/settings.js`** — add `health_data: z.record(z.any()).optional()` to the update schema

3. **`frontend/src/utils/healthCalculator.js`** (new file)
   - Export `HEALTH_QUESTIONS` (question definitions + adjustments)
   - Export `calculateLifespan(answers, baseline)` — pure function, returns integer
   - Export `getRecommendedBaseline(country?)` — returns national average

4. **`frontend/src/components/HealthCalculatorModal.jsx`** (new file)
   - Multi-step wizard with progress bar
   - Calls `calculateLifespan()` locally
   - On confirm: calls `onResult(years)` → parent sets `expected_lifespan` and calls `saveSettings`

5. **`Settings.jsx`**
   - Replace raw number input with: `82 years  [Recalculate]`
   - "Recalculate" opens `HealthCalculatorModal`
   - Keep manual override as secondary option

6. **`App.jsx`**
   - Add `healthCheckInDue` state (compare `health_score_updated_at` vs now)
   - Show weekly check-in prompt if due and feature is enabled

---

## F07 — Streak System `[requested]`

### What
A 🔥 streak counter in the top bar that increments each day the user writes at least one journal entry. Optional (toggle in Settings).

### UI
- Top bar: small fire icon + streak number, e.g. `🔥 14`
- Hovering shows: "14-day journaling streak · Longest: 42 days"
- Clicking opens a mini modal: current streak, longest streak, last activity date, a simple bar chart of the last 14 days (journaled = filled dot, missed = empty dot)
- If streak is 0 or feature disabled, icon is hidden (or greyed out)

### Logic
- A streak day is any calendar day the user saves at least one non-empty journal entry
- Streak increments if `today` is `last_journal_date + 1 day`
- Streak resets if `today > last_journal_date + 1 day` (gap of ≥2 days)
- Writing multiple entries the same day does not double-count

### Data
New fields in `profiles`:
```sql
ALTER TABLE public.profiles
  ADD COLUMN streak_current INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN streak_longest INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN streak_last_date DATE;
```

### API
New endpoint: `POST /api/streaks/ping`
- Checks `streak_last_date` against today
- If today: no-op (idempotent)
- If yesterday: increment `streak_current`, update `streak_longest`, set `streak_last_date = today`
- If older: reset `streak_current = 1`, set `streak_last_date = today`
- Returns `{ streak_current, streak_longest, streak_last_date }`

Called automatically every time `saveJournalEntry` succeeds with non-empty content. The endpoint is fully idempotent — calling it multiple times on the same day is a no-op, so failed/retried network requests cause no harm.

> **Alternative (DB trigger):** A Postgres trigger on `INSERT INTO journal_entries` could update streak columns automatically, eliminating the extra API call and handling edge cases like direct DB writes. This is slightly harder to debug but more robust. The Node.js approach is preferred here to keep all business logic visible in the backend services layer; the trigger is worth considering once the feature is stable.

### Settings Toggle
Settings → Preferences section:
```
Journaling streak
Show your daily journaling streak in the top bar   [ toggle ]
```

### Implementation Steps

1. **Database:** Run the `ALTER TABLE` above

2. **`backend/src/routes/streaks.js`** (new file) — `POST /ping`

3. **`backend/src/controllers/streaks.js`** (new file) — streak logic

4. **`backend/src/services/streaks.js`** (new file) — Supabase update

5. **`backend/src/index.js`** — register `/api/streaks` route

6. **`frontend/src/utils/api.js`** — add `pingStreak()` function

7. **`frontend/src/hooks/useLocalJournal.js`** — call `pingStreak()` after a successful `saveJournalEntry` when content is non-empty

8. **`frontend/src/components/StreakBadge.jsx`** (new file) — `🔥 {n}` button + mini modal

9. **`App.jsx`**
   - Add `streakData` state (`{ current, longest, lastDate }`)
   - Load from remote settings on login
   - Conditionally render `<StreakBadge>` based on settings toggle
   - Add `streak_visible` to settings schema and backend

---

## F08 — Mobile PWA + Bottom Navigation `[suggested]`

### What
Make LifeDots installable as a Progressive Web App on iOS/Android, and replace the cramped top-bar controls with a bottom navigation on small screens.

### Why
The current header is dense on mobile. A bottom nav matches native mobile patterns and reduces mis-taps.

### Changes

**`frontend/public/manifest.json`** (new file):
```json
{
  "name": "LifeDots",
  "short_name": "LifeDots",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [...]
}
```

**`frontend/index.html`** — add `<link rel="manifest">` and meta tags for iOS

**`frontend/src/components/BottomNav.jsx`** (new, mobile-only):
- Shown only when `window.innerWidth < 640px` (or Tailwind `sm:hidden`)
- Tabs: Grid · Journal · Todos · Settings
- Hides on scroll down, reappears on scroll up

**Top bar on mobile:**
- Collapse to: Logo + Theme toggle + User avatar
- Move View Selector, Export, Journal/Todo buttons into bottom nav or a slide-up sheet

### Implementation Steps
1. Add `manifest.json` and icons to `public/`
2. Add meta tags to `index.html`
3. Create `BottomNav.jsx` with 4 tab icons
4. In `App.jsx`, conditionally render `BottomNav` and hide some top controls on mobile via Tailwind `sm:hidden`

---

## F09 — Life Chapters (Named Eras) `[suggested]`

### What
Users can define named life chapters — "Childhood", "University Years", "First Job", "Parenthood" — with a start and end year. Dots belonging to a chapter get a subtle background color band behind them in the years grid.

### Why
Gives the grid narrative structure. Looking at your life by chapter is more meaningful than raw year indices.

### UI
- New **"Chapters"** section in Settings (or its own modal accessed from a new button)
- Add chapter form: Name · Start year · End year · Color (pick from 6 palette)
- Chapters listed below with edit/delete

### Data
New table:
```sql
CREATE TABLE public.chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  start_year INTEGER NOT NULL,
  end_year INTEGER NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- RLS: same pattern as todos
```

### Implementation Steps
1. **Backend:** `routes/chapters.js`, `controllers/chapters.js`, `services/chapters.js` — full CRUD
2. **`api.js`** — `fetchChapters`, `createChapter`, `updateChapter`, `deleteChapter`
3. **`App.jsx`** — load chapters on login, pass to `DotGrid`
4. **`DotGrid.jsx` (years view)** — render colored bands behind dot rows corresponding to chapter ranges
5. **`ChaptersModal.jsx`** (new) — chapter management UI

---

## F10 — Full-Text Journal Search `[suggested]`

### What
A search bar in `AllJournalsModal` that filters entries by their text content in real time.

### Why
Once a user has years of entries, scrolling to find something is painful. Search is essential.

### UI
- Search input at the top of `AllJournalsModal` (below the sort/filter toolbar from F01)
- Filters the rendered list client-side (content is already loaded)
- Highlights matching text in the preview snippet

### Implementation Steps
1. **`AllJournalsModal.jsx`** — add `searchText` state; filter `journals` array by `stripHtml(j.content).toLowerCase().includes(searchText.toLowerCase())`
2. Add a simple highlight utility: wrap matched text in `<mark>` in the snippet
3. No backend changes (all data is already fetched; all journals fit in memory for typical users)

---

## F11 — Daily Writing Prompts `[suggested]`

### What
When a user opens the journal for "today" with no existing content, show an optional writing prompt as placeholder text. The prompt disappears the moment they start typing.

### Why
Writer's block is real. A gentle prompt ("What are you grateful for today?") removes friction.

### Prompt Pool
~50 prompts stored as a static array in the frontend:
- "What's one small thing that went well today?"
- "What would make tomorrow better than today?"
- "If this year were a chapter, what would you title it?"
- "What are you carrying that you could put down?"
- "Describe today in three words, then unpack one of them."
- etc.

### UI
- Prompt shows as greyed-out placeholder inside the TipTap editor area (not as real editor content)
- A small "different prompt" link to cycle to another
- Toggle in Settings → Preferences: "Show writing prompts for empty entries" (default: on)

### Implementation Steps
1. **`frontend/src/utils/prompts.js`** (new) — export `PROMPTS` array and `getDailyPrompt(date)` (deterministic: uses date hash to always show same prompt for a given day)
2. **`JournalOverlay.jsx`**
   - If `isToday(contextKey)` and `content` is empty after loading, set editor placeholder to today's prompt
   - Add "Try a different prompt" button that picks the next prompt
3. **Settings toggle** — add `prompts_enabled` boolean to `profiles`, default `true`

---

## F12 — Recurring Todos `[suggested]`

### What
Mark a todo as recurring (daily, weekly, monthly). When completed, it automatically reappears for the next period.

### Why
Life has rhythms. "Drink 2L water", "Weekly review", "Call mum" are naturally recurring.

### UI
In `TodoOverlay.jsx` creation form, add a **"Repeat"** dropdown:
- None (default) · Daily · Weekly · Monthly

### Data
Add `recurrence` column:
```sql
ALTER TABLE public.todos ADD COLUMN recurrence TEXT; -- null | 'daily' | 'weekly' | 'monthly'
```

### Logic
When `updateTodo(id, { is_completed: true })` is called and the todo has a recurrence:
- Backend automatically inserts a new todo for the next period
- `context_key` advances by 1 day/week/month from the original
- `is_completed = false`, `task` is copied, `recurrence` is copied

> **Monthly date math gotcha:** "Add 1 month" is not always safe. January 31 + 1 month = February 31, which doesn't exist and silently rolls over to March 3 in most environments, drifting the user's schedule by days. When computing the next monthly `context_key`, extract the year and month, advance by 1, then **clamp the day to the last valid day of that month** using `Math.min(originalDay, daysInMonth(nextYear, nextMonth))`. This must be handled in `backend/src/services/todo.js` using the same date logic as `dateEngine.js`.

### Implementation Steps
1. **Database:** `ALTER TABLE public.todos ADD COLUMN recurrence TEXT`
2. **`backend/src/services/todo.js`** — after marking complete, check `recurrence`, compute next `context_key`, insert new row
3. **`backend/src/controllers/todo.js`** update schema — add `recurrence: z.enum(['daily','weekly','monthly']).optional().nullable()`
4. **`TodoOverlay.jsx`** — add Repeat dropdown to the add-todo form
5. **`api.js`** — no new endpoints needed

---

## F13 — Heatmap Activity View `[suggested]`

### What
A new view in the ViewSelector: **"Activity"**. Shows a GitHub-style contribution heatmap — columns are weeks, rows are days of the week, squares are colored by whether a journal entry exists for that day.

### Why
Gives a bird's-eye view of journaling consistency. More motivating than a grid of undifferentiated dots.

### UI
- Each cell: 10×10px square
- Color: `var(--dot-future)` for no entry, scaling to a dark accent for 1+ entries
- Hovering a cell shows: date + first 60 chars of entry
- Clicking jumps to that day's dot (same as existing jump behavior)
- Visible range: last 12 months (default) or lifetime (toggle)

### Implementation Steps
1. **`ViewSelector.jsx`** — add "Activity" option
2. **`frontend/src/components/HeatmapView.jsx`** (new)
   - Fetch all journals on mount
   - Build a `Map<dateString, entry>` lookup
   - Render a CSS Grid of 53 columns × 7 rows
   - Color by presence of entry
3. **`App.jsx`** — handle `viewMode === 'activity'` and render `HeatmapView`

---

## F14 — Time Capsule Entries `[suggested]`

### What
Write a journal entry for a **future** dot. It's stored immediately but shown with a special "sealed" visual until the calendar date arrives. On that future date, the entry "unlocks" and the dot gets a subtle glow effect on first open.

### Why
Writing to your future self is a powerful introspective exercise. "Dear 40-year-old me..." — now you actually see that dot on the grid.

### UI
- Future dot context menu gains a new option: **"Write time capsule"**
- When writing: the `JournalOverlay` header shows `"To: [date] · Time capsule"` instead of the normal title
- In `AllJournalsModal`, time capsule entries are shown with a 🔒 icon until their date; after the date, the lock opens and the entry appears normally

### Data
Add `is_time_capsule BOOLEAN NOT NULL DEFAULT FALSE` and `unlocks_at DATE` to `journal_entries`:
```sql
ALTER TABLE public.journal_entries
  ADD COLUMN is_time_capsule BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN unlocks_at DATE;
```

### Security Note
Do **not** rely on the frontend to hide locked content. A user can open their browser's Network tab and read the raw `/api/journal/all` response, seeing the text before `unlocks_at` arrives. The redaction must happen in the backend:
- In `journalService.listEntries` (and `getEntry`), if `is_time_capsule = true` and `unlocks_at > now()`, replace `content` with `"[Time Capsule — unlocks on {unlocks_at}]"` before returning the row.
- The full content is only sent once the server-side date check passes.

### Implementation Steps
1. **Database:** Run the `ALTER TABLE` above
2. **`backend/src/services/journal.js`** — in `listEntries` and `getEntry`, add a server-side redaction check: if `is_time_capsule AND unlocks_at > CURRENT_DATE`, set `content = '[Time Capsule — unlocks on ' || unlocks_at || ']'`
3. **Backend `createSchema`** in `controllers/journal.js` — add `is_time_capsule` and `unlocks_at`
4. **`ContextMenu.jsx`** — add "Time capsule" option for future dots
5. **`JournalOverlay.jsx`** — detect time capsule mode from prop, update header title
6. **`AllJournalsModal.jsx`** — show 🔒 icon when content starts with `[Time Capsule`; display the locked message from the server as-is
7. **`DotGrid.jsx`** — apply a subtle different styling to dots that have a pending time capsule

---

## Implementation Order (Recommended)

These are independent — do them one at a time and verify before moving on:

| Priority | Feature | Complexity | Impact |
|----------|---------|------------|--------|
| 1 | F03 — Remove jump button | Tiny | Clean up |
| 2 | F04 — Replace CalendarHeart icon | Tiny | Polish |
| 3 | F01 — All Journals improvements | Medium | High daily use |
| 4 | F02 — All Todos improvements | Small | High daily use |
| 5 | F05 — Dot size slider | Small | Mobile UX |
| 6 | F07 — Streak system | Medium | Engagement |
| 7 | F10 — Journal search | Small | Usability |
| 8 | F11 — Writing prompts | Small | Delight |
| 9 | F06 — Health calculator (basic) | Large | Core differentiator |
| 10 | F08 — Mobile PWA | Medium | Reach |
| 11 | F09 — Life chapters | Medium | Depth |
| 12 | F12 — Recurring todos | Medium | Utility |
| 13 | F13 — Heatmap view | Medium | Insight |
| 14 | F14 — Time capsule | Medium | Delight |
| 15 | F06 — Weekly check-in / dynamic dots | Large | Stretch goal |
