import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const sql = `
CREATE TABLE IF NOT EXISTS profile (
  id integer PRIMARY KEY DEFAULT 1,
  age integer,
  sex text,
  height_cm numeric,
  weight_kg numeric,
  target_weight_kg numeric,
  target_calories integer,
  target_protein integer,
  activity_level text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meal_groups (
  id serial PRIMARY KEY,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS foods (
  id serial PRIMARY KEY,
  name text NOT NULL,
  brand text,
  serving_size text,
  calories numeric NOT NULL DEFAULT 0,
  protein numeric NOT NULL DEFAULT 0,
  carbs numeric,
  fat numeric,
  saturated_fat numeric,
  sugars numeric,
  dietary_fiber numeric,
  sodium numeric,
  calories_per_hundred numeric,
  protein_per_hundred numeric,
  carbs_per_hundred numeric,
  fat_per_hundred numeric,
  saturated_fat_per_hundred numeric,
  sugars_per_hundred numeric,
  dietary_fiber_per_hundred numeric,
  sodium_per_hundred numeric,
  image_url text,
  info_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entries (
  id serial PRIMARY KEY,
  entry_date date NOT NULL,
  meal_group_id integer,
  meal_group_name text NOT NULL,
  food_id integer,
  name text NOT NULL,
  calories numeric NOT NULL DEFAULT 0,
  protein numeric NOT NULL DEFAULT 0,
  carbs numeric,
  fat numeric,
  quantity numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
`

try {
  await pool.query(sql)
  console.log("[v0] Tables created successfully")
} catch (err) {
  console.error("[v0] Error creating tables:", err)
  process.exitCode = 1
} finally {
  await pool.end()
}
