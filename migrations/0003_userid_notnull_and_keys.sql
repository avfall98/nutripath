-- ===========================================================================
-- Migration 2 of 2 — RUN LAST.
--
-- Run ONLY after migration 1 (0001) AND the manual backfill (0002). This
-- enforces ownership: every user_id becomes NOT NULL and the per-user unique
-- indexes are promoted to primary keys. It will fail (by design) if any row
-- still has a NULL user_id — that means the backfill hasn't been run.
-- ===========================================================================

-- profile: user_id becomes the primary key (replacing the unique index).
ALTER TABLE profile ALTER COLUMN user_id SET NOT NULL;
DROP INDEX IF EXISTS profile_user_id_key;
ALTER TABLE profile ADD PRIMARY KEY (user_id);

ALTER TABLE meal_groups ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE foods ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE entries ALTER COLUMN user_id SET NOT NULL;

-- skipped_days: promote the (user_id, entry_date) unique index to the primary key.
ALTER TABLE skipped_days ALTER COLUMN user_id SET NOT NULL;
DROP INDEX IF EXISTS skipped_days_user_date_key;
ALTER TABLE skipped_days ADD PRIMARY KEY (user_id, entry_date);
