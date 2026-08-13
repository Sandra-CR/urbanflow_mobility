/**
 * Normalise un libellé de lieu pour comparer les saisies récentes.
 *
 * @param {string} label Libellé brut.
 * @returns {string} Libellé comparable.
 */
export function normalizePlaceLabel(label) {
  return String(label || '')
    .trim()
    .toLowerCase();
}

/**
 * Compare deux lieux sans dépendre exclusivement d'un identifiant IDFM.
 *
 * Les recherches récentes peuvent être stockées comme simples libellés tant que
 * l'utilisateur n'a pas sélectionné un résultat complet.
 *
 * @param {object | null} firstPlace Premier lieu.
 * @param {object | null} secondPlace Second lieu.
 * @returns {boolean} `true` si les lieux désignent probablement le même endroit.
 */
export function isSamePlace(firstPlace, secondPlace) {
  if (!firstPlace || !secondPlace) {
    return false;
  }

  if (firstPlace.id && secondPlace.id) {
    return firstPlace.id === secondPlace.id;
  }

  return (
    normalizePlaceLabel(firstPlace.label) ===
    normalizePlaceLabel(secondPlace.label)
  );
}

/**
 * Indique si une recherche récente contient déjà un lieu exploitable.
 *
 * @param {object} place Lieu récent ou placeholder.
 * @returns {boolean} `true` si aucune résolution par recherche n'est nécessaire.
 */
export function isResolvedRecentPlace(place) {
  return Boolean(
    place?.id && place.type !== 'recent' && !place.isRecentPlaceholder
  );
}

/**
 * Convertit une recherche récente en suggestion affichable.
 *
 * @param {object} place Recherche récente stockée.
 * @returns {object} Suggestion compatible avec `PlaceSuggestions`.
 */
export function toRecentSuggestion(place) {
  return {
    ...place,
    id: place.id || `recent-${place.label}`,
    isRecent: true,
    isRecentPlaceholder: !place.id || place.type === 'recent',
  };
}

/**
 * Prépare les recherches récentes pour un panneau ou un champ de recherche.
 *
 * @param {Array<object>} recentPlaces Recherches récentes.
 * @param {object | null} excludedPlace Lieu déjà choisi dans l'autre champ.
 * @returns {Array<object>} Suggestions récentes filtrées.
 */
export function getRecentSuggestions(recentPlaces, excludedPlace) {
  return recentPlaces
    .filter((place) => !isSamePlace(place, excludedPlace))
    .map(toRecentSuggestion);
}
