import dotenv from 'dotenv'
import pg from 'pg'
import { fileURLToPath } from 'node:url'

dotenv.config({
  path: fileURLToPath(new URL('.env', import.meta.url)),
})

const { Pool } = pg

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to connect to Supabase.')
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})

export const query = (text, params) => pool.query(text, params)

export async function checkDatabaseConnection() {
  const result = await query('select now() as current_time')
  return result.rows[0]
}

export async function closeDatabaseConnection() {
  await pool.end()
}
