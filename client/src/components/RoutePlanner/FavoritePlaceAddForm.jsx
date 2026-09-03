/**
 * Formulaire d'ajout d'une préférence persistée.
 *
 * Le composant reçoit `PlaceSearchField` et `PlaceSuggestions` depuis
 * `RoutePlanner` pour réutiliser exactement la même recherche de lieux que les
 * champs départ/arrivée.
 *
 * @param {object} props Propriétés du formulaire.
 * @param {object} props.config Configuration de catégorie active.
 * @param {string} props.favoriteName Nom personnalisé saisi.
 * @param {object | null} props.favoritePlace Lieu sélectionné.
 * @param {string} props.favoriteSearchId Identifiant du champ de recherche.
 * @param {number} props.favoriteSearchSyncKey Clé de resynchronisation.
 * @param {object | null} props.favoriteSuggestions Suggestions actives.
 * @param {boolean} props.isSavingFavorite État de sauvegarde.
 * @param {string} props.message Message d'erreur éventuel.
 * @param {string} props.nameId Identifiant du champ nom.
 * @param {Function} props.PlaceSearchField Champ de recherche de lieu.
 * @param {Function} props.PlaceSuggestions Liste de suggestions.
 * @returns {JSX.Element} Formulaire d'ajout.
 */
export default function FavoritePlaceAddForm({
  config,
  favoriteName,
  favoritePlace,
  favoriteSearchId,
  favoriteSearchSyncKey,
  favoriteSuggestions,
  isSavingFavorite,
  message,
  nameId,
  PlaceSearchField,
  PlaceSuggestions,
  onFavoriteNameChange,
  onFavoritePlaceChange,
  onSearchPlaces,
  onSuggestionsChange,
  onSubmit,
}) {
  const usesCustomName = config?.usesCustomName !== false;
  const canDisplaySubmit =
    Boolean(config) &&
    (!usesCustomName || favoriteName.trim().length > 0) &&
    Boolean(favoritePlace?.id);

  return (
    <div className="route-favorite-add">
      {usesCustomName ? (
        <label className="route-field" htmlFor={nameId}>
          <div className="route-field__input">
            <span className="route-field__tag">Nom</span>
            <input
              id={nameId}
              type="text"
              value={favoriteName}
              placeholder="Nom du favori"
              maxLength={100}
              autoComplete="off"
              aria-label="Nom"
              onChange={(event) => onFavoriteNameChange(event.target.value)}
            />
          </div>
        </label>
      ) : null}

      <PlaceSearchField
        id={favoriteSearchId}
        label="Lieu"
        placeholder="Rechercher un arrêt ou une adresse..."
        selectedPlace={favoritePlace}
        excludedRecentPlace={null}
        syncKey={favoriteSearchSyncKey}
        syncedQuery={favoritePlace?.label || ''}
        showInlineLabel
        showRecentSearches={false}
        recentPlaces={[]}
        inputRef={null}
        onPlaceChange={onFavoritePlaceChange}
        onSearchPlaces={onSearchPlaces}
        onSuggestionsChange={onSuggestionsChange}
        onRecentPlacesChange={null}
      />

      <PlaceSuggestions suggestions={favoriteSuggestions} />

      {message ? (
        <div
          className="route-planner__message"
          role="status"
          aria-live="polite"
        >
          {message}
        </div>
      ) : null}

      {canDisplaySubmit ? (
        <button
          className="btn-primary route-favorite-add__submit"
          type="button"
          disabled={isSavingFavorite}
          onClick={onSubmit}
        >
          {isSavingFavorite
            ? 'Enregistrement...'
            : config?.submitLabel || 'Ajouter'}
        </button>
      ) : null}
    </div>
  );
}
