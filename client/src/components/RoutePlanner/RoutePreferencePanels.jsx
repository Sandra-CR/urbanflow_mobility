import { Clock, Plus } from '@phosphor-icons/react';
import RoutePreferencePlaceButton from './RoutePreferencePlaceButton';

function isUserLocationPlace(place) {
  return Boolean(place?.isUserLocation);
}

function CurrentLocationIcon() {
  return (
    <span
      className="route-suggestion__current-location-marker"
      aria-hidden="true"
    />
  );
}

/**
 * Affiche les lieux recemment recherches.
 *
 * @param {object} props Proprietes du panneau.
 * @param {Array<object>} props.places Lieux recents prepares.
 * @param {Function} props.onPlaceSelect Fonction de selection.
 * @returns {JSX.Element} Panneau des recents.
 */
export function RecentPlacesPanel({ places, onPlaceSelect }) {
  if (places.length === 0) {
    return (
      <div className="route-preference-panel route-preference-panel--center">
        <p>Aucun lieu recent.</p>
      </div>
    );
  }

  return (
    <div className="route-preference-panel">
      <div className="route-suggestions" role="listbox">
        {places.map((place) => (
          <RoutePreferencePlaceButton
            key={place.id}
            Icon={Clock}
            icon={isUserLocationPlace(place) ? <CurrentLocationIcon /> : null}
            place={place}
            secondaryLabel={
              place.secondaryLabel ||
              place.city ||
              (place.isRecentPlaceholder ? null : place.type)
            }
            onSelect={onPlaceSelect}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Affiche une categorie persistee : favoris, domicile ou travail.
 *
 * @param {object} props Proprietes du panneau.
 * @param {object} props.config Configuration de la categorie.
 * @param {object | null} props.currentUser Utilisateur connecte.
 * @param {Array<object>} props.favoritePlaces Lieux enregistres.
 * @param {string} props.favoriteMessage Message d'erreur eventuel.
 * @param {boolean} props.isLoadingFavorites Etat de chargement.
 * @param {object | null} props.preferredPlace Lieu prioritaire a afficher en tete.
 * @param {Function} props.onAddClick Ouverture du formulaire d'ajout.
 * @param {Function} props.onDeletePlace Suppression d'un lieu.
 * @param {Function} props.onLoginClick Ouverture de la connexion.
 * @param {Function} props.onPlaceSelect Selection d'un lieu.
 * @returns {JSX.Element | null} Panneau de categorie.
 */
export function FavoritePlacesPanel({
  config,
  currentUser,
  favoritePlaces,
  favoriteMessage,
  isLoadingFavorites,
  preferredPlace,
  onAddClick,
  onDeletePlace,
  onLoginClick,
  onPlaceSelect,
}) {
  if (!config) {
    return null;
  }

  const CategoryIcon = config.Icon;
  const preferredPlaceEntry = preferredPlace ? (
    <div className="route-suggestions" role="listbox">
      <RoutePreferencePlaceButton
        key={preferredPlace.id}
        Icon={CategoryIcon}
        icon={<CurrentLocationIcon />}
        place={preferredPlace}
        secondaryLabel={preferredPlace.secondaryLabel}
        onSelect={onPlaceSelect}
      />
    </div>
  ) : null;

  if (!currentUser) {
    return (
      <div className="route-preference-panel">
        {preferredPlaceEntry}
        <div className="route-preference-panel__center">
          <p>Vous devez vous connecter pour acceder a {config.loginLabel}</p>
          <button className="btn-primary" type="button" onClick={onLoginClick}>
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  const addButton = (
    <button
      className="route-preference-panel__add"
      type="button"
      aria-label="Ajouter"
      title="Ajouter"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onAddClick}
    >
      <Plus size={18} weight="regular" aria-hidden="true" />
    </button>
  );
  const panelHeader = (
    <div className="route-preference-panel__header">
      <h2>{config.titleLabel}</h2>
      {addButton}
    </div>
  );

  if (isLoadingFavorites) {
    return (
      <div className="route-preference-panel">
        {panelHeader}
        {preferredPlaceEntry}
        <div className="route-preference-panel__center">
          <span className="route-field__loader" aria-label="Chargement" />
        </div>
      </div>
    );
  }

  if (favoriteMessage) {
    return (
      <div className="route-preference-panel">
        {panelHeader}
        {preferredPlaceEntry}
        <div className="route-preference-panel__center">
          <p>{favoriteMessage}</p>
        </div>
      </div>
    );
  }

  if (favoritePlaces.length === 0) {
    return (
      <div className="route-preference-panel">
        {panelHeader}
        {preferredPlaceEntry}
        <div className="route-preference-panel__center">
          <p>{config.emptyLabel}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="route-preference-panel">
      {panelHeader}
      {preferredPlaceEntry}
      <div className="route-suggestions" role="listbox">
        {favoritePlaces.map((place) => (
          <RoutePreferencePlaceButton
            key={place.favoriteId || place.id}
            Icon={CategoryIcon}
            place={place}
            secondaryLabel={place.placeLabel || place.name || place.label}
            onDelete={onDeletePlace}
            onSelect={onPlaceSelect}
          />
        ))}
      </div>
    </div>
  );
}
