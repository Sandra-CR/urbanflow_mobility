import dotenv from 'dotenv'
import pg from 'pg'
import { fileURLToPath } from 'node:url'

dotenv.config({
  path: fileURLToPath(new URL('.env', import.meta.url)),
})

const { Pool } = pg

export let pool

function getDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to connect to Supabase.')
  }

  return process.env.DATABASE_URL
}

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: getDatabaseUrl(),
      ssl: {
        rejectUnauthorized: false,
      },
    })
  }

  return pool
}

export const query = (text, params) => getPool().query(text, params)

export async function checkDatabaseConnection() {
  const result = await query('select now() as current_time')
  return result.rows[0]
}

export async function closeDatabaseConnection() {
  if (pool) {
    await pool.end()
    pool = undefined
  }
}
