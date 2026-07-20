import { test } from 'node:test'
import assert from 'node:assert'
import { checkDatabaseConnection, closeDatabaseConnection } from '../db.js'

const shouldRunDatabaseTests =
  process.env.RUN_DB_TESTS === 'true' && Boolean(process.env.DATABASE_URL)

test(
  'Test de connexion a la base de donnees',
  {
    skip: shouldRunDatabaseTests
      ? false
      : 'Set RUN_DB_TESTS=true and DATABASE_URL to run database integration tests',
  },
  async () => {
    try {
      const result = await checkDatabaseConnection()
      assert.ok(result, 'La base de donnees aurait du renvoyer un resultat')
      assert.ok(result.current_time, 'Le resultat devrait contenir une date')
    } catch (error) {
      assert.fail(`La connexion a la base de donnees a echoue: ${error.message}`)
    } finally {
      await closeDatabaseConnection()
    }
  },
)
