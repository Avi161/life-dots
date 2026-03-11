# LifeDots — Code Issues Audit

> Reviewed: frontend/src/ and backend/src/ against the provided DB schema.
> Severity: **Critical → High → Medium → Low**

---

## Critical

---

### C1 — `apiFetch()` parses JSON before checking HTTP status

**File:** `frontend/src/utils/api.js:23–28`

```js
const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
const json = await res.json();   // ← called unconditionally
```

If the backend returns a non-JSON body (502 from a proxy, CORS preflight failure, plain-text error), `res.json()` throws an unrelated parse error instead of surfacing the real HTTP status. The actual error is lost.

**Fix steps:**
1. After `await fetch(...)`, check `if (!res.ok)` before calling `res.json()`.
2. On failure, attempt `res.text()` for the error body, then throw with the status code + body.
3. On success, proceed with `res.json()` as today.

---

### C2 — Double `dot_meta` save on every color change

**Files:** `frontend/src/utils/dotMeta.js:38–40`, `frontend/src/components/Settings.jsx:30–44`

`setDotMeta()` calls `saveSettings({ dot_meta: metaCache })` synchronously every time a dot's color/tag changes (dotMeta.js:39). When the user saves Settings, `handleSave` calls `onSaveDefaultColor` (which calls `setDotMeta`) **and then** schedules another `saveSettings({ ..., dot_meta: getAllDotMeta() })` via `setTimeout(0)` (Settings.jsx:38–44).

Result: two concurrent `PUT /api/settings` requests fire. The second one with `setTimeout(0)` was intended to wait for `metaCache` to update, but `setDotMeta` already updates `metaCache` synchronously — so the delay serves no purpose and only causes the double write.

**Fix steps:**
1. Remove `dot_meta` from the `saveSettings` call inside `Settings.jsx:handleSave`. The `setDotMeta` call on line 31 via `onSaveDefaultColor` already syncs it.
2. Remove the `setTimeout(0)` wrapper since it's no longer needed.
3. Alternatively, remove the auto-save in `setDotMeta` (dotMeta.js:38–40) and only sync from explicit save points.

---

### C3 — Clearing journal content never updates the backend

**File:** `frontend/src/hooks/useLocalJournal.js:94–103`

When authenticated and `isEmpty` is true, `persist()` intentionally does nothing ("don't delete remotely on every keystroke"). But this means if a user **completely clears** a journal entry and closes the overlay, the old content remains on the server. The next time they open that dot, the old content reappears from the backend — appearing as if the deletion never happened.

The unauthenticated path correctly deletes from localStorage when empty (lines 108–110); authenticated behavior is asymmetric.

**Fix steps:**
1. In `forceSave()` (called on close/unmount), if `latestContentRef.current` is empty and the user is authenticated, call `saveJournalEntry(key, '')` to persist the empty state, OR call a `deleteJournalEntry(key)` API function.
2. Add `deleteJournalEntry` to `api.js` — it can call `DELETE /api/journal/:key` (the route already exists).
3. Keep the debounced `persist()` unchanged so mid-edit empty states don't trigger network calls.

---

### C4 — Missing UNIQUE constraint allows duplicate journal entries + breaks updates

**Files:** `backend/src/services/journal.js:29–55`, `backend/migrations/001_entry_date_to_context_key.sql:23`

The service uses a manual check-then-insert ("Manual upsert to avoid requiring a UNIQUE constraint"):

```js
const existing = await supabase.from('journal_entries').select('id')
  .eq('user_id', userId).eq('context_key', contextKey).maybeSingle();

if (existing) { /* update */ } else { /* insert */ }
```

Under concurrent saves (debounce fires twice quickly), both reads can return "no entry", both attempt `INSERT`, and duplicate rows are created for the same `(user_id, context_key)`.

The migration file `001_entry_date_to_context_key.sql` **does** add `UNIQUE(user_id, context_key)` at line 23, but the user-provided schema does not include it — indicating the migration may not have been applied. Once duplicates exist, `updateEntry` calling `.maybeSingle()` throws Supabase error PGRST116, breaking all future journal saves for that entry.

**Fix steps:**
1. Confirm whether the migration was applied by checking the Supabase Dashboard → Table Editor → journal_entries → Constraints.
2. If not applied, run the migration in Supabase SQL Editor.
3. Replace the manual check-then-insert in `upsertEntry` with a proper Supabase upsert:
   ```js
   supabase.from('journal_entries')
     .upsert({ user_id, context_key, content, updated_at: new Date().toISOString() },
              { onConflict: 'user_id,context_key' })
     .select(...)
     .single()
   ```
