import { AUTH_COOKIE_NAME, verifyAuthToken } from './jwt.js';

/**
 * Middleware Express qui protège une route par authentification JWT.
 *
 * Le JWT est lu depuis un cookie httpOnly. En cas de succès, le payload décodé
 * est placé dans req.auth pour que les handlers puissent accéder à l'identifiant
 * utilisateur.
 *
 * @param {object} req Requête Express.
 * @param {object} res Réponse Express.
 * @param {Function} next Callback Express suivant.
 * @returns {void}
 */
export function requireAuth(req, res, next) {
  const token = req.cookies?.[AUTH_COOKIE_NAME];

  if (!token) {
    return res.status(401).json({
      error: 'Authentification requise.',
    });
  }

  try {
    req.auth = verifyAuthToken(token);
    return next();
  } catch {
    return res.status(401).json({
      error: 'Session invalide ou expiree.',
    });
  }
}
