import crypto from 'node:crypto';
import { getAuthCookieOptions } from './jwt.js';

export const CSRF_COOKIE_NAME = 'urbanflow_csrf';
export const CSRF_HEADER_NAME = 'x-csrf-token';

const CSRF_TOKEN_BYTES = 32;

function getCsrfSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required for CSRF protection.');
  }

  return process.env.JWT_SECRET;
}

function signCsrfNonce(nonce) {
  return crypto
    .createHmac('sha256', getCsrfSecret())
    .update(nonce)
    .digest('hex');
}

function timingSafeEqual(firstValue, secondValue) {
  const firstBuffer = Buffer.from(String(firstValue || ''));
  const secondBuffer = Buffer.from(String(secondValue || ''));

  return (
    firstBuffer.length === secondBuffer.length &&
    crypto.timingSafeEqual(firstBuffer, secondBuffer)
  );
}

/**
 * Génère un jeton CSRF aléatoire.
 *
 * @returns {string} Jeton CSRF encodé en hexadécimal.
 */
export function createCsrfToken() {
  const nonce = crypto.randomBytes(CSRF_TOKEN_BYTES).toString('hex');
  return `${nonce}.${signCsrfNonce(nonce)}`;
}

function isValidCsrfToken(token) {
  const [nonce, signature, extraPart] = String(token || '').split('.');

  if (!nonce || !signature || extraPart) {
    return false;
  }

  return timingSafeEqual(signature, signCsrfNonce(nonce));
}

/**
 * Construit les options du cookie CSRF.
 *
 * Le cookie doit rester lisible par le client afin d'appliquer la stratégie
 * double-submit : le navigateur envoie le cookie, et le client renvoie la même
 * valeur dans un en-tête HTTP dédié.
 *
 * @returns {object} Options compatibles avec res.cookie().
 */
export function getCsrfCookieOptions() {
  return {
    ...getAuthCookieOptions(),
    httpOnly: false,
  };
}

/**
 * Pose un nouveau jeton CSRF et le renvoie au client.
 *
 * @param {object} res Réponse Express.
 * @returns {string} Jeton CSRF créé.
 */
export function setCsrfCookie(res) {
  const token = createCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, token, getCsrfCookieOptions());
  return token;
}

/**
 * Vérifie le jeton CSRF sur les requêtes HTTP mutatrices.
 *
 * @param {object} req Requête Express.
 * @param {object} res Réponse Express.
 * @param {Function} next Callback Express suivant.
 * @returns {void}
 */
export function requireCsrfProtection(req, res, next) {
  const csrfCookie = req.cookies?.[CSRF_COOKIE_NAME];
  const csrfHeader = req.get(CSRF_HEADER_NAME);

  if (
    !csrfCookie ||
    !csrfHeader ||
    !isValidCsrfToken(csrfCookie) ||
    !timingSafeEqual(csrfCookie, csrfHeader)
  ) {
    return res.status(403).json({
      error: 'Protection CSRF invalide.',
    });
  }

  return next();
}