4. Remove the manual two-step check entirely.

---

### C5 — `updateEntry` does not update `updated_at`

**File:** `backend/src/services/journal.js:59`

`upsertEntry` explicitly sets `updated_at` on update (line 41). `updateEntry` does not:

```js
.update({ content })   // ← missing updated_at
```

There is no database trigger to auto-update `updated_at` on UPDATE (the schema's `DEFAULT now()` only applies to INSERT). Entries updated via `PUT /api/journal/:key` will keep their original `updated_at`, causing incorrect ordering in the journal list (which sorts by `updated_at DESC`).

**Fix steps:**
1. Change the update call to: `.update({ content, updated_at: new Date().toISOString() })`
2. Optionally add a Supabase `moddatetime` trigger on `journal_entries.updated_at` so this is enforced at the DB level for all future updates.

---

## High

---

### H1 — Expired token not cleared on app load → broken logged-in state

**File:** `frontend/src/App.jsx:184–186`

```js
getCurrentUser()
  .then((u) => setUser(u.user ? u.user : u))
  .catch((err) => console.error('Failed to get user details:', err));
hydrateRemoteSettings().then(...);   // runs regardless
```

If the stored token is expired, the backend returns 401. `apiFetch` throws, the `.catch` logs it — but **the token is not cleared**, `isLoggedIn` remains `true`, and `authToken` stays set. The user sees themselves as logged in, but every API call silently fails.

**Fix steps:**
1. In the `.catch` block, call `handleLogout()` (or at minimum: `localStorage.removeItem('lifedots-auth-token')`, `setAuthToken(null)`, `setIsLoggedIn(false)`).
2. Only call `hydrateRemoteSettings()` after `getCurrentUser()` resolves (chain with `.then`), not in parallel.
3. Apply the same fix to the hash-based auth path at lines 167–175 (the chain there already has a `.catch`, but it doesn't clear state either).

---

### H2 — Birth year `max` attribute is hardcoded to `2025` (already stale)

**File:** `frontend/src/components/Settings.jsx:111`

```jsx
<input type="number" min="1920" max="2025" ...>
```

The current year is 2026. Users born in 2026+ cannot set their birth year. This will become increasingly broken every year.

**Fix steps:**
1. Replace the hardcoded `max="2025"` with `max={new Date().getFullYear()}`.

---

### H3 — `deleteTodo` uses raw `fetch` instead of `apiFetch`

**File:** `frontend/src/utils/api.js:123–136`

Every other API function uses `apiFetch`. `deleteTodo` is a hand-rolled `fetch` call with different header construction and no error body parsing — only `res.ok` is checked. Backend error messages (e.g., 404 "todo not found") are silently discarded.

**Fix steps:**
1. Replace the entire `deleteTodo` implementation with:
   ```js
   export async function deleteTodo(id) {
     return apiFetch(`/api/todos/${encodeURIComponent(id)}`, { method: 'DELETE' });
   }
   ```
2. Note: the backend's `remove` handler returns `204 No Content`, so `apiFetch` will call `res.json()` on an empty body and fail. Either: (a) change the backend to return `200 { success: true }` instead of `204`, or (b) handle the empty body case in `apiFetch` by checking `res.status === 204` before attempting `res.json()`.

---

## Medium

---

### M1 — `/api/journal/all` duplicate route is fragile

**File:** `backend/src/routes/journal.js:9–10`

```js
router.get('/', journalController.list);
router.get('/all', journalController.list);   // ← duplicate, same handler
router.get('/:key', journalController.getByKey);
```

The `/all` route exists only to prevent `/:key` from matching the string `"all"` (since `fetchAllJournals` in the frontend calls `/api/journal/all`). If `/all` were removed, the front end would get journal entries for context key `"all"` instead of all entries.

**Fix steps:**
1. Update `fetchAllJournals` in `api.js:96` to call `/api/journal` (the root route) instead of `/api/journal/all`.
2. Remove the `router.get('/all', ...)` line from the routes file.

---

### M2 — `getUserProfile` in auth service selects unused columns

**File:** `backend/src/services/auth.js:27–28`

```js
.select('id, username, birth_date, expected_lifespan, created_at')
```

The frontend never reads the `profile` sub-object returned from `/api/auth/me`. It calls `hydrateRemoteSettings` separately via `GET /api/settings`. The profile columns fetched here are wasted data transfer; `created_at` is also not in the settings response, making this inconsistent with how the rest of the app reads profile data.

**Fix steps:**
1. Change the select to only fetch what `/api/auth/me` actually needs to return: `'id, username'` (or remove the separate profile fetch entirely and just return `req.user`).
2. Consider whether the `/api/auth/me` `profile` field is needed at all, since `fetchSettings` already loads everything.

---

### M3 — `u.user ? u.user : u` conditional is always false

**File:** `frontend/src/App.jsx:169, 185`

The `/api/auth/me` endpoint returns `{ id, email, profile }` — there is no `.user` property. So `u.user` is always `undefined`, and `setUser` always receives `u`. The true branch is dead code.

**Fix steps:**
1. Replace `setUser(u.user ? u.user : u)` with `setUser(u)` in both locations.

---

### M4 — `isColorActive` `useCallback` has stale editor state

**File:** `frontend/src/components/JournalOverlay.jsx:123, 154–157, 199–205`

```js
const [, forceUpdate] = useState(0);

// In useEditor:
onTransaction: () => { forceUpdate(x => x + 1); },  // re-render on every transaction

// isColorActive is memoized but doesn't update on editor state changes:
const isColorActive = useCallback((colorValue) => {
  return editor.isActive('textStyle', { color: colorValue });
}, [editor]);
```

The TipTap `editor` object reference doesn't change when selection or marks change internally. `isColorActive` would return stale results, so `forceUpdate` is used to force a full re-render on every keystroke/selection change. This re-renders the entire `JournalOverlay` component on every editor event.

**Fix steps:**
1. Remove `const [, forceUpdate]` and the `onTransaction` handler.
2. Remove the `useCallback` wrapping from `isColorActive` and call `editor?.isActive(...)` directly in the JSX (or use a plain function, not memoized).
3. TipTap's `useEditor` internally handles reactivity for `editor.isActive()` when called during render.

---

## Low

---

### L1 — `exchangeAuthCode` is dead code

**File:** `frontend/src/utils/api.js:38–40`

```js
export async function exchangeAuthCode(code) {
  return apiFetch(`/api/auth/callback?code=${encodeURIComponent(code)}`);
}
```

The actual auth flow uses the implicit token from the URL hash (`#access_token=...`) — not PKCE code exchange. `exchangeAuthCode` is exported but never imported or called anywhere in the frontend.

**Fix steps:**
1. Remove `exchangeAuthCode` from `api.js`.
2. If PKCE is intended for the future, document this explicitly. Currently, the implicit flow and the PKCE backend route (`/api/auth/callback`) coexist without connection.

---

### L2 — `updateSettings` uses `.single()` which throws if profile row is missing

**File:** `backend/src/services/settings.js:29–35`

```js
.update(updates).eq('id', userId).select(...).single()
```

If a user has no profile row (e.g., `ensureProfile` failed during auth), `.single()` throws Supabase PGRST116 (no rows found), resulting in a 500 `DatabaseError` with a cryptic message instead of a graceful recovery.

**Fix steps:**
1. Change `.single()` to `.maybeSingle()` and handle the `null` case.
2. If `data` is null, either call `ensureProfile` to create the row and retry, or return a clear error.

---

## Summary Table

| ID | Severity | Description | File |
|----|----------|-------------|------|
| C1 | Critical | `apiFetch()` calls `res.json()` before checking `res.ok` | `api.js:23` |
| C2 | Critical | Double `dot_meta` save on color change | `dotMeta.js:38`, `Settings.jsx:38` |
| C3 | Critical | Clearing journal content never updates backend; old content reappears | `useLocalJournal.js:94` |
| C4 | Critical | Missing UNIQUE constraint allows duplicate journal entries | `services/journal.js:29` |
| C5 | Critical | `updateEntry` doesn't update `updated_at` → wrong list ordering | `services/journal.js:59` |
| H1 | High | Expired token not cleared on app load → broken logged-in state | `App.jsx:184` |
| H2 | High | Birth year `max="2025"` hardcoded — already stale | `Settings.jsx:111` |
| H3 | High | `deleteTodo` uses raw `fetch`, swallows error details | `api.js:123` |
| M1 | Medium | `/api/journal/all` duplicate route fragile against naming | `routes/journal.js:10` |
| M2 | Medium | `getUserProfile` fetches unused columns, inconsistent with settings | `services/auth.js:27` |
| M3 | Medium | `u.user ? u.user : u` is always false — dead conditional | `App.jsx:169, 185` |
| M4 | Medium | `forceUpdate` on every editor transaction causes full re-renders | `JournalOverlay.jsx:154` |
| L1 | Low | `exchangeAuthCode` is never called — dead code | `api.js:38` |
| L2 | Low | `updateSettings` uses `.single()` — throws if profile row missing | `services/settings.js:29` |
