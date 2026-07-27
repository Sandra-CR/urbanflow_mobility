/**
 * Normalise une adresse email avant comparaison ou stockage.
 *
 * Cela évite de créer plusieurs comptes pour une même adresse avec
 * des différences de casse ou des espaces accidentels.
 *
 * @param {unknown} email Valeur reçue depuis la requête HTTP.
 * @returns {string} Email sans espaces externes et en minuscules.
 */
export function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

/**
 * Vérifie le format minimal d'une adresse email.
 *
 * Cette validation reste volontairement simple (la contrainte d'unicité et la
 * persistance sont gérées par PostgreSQL).
 *
 * @param {string} email Email normalisé à valider.
 * @returns {boolean} true si le format ressemble à une adresse email.
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Vérifie que le mot de passe respecte la politique de robustesse applicative.
 *
 * La règle impose une longueur minimale, plusieurs types de caractères et
 * refuse les espaces afin de réduire les erreurs de saisie difficiles à repérer.
 *
 * @param {unknown} password Mot de passe reçu depuis la requête HTTP.
 * @returns {{isValid: boolean, errors: string[]}} Résultat de validation.
 */
export function validateStrongPassword(password) {
  const value = String(password || '');
  const errors = [];

  if (value.length < 12) {
    errors.push('Le mot de passe doit contenir au moins 12 caractères.');
  }

  if (!/[a-z]/.test(value)) {
    errors.push('Le mot de passe doit contenir au moins une minuscule.');
  }

  if (!/[A-Z]/.test(value)) {
    errors.push('Le mot de passe doit contenir au moins une majuscule.');
  }

  if (!/\d/.test(value)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre.');
  }

  if (!/[^A-Za-z0-9\s]/.test(value)) {
    errors.push('Le mot de passe doit contenir au moins un caractère spécial.');
  }

  if (/\s/.test(value)) {
    errors.push("Le mot de passe ne doit pas contenir d'espace.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
