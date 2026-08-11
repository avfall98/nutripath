-- ===========================================================================
-- Migration 2 of 2 — RUN LAST.
--
-- Run ONLY after migration 1 (0001) AND the manual backfill (0002). This
-- enforces ownership: every user_id becomes NOT NULL and the final primary
-- keys are applied. It will fail (by design) if any row still has a NULL
-- user_id — that means the backfill hasn't been run.
-- ===========================================================================

-- profile: user_id becomes the primary key; drop the legacy singleton id column.
ALTER TABLE profile ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE profile DROP CONSTRAINT IF EXISTS profile_pkey;
ALTER TABLE profile ADD PRIMARY KEY (user_id);
ALTER TABLE profile DROP COLUMN IF EXISTS id;

ALTER TABLE meal_groups ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE foods ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE entries ALTER COLUMN user_id SET NOT NULL;

-- skipped_days: replace the entry_date-only key with a composite (user_id, entry_date).
ALTER TABLE skipped_days ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE skipped_days DROP CONSTRAINT IF EXISTS skipped_days_pkey;
ALTER TABLE skipped_days ADD PRIMARY KEY (user_id, entry_date);
