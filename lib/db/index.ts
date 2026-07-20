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

const connectionString =
  clean(process.env.DATABASE_URL) ?? clean(process.env.NEON_DATABASE_URL)

if (!connectionString) {
  throw new Error(
    "No database connection string found. Set DATABASE_URL or NEON_DATABASE_URL.",
  )
}

export const pool = globalForDb.pool ?? new Pool({ connectionString })

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool

export const db = drizzle(pool, { schema })
