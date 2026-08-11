-- ===========================================================================
-- Migration 1 of 2 — RUN FIRST.
--
-- Adds the Auth.js tables and a NULLABLE user_id on every app table, plus the
-- profile / skipped_days key restructuring done in a way that PRESERVES the
-- existing ownerless rows. Nothing here is destructive.
--
-- Run order:
--   1. THIS FILE                       (0001_auth_and_userid_nullable.sql)
--   2. sign in with Google once        (creates your row in "users")
--   3. MANUAL backfill                 (0002_backfill_userid.sql)
--   4. Migration 2                      (0003_userid_notnull_and_keys.sql)
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

-- --- Per-user columns (all NULLABLE for now) --------------------------------

-- profile: keep the existing singleton row (id = 1) intact; just add user_id.
-- The id column and its default are dropped in migration 2 after backfill.
ALTER TABLE profile ADD COLUMN IF NOT EXISTS user_id text REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE meal_groups ADD COLUMN IF NOT EXISTS user_id text REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS meal_groups_user_id_idx ON meal_groups(user_id);

ALTER TABLE foods ADD COLUMN IF NOT EXISTS user_id text REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS foods_user_id_idx ON foods(user_id);

ALTER TABLE entries ADD COLUMN IF NOT EXISTS user_id text REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS entries_user_id_idx ON entries(user_id);

-- skipped_days: add user_id now; the composite (user_id, entry_date) primary
-- key replaces the entry_date-only key in migration 2 after backfill.
ALTER TABLE skipped_days ADD COLUMN IF NOT EXISTS user_id text REFERENCES users(id) ON DELETE CASCADE;
