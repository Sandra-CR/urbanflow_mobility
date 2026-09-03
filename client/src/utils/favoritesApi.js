import { getCsrfHeaders } from './csrfApi';

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:3000';

/**
 * Exécute une requête authentifiée vers l'API favoris.
 *
 * @param {string} path Chemin API commencant par `/api/favorites`.
 * @param {RequestInit} [options] Options fetch supplémentaires.
 * @returns {Promise<object>} Corps JSON renvoyé par le serveur.
 * @throws {Error} Erreur lisible par l'interface.
 */
async function requestFavorites(path, options = {}) {
  let response;
  const csrfHeaders = await getCsrfHeaders(options.method);

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        ...csrfHeaders,
        ...options.headers,
      },
    });
  } catch (fetchError) {
    const error = new Error(
      'Impossible de joindre le serveur UrbanFlow Mobility.'
    );
    error.cause = fetchError;
    throw error;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || 'Erreur favoris.');
    error.status = response.status;
    throw error;
  }

  return data;
}

/**
 * Harmonise les favoris renvoyés par l'API.
 *
 * `label` est le nom personnalisé affiché dans la liste. `placeLabel` est le
 * vrai arrêt/adresse à injecter dans un champ d'itinéraire. `stationId` est
 * conservé séparément pour les arrêts, car IDF Mobilités en a besoin pour les
 * trajets transports.
 *
 * @param {object | null} place Favori brut.
 * @returns {object | null} Favori normalisé.
 */
function normalizeFavoritePlace(place) {
  if (
    !place ||
    place.stationId ||
    place.type === 'address' ||
    String(place.id || '').startsWith('favorite:')
  ) {
    return place;
  }

  return {
    ...place,
    stationId: place.id,
  };
}

/**
 * Charge les lieux favoris de l'utilisateur connecté pour une catégorie.
 *
 * @param {'favorite' | 'home' | 'work'} category Catégorie demandée.
 * @returns {Promise<{places: Array<object>}>} Lieux au format attendu par RoutePlanner.
 */
export function getFavoritePlaces(category) {
  const params = new URLSearchParams({
    category,
  });

  return requestFavorites(`/api/favorites?${params.toString()}`).then(
    (data) => ({
      ...data,
      places: (data.places || []).map(normalizeFavoritePlace),
    })
  );
}

/**
 * Enregistre un lieu dans une catégorie de favoris.
 *
 * @param {object} params Paramètres d'enregistrement.
 * @param {'favorite' | 'home' | 'work'} params.category Catégorie cible.
 * @param {object} params.place Lieu normalisé IDFM ou adresse.
 * @returns {Promise<{place: object}>} Favori créé au format lieu.
 */
export function saveFavoritePlace({ category, place }) {
  return requestFavorites('/api/favorites', {
    method: 'POST',
    body: JSON.stringify({
      category,
      label: place.label || place.name,
      placeLabel: place.placeLabel || place.name || place.label,
      stationId: place.type === 'address' ? null : place.stationId || place.id,
      coordinates: place.coordinates || null,
    }),
  }).then((data) => ({
    ...data,
    place: normalizeFavoritePlace(data.place),
  }));
}

/**
 * Supprime un favori de l'utilisateur connecté.
 *
 * @param {string} favoriteId Identifiant interne du favori.
 * @returns {Promise<object | null>} Réponse vide en cas de succès.
 */
export function deleteFavoritePlace(favoriteId) {
  return requestFavorites(`/api/favorites/${encodeURIComponent(favoriteId)}`, {
    method: 'DELETE',
  });
}
