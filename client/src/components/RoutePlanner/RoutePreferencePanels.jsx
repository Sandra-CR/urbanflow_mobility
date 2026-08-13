import { Clock, Plus } from '@phosphor-icons/react';
import RoutePreferencePlaceButton from './RoutePreferencePlaceButton';

/**
 * Affiche les lieux récemment recherchés.
 *
 * @param {object} props Propriétés du panneau.
 * @param {Array<object>} props.places Lieux récents préparés.
 * @param {Function} props.onPlaceSelect Fonction de sélection.
 * @returns {JSX.Element} Panneau des récents.
 */
export function RecentPlacesPanel({ places, onPlaceSelect }) {
  if (places.length === 0) {
    return (
      <div className="route-preference-panel route-preference-panel--center">
        <p>Aucun lieu récent.</p>
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
            place={place}
            secondaryLabel={
              place.city || (place.isRecentPlaceholder ? null : place.type)
            }
            onSelect={onPlaceSelect}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Affiche une catégorie persistée : favoris, domicile ou travail.
 *
 * @param {object} props Propriétés du panneau.
 * @param {object} props.config Configuration de la catégorie.
 * @param {object | null} props.currentUser Utilisateur connecté.
 * @param {Array<object>} props.favoritePlaces Lieux enregistrés.
 * @param {string} props.favoriteMessage Message d'erreur éventuel.
 * @param {boolean} props.isLoadingFavorites État de chargement.
 * @param {Function} props.onAddClick Ouverture du formulaire d'ajout.
 * @param {Function} props.onDeletePlace Suppression d'un lieu.
 * @param {Function} props.onLoginClick Ouverture de la connexion.
 * @param {Function} props.onPlaceSelect Sélection d'un lieu.
 * @returns {JSX.Element | null} Panneau de catégorie.
 */
export function FavoritePlacesPanel({
  config,
  currentUser,
  favoritePlaces,
  favoriteMessage,
  isLoadingFavorites,
  onAddClick,
  onDeletePlace,
  onLoginClick,
  onPlaceSelect,
}) {
  if (!config) {
    return null;
  }

  if (!currentUser) {
    return (
      <div className="route-preference-panel route-preference-panel--center">
        <p>Vous devez vous connecter pour accéder à {config.loginLabel}</p>
        <button className="btn-primary" type="button" onClick={onLoginClick}>
          Se connecter
        </button>
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
  const CategoryIcon = config.Icon;
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
        <div className="route-preference-panel__center">
          <p>{config.emptyLabel}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="route-preference-panel">
      {panelHeader}
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
