-- ===========================================================================
-- Migration 1 of 2 — RUN FIRST.
--
-- Adds the Auth.js tables and a NULLABLE user_id on every app table, and
-- relaxes the singleton/date-only keys on profile and skipped_days so that
-- MULTIPLE users can coexist immediately (during the transition window, before
-- the final NOT NULL constraints are applied). Nothing here deletes user data.
--
-- This file is idempotent — it is safe to run more than once.
--
-- Run order:
--   1. THIS FILE                       (0001_auth_and_userid_nullable.sql)
--   2. sign in with Google once        (creates your row in "users")
--   3. MANUAL backfill                 (0002_backfill_userid.sql)
--   4. Migration 2                     (0003_userid_notnull_and_keys.sql)
-- ===========================================================================

-- --- Auth.js tables --------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  name text,
  email text NOT NULL,
  email_verified timestamptz,
  image text
);

CREATE TABLE IF NOT EXISTS accounts (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  provider text NOT NULL,
  provider_account_id text NOT NULL,
  refresh_token text,
  access_token text,
  expires_at integer,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  PRIMARY KEY (provider, provider_account_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  session_token text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier text NOT NULL,
  token text NOT NULL,
  expires timestamptz NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- --- profile ---------------------------------------------------------------
-- Was a singleton (id = 1). Relax it now so every user can own a profile:
-- drop the singleton CHECK + id primary key, drop the meaningless id column,
-- and key profiles by user_id via a unique index (nullable during the window,
-- so the one ownerless legacy row is still allowed until backfill).
ALTER TABLE profile ADD COLUMN IF NOT EXISTS user_id text REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE profile DROP CONSTRAINT IF EXISTS profile_singleton;
ALTER TABLE profile DROP CONSTRAINT IF EXISTS profile_pkey;
ALTER TABLE profile ALTER COLUMN id DROP DEFAULT;
ALTER TABLE profile DROP COLUMN IF EXISTS id;
CREATE UNIQUE INDEX IF NOT EXISTS profile_user_id_key ON profile(user_id);

-- --- meal_groups / foods / entries -----------------------------------------
-- These already key on a serial id, so multiple users coexist fine; just add
-- the (nullable for now) user_id and an index for per-user filtering.
ALTER TABLE meal_groups ADD COLUMN IF NOT EXISTS user_id text REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS meal_groups_user_id_idx ON meal_groups(user_id);

ALTER TABLE foods ADD COLUMN IF NOT EXISTS user_id text REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS foods_user_id_idx ON foods(user_id);

ALTER TABLE entries ADD COLUMN IF NOT EXISTS user_id text REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS entries_user_id_idx ON entries(user_id);

-- --- skipped_days ----------------------------------------------------------
-- Was keyed on entry_date alone, which would stop two users skipping the same
-- date. Replace it with a per-user unique index on (user_id, entry_date). The
-- final composite PRIMARY KEY is applied in migration 2 after backfill.
ALTER TABLE skipped_days ADD COLUMN IF NOT EXISTS user_id text REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE skipped_days DROP CONSTRAINT IF EXISTS skipped_days_pkey;
CREATE UNIQUE INDEX IF NOT EXISTS skipped_days_user_date_key ON skipped_days(user_id, entry_date);
