import { Pool } from "pg"
import fs from "fs"
import path from "path"

// Generic SQL runner: `node scripts/run-sql.mjs migrations/0001_....sql`
// Targets APP_DATABASE_URL first so it hits the same database the app reads.
const file = process.argv[2]
if (!file) {
  console.error("Usage: node scripts/run-sql.mjs <path-to-sql-file>")
  process.exit(1)
}

const connectionString =
  process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL

if (!connectionString) {
  console.error("No database connection string found. Set APP_DATABASE_URL, DATABASE_URL, or NEON_DATABASE_URL.")
  process.exit(1)
}

const pool = new Pool({ connectionString })

try {
  const sql = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8")
  console.log(`[v0] Running ${file}`)
  await pool.query(sql)
  console.log("[v0] ✓ Done")
} catch (err) {
  console.error("[v0] ✗ Failed:", err.message)
  process.exitCode = 1
} finally {
  await pool.end()
}
