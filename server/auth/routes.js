import express from 'express';
import bcrypt from 'bcryptjs';
import { query as defaultQuery } from '../db.js';
import { requireAuth } from './middleware.js';
import {
  AUTH_COOKIE_NAME,
  clearAuthCookie,
  getAuthCookieOptions,
  signAuthToken,
} from './jwt.js';
import {
  isValidEmail,
  normalizeEmail,
  validateStrongPassword,
} from './passwordPolicy.js';

/**
 * Nombre de tours utilisés par Bcrypt pour hacher les mots de passe.
 *
 * @type {number}
 */
const PASSWORD_SALT_ROUNDS = 12;

/**
 * Convertit une ligne SQL utilisateur en objet public exposable à l'API.
 *
 * @param {object} row Ligne renvoyée par PostgreSQL.
 * @returns {{id: string | number, email: string, createdAt: Date}} Utilisateur public.
 */
function toPublicUser(row) {
  return {
    id: row.id,
    email: row.email,
    createdAt: row.created_at,
  };
}

/**
 * Signe un JWT et l'attache à la réponse sous forme de cookie sécurisé.
 *
 * @param {object} res Réponse Express.
 * @param {{id: string | number, email: string}} user Utilisateur authentifié.
 * @returns {void}
 */
function setAuthCookie(res, user) {
  const token = signAuthToken(user);
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
}

/**
 * Détermine si une erreur PostgreSQL correspond à une violation d'unicité email.
 *
 * @param {object} error Erreur PostgreSQL potentielle.
 * @returns {boolean} true si l'erreur concerne l'unicité de l'email.
 */
function isUniqueEmailViolation(error) {
  return (
    error?.code === '23505' && String(error.constraint || '').includes('email')
  );
}

/**
 * Crée le routeur Express dédié à l'authentification.
 *
 * Les routes exposées sont :
 * - POST /register : création de compte et ouverture de session.
 * - POST /login : ouverture de session.
 * - POST /logout : fermeture de session.
 * - GET /me : lecture du compte connecté.
 * - DELETE /me : suppression du compte connecté.
 *
 * @param {object} [options] Dépendances injectables.
 * @param {Function} [options.query] Fonction de requête SQL.
 * @returns {object} Routeur Express configuré.
 */
export function createAuthRouter({ query = defaultQuery } = {}) {
  const router = express.Router();

  router.post('/register', async (req, res, next) => {
    try {
      const email = normalizeEmail(req.body?.email);
      const password = req.body?.password;

      if (!isValidEmail(email)) {
        return res.status(400).json({
          error: 'Email invalide.',
        });
      }

      const passwordValidation = validateStrongPassword(password);

      if (!passwordValidation.isValid) {
        return res.status(400).json({
          error: 'Mot de passe trop faible.',
          details: passwordValidation.errors,
        });
      }

      const existingUser = await query(
        'select id from users where email = $1',
        [email]
      );

      if (existingUser.rowCount > 0) {
        return res.status(409).json({
          error: 'Un compte existe déjà avec cet email.',
        });
      }

      const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
      const result = await query(
        `insert into users (email, password_hash)
         values ($1, $2)
         returning id, email, created_at`,
        [email, passwordHash]
      );
      const user = toPublicUser(result.rows[0]);

      setAuthCookie(res, user);

      return res.status(201).json({
        user,
      });
    } catch (error) {
      if (isUniqueEmailViolation(error)) {
        return res.status(409).json({
          error: 'Un compte existe déjà avec cet email.',
        });
      }

      return next(error);
    }
  });

  router.post('/login', async (req, res, next) => {
    try {
      const email = normalizeEmail(req.body?.email);
      const password = String(req.body?.password || '');

      if (!isValidEmail(email) || !password) {
        return res.status(400).json({
          error: 'Email ou mot de passe invalide.',
        });
      }

      const result = await query(
        `select id, email, password_hash, created_at
         from users
         where email = $1`,
        [email]
      );
      const userRow = result.rows[0];

      if (!userRow) {
        return res.status(401).json({
          error: 'Identifiants invalides.',
        });
      }

      const passwordMatches = await bcrypt.compare(
        password,
        userRow.password_hash
      );

      if (!passwordMatches) {
        return res.status(401).json({
          error: 'Identifiants invalides.',
        });
      }

      const user = toPublicUser(userRow);
      setAuthCookie(res, user);

      return res.json({
        user,
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/logout', (req, res) => {
    clearAuthCookie(res);
    return res.status(204).send();
  });

  router.get('/me', requireAuth, async (req, res, next) => {
    try {
      const result = await query(
        `select id, email, created_at
         from users
         where id = $1`,
        [req.auth.sub]
      );

      if (!result.rows[0]) {
        clearAuthCookie(res);
        return res.status(401).json({
          error: 'Session invalide.',
        });
      }

      return res.json({
        user: toPublicUser(result.rows[0]),
      });
    } catch (error) {
      return next(error);
    }
  });

  router.delete('/me', requireAuth, async (req, res, next) => {
    try {
      await query('delete from users where id = $1', [req.auth.sub]);
      clearAuthCookie(res);
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
