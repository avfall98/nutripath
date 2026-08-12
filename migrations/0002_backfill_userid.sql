-- ===========================================================================
-- MANUAL BACKFILL — RUN THIS YOURSELF, BY HAND.
--
-- When: AFTER migration 1 (0001) AND after you have signed in with Google at
-- least once (so your row exists in "users"), and BEFORE migration 2 (0003).
--
-- Why manual: the existing rows have no owner. This assigns every ownerless
-- row to YOUR user id. Do not automate this — you must paste in your own id.
--
-- NOTE: signing in for the first time auto-seeds an EMPTY profile row and the
-- default meal groups for your new user (see events.createUser in auth.ts).
-- The steps below remove those seeded rows first so the migrated data becomes
-- your real data and the profile primary key won't collide in migration 2.
--
-- Steps:
--   1. Find your user id:
--        SELECT id, email FROM users;
--   2. Replace every <YOUR_USER_ID> below with that id.
--   3. Run this file.
--   4. Verify no NULLs remain (each query below should return 0):
--        SELECT count(*) FROM profile      WHERE user_id IS NULL;
--        SELECT count(*) FROM meal_groups  WHERE user_id IS NULL;
--        SELECT count(*) FROM foods        WHERE user_id IS NULL;
--        SELECT count(*) FROM entries      WHERE user_id IS NULL;
--        SELECT count(*) FROM skipped_days WHERE user_id IS NULL;
-- ===========================================================================

-- profile: drop the auto-seeded empty profile, then adopt the real singleton row.
DELETE FROM profile WHERE user_id = '<YOUR_USER_ID>';
UPDATE profile SET user_id = '<YOUR_USER_ID>' WHERE user_id IS NULL;

-- meal_groups: drop the auto-seeded default groups, then adopt your real ones.
-- (Skip this DELETE if you'd rather keep both the defaults and your old groups.)
DELETE FROM meal_groups WHERE user_id = '<YOUR_USER_ID>';
UPDATE meal_groups SET user_id = '<YOUR_USER_ID>' WHERE user_id IS NULL;

UPDATE foods        SET user_id = '<YOUR_USER_ID>' WHERE user_id IS NULL;
UPDATE entries      SET user_id = '<YOUR_USER_ID>' WHERE user_id IS NULL;
UPDATE skipped_days SET user_id = '<YOUR_USER_ID>' WHERE user_id IS NULL;
