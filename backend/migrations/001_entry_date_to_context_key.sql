-- Migration: Rename entry_date → context_key and change type to TEXT
-- Run this in Supabase Dashboard → SQL Editor → New Query → Paste → Run
--
-- INSTRUCTIONS:
-- 1. Open your Supabase project dashboard → click "SQL Editor" in the left sidebar.
-- 2. Click "New Query", paste this entire SQL block, and click "Run".
-- 3. Verify by going to "Table Editor → journal_entries" and confirming the
--    column is now called "context_key" with type "text".

-- Step 1: Drop the old unique constraint (covers common naming conventions)
ALTER TABLE public.journal_entries
  DROP CONSTRAINT IF EXISTS journal_entries_user_id_entry_date_key;

-- Step 2: Rename column and change type from DATE to TEXT
ALTER TABLE public.journal_entries
  RENAME COLUMN entry_date TO context_key;

ALTER TABLE public.journal_entries
  ALTER COLUMN context_key TYPE text USING context_key::text;

-- Step 3: Add new unique constraint for upserts
ALTER TABLE public.journal_entries
  ADD CONSTRAINT journal_entries_user_id_context_key_key UNIQUE (user_id, context_key);
