CREATE TABLE IF NOT EXISTS skipped_days (
  entry_date date PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
