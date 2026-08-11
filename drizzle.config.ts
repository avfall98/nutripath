import type { Config } from "drizzle-kit"

// Target APP_DATABASE_URL first — the Neon integration owns/overwrites
// DATABASE_URL, so migrations must run against the same database the app reads.
const url =
  process.env.APP_DATABASE_URL ??
  process.env.DATABASE_URL ??
  process.env.NEON_DATABASE_URL ??
  ""

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
} satisfies Config
