import jwt from 'jsonwebtoken';

/**
 * Nom du cookie HTTP qui transporte le JWT d'authentification.
 *
 * Le cookie est configuré en httpOnly afin d'éviter l'accès depuis JavaScript
 * côté client.
 *
 * @type {string}
 */
export const AUTH_COOKIE_NAME = 'urbanflow_auth';

/**
 * Durée de vie par défaut du cookie en millisecondes.
 *
 * La durée d'expiration réelle du JWT est pilotée par JWT_EXPIRES_IN.
 *
 * @type {number}
 */
const DEFAULT_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Lit le secret de signature JWT depuis l'environnement.
 *
 * @returns {string} Secret JWT configuré.
 * @throws {Error} Si JWT_SECRET n'est pas défini.
 */
function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required for authentication.');
  }

  return process.env.JWT_SECRET;
}

/**
 * Génère un JWT d'authentification pour un utilisateur.
 *
 * Le token contient uniquement l'identifiant et l'email nécessaires à la
 * session.
 *
 * @param {{id: string | number, email: string}} user Utilisateur authentifié.
 * @returns {string} JWT signé.
 */
export function signAuthToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
    },
    getJwtSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: 'urbanflow-mobility-api',
      audience: 'urbanflow-mobility-pwa',
    }
  );
}

/**
 * Vérifie un JWT reçu depuis le cookie d'authentification.
 *
 * @param {string} token JWT à vérifier.
 * @returns {object} Payload décodé si le token est valide.
 * @throws {Error} Si le token est absent, expiré ou invalide.
 */
export function verifyAuthToken(token) {
  return jwt.verify(token, getJwtSecret(), {
    issuer: 'urbanflow-mobility-api',
    audience: 'urbanflow-mobility-pwa',
  });
}

/**
 * Construit les options du cookie d'authentification.
 *
 * En production, Vercel et Render sont sur deux domaines différents.
 * `SameSite=None` permet donc aux appels `credentials: include` d'envoyer le
 * cookie vers l'API.
 *
 * @returns {object} Options compatibles avec res.cookie().
 */
export function getAuthCookieOptions() {
  const usesHttpsClient = String(process.env.CLIENT_ORIGIN || '')
    .split(',')
    .some((origin) => origin.trim().startsWith('https://'));
  const isSecureContext =
    process.env.NODE_ENV === 'production' || usesHttpsClient;

  return {
    httpOnly: true,
    secure: isSecureContext,
    sameSite: isSecureContext ? 'none' : 'strict',
    maxAge: DEFAULT_TOKEN_MAX_AGE_MS,
    path: '/',
  };
}

/**
 * Supprime le cookie d'authentification dans la réponse HTTP.
 *
 * @param {object} res Réponse Express.
 * @returns {void}
 */
export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    ...getAuthCookieOptions(),
    maxAge: undefined,
  });
}
