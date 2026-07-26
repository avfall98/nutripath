import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'

const connectionString = process.env.APP_DATABASE_URL || process.env.DATABASE_URL || process.env.NEON_DATABASE_URL

if (!connectionString) {
  console.error('No database connection string found. Set APP_DATABASE_URL, DATABASE_URL, or NEON_DATABASE_URL.')
  process.exit(1)
}

const pool = new Pool({ connectionString })

async function runMigration() {
  const client = await pool.connect()
  try {
    const sql = fs.readFileSync(path.join(process.cwd(), 'migrations/add_servings_pack.sql'), 'utf-8')
    console.log('Running migration: add_servings_pack.sql')
    await client.query(sql)
    console.log('✓ Migration completed successfully')
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('✓ Column already exists, skipping migration')
    } else {
      console.error('✗ Migration failed:', error.message)
      throw error
    }
  } finally {
    client.release()
    await pool.end()
  }
}

runMigration().catch((err) => {
  console.error(err)
  process.exit(1)
})
