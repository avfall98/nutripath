import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

const globalForDb = globalThis as unknown as { pool?: Pool }

// Prefer DATABASE_URL, but ignore empty/whitespace values so we correctly
// fall back to the Neon-provided NEON_DATABASE_URL instead of silently
// defaulting to localhost:5432 (which throws ECONNREFUSED).
const clean = (v?: string) => {
  const t = v?.trim()
  return t ? t : undefined
}

// Prefer APP_DATABASE_URL so we can point at a specific Neon database that is
// not managed (and periodically overwritten) by the Neon integration, which
// owns DATABASE_URL / POSTGRES_URL / NEON_DATABASE_URL.
const connectionString =
  clean(process.env.APP_DATABASE_URL) ??
  clean(process.env.DATABASE_URL) ??
  clean(process.env.NEON_DATABASE_URL)

if (!connectionString) {
  throw new Error(
    "No database connection string found. Set APP_DATABASE_URL, DATABASE_URL, or NEON_DATABASE_URL.",
  )
}

export const pool = globalForDb.pool ?? new Pool({ connectionString })

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool

export const db = drizzle(pool, { schema })
