import dotenv from 'dotenv';
import pg from 'pg';
import { fileURLToPath } from 'node:url';

dotenv.config({
  path: fileURLToPath(new URL('.env', import.meta.url)),
});

const { Pool } = pg;

/**
 * Pool de connexions PostgreSQL partagé par le serveur.
 *
 * Un pool évite d'ouvrir une nouvelle connexion à chaque requête SQL. Il est
 * créé seulement au premier besoin, afin que les tests et la CI puissent
 * importer ce fichier même si DATABASE_URL n'est pas configurée.
 *
 * @type {object | undefined}
 */
export let pool;

/**
 * Lit l'URL de connexion PostgreSQL Supabase depuis les variables
 * d'environnement.
 *
 * @returns {string} URL de connexion PostgreSQL fournie par Supabase.
 * @throws {Error} Si la variable DATABASE_URL n'est pas configurée.
 */
function getDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to connect to Supabase.');
  }

  return process.env.DATABASE_URL;
}

/**
 * Retourne le pool PostgreSQL partagé par le serveur.
 *
 * Si le pool n'existe pas encore, il est créé avec la configuration Supabase.
 *
 * @returns {object} Pool PostgreSQL configuré.
 */
export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: getDatabaseUrl(),
      ssl: {
        rejectUnauthorized: false,
      },
    });
  }

  return pool;
}

/**
 * Exécute une requête SQL avec le pool PostgreSQL partagé.
 *
 * Les paramètres permettent d'éviter de construire des requêtes SQL par
 * concaténation, ce qui réduit le risque d'injection SQL.
 *
 * @param {string} text Requête SQL, avec des placeholders PostgreSQL si besoin.
 * @param {Array<unknown>} [params] Valeurs associées aux placeholders.
 * @returns {Promise<object>} Résultat renvoyé par PostgreSQL.
 */
export const query = (text, params) => getPool().query(text, params);

/**
 * Vérifie que la base de données accepte les requêtes.
 *
 * Cette fonction sert de test d'intégration simple : elle envoie une requête
 * minimale et vérifie que PostgreSQL répond.
 *
 * @returns {Promise<{current_time: Date}>} Date courante renvoyée par la base.
 */
export async function checkDatabaseConnection() {
  const result = await query('select now() as current_time');
  return result.rows[0];
}

/**
 * Ferme le pool PostgreSQL s'il a été créé.
 *
 * Cette fonction est surtout utile dans les tests pour fermer proprement les
 * connexions ouvertes et laisser Node.js terminer le processus.
 *
 * @returns {Promise<void>}
 */
export async function closeDatabaseConnection() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
