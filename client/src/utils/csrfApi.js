const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:3000';

const CSRF_HEADER_NAME = 'x-csrf-token';
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

let csrfTokenPromise = null;

function isUnsafeRequest(method) {
  return UNSAFE_METHODS.has(String(method || 'GET').toUpperCase());
}

async function fetchCsrfToken() {
  const response = await fetch(`${API_BASE_URL}/api/auth/csrf`, {
    credentials: 'include',
    headers: {
      accept: 'application/json',
    },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.csrfToken) {
    throw new Error('Protection CSRF indisponible.');
  }

  return data.csrfToken;
}

/**
 * Renvoie les en-têtes CSRF requis par les requêtes mutatrices.
 *
 * @param {string} [method='GET'] Méthode HTTP de la requête.
 * @returns {Promise<object>} En-têtes CSRF à fusionner avec la requête.
 */
export async function getCsrfHeaders(method = 'GET') {
  if (!isUnsafeRequest(method)) {
    return {};
  }

  if (!csrfTokenPromise) {
    csrfTokenPromise = fetchCsrfToken().catch((error) => {
      csrfTokenPromise = null;
      throw error;
    });
  }

  return {
    [CSRF_HEADER_NAME]: await csrfTokenPromise,
  };
}
