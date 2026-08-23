import { X } from '@phosphor-icons/react';

/**
 * Rend une ligne de préférence sélectionnable.
 *
 * `onMouseDown` conserve le focus du champ départ/arrivée pendant le clic, ce
 * qui permet à `RoutePlanner` de savoir quel champ remplir.
 *
 * @param {object} props Propriétés du composant.
 * @param {Function} props.Icon Icône de la catégorie.
 * @param {object} props.place Lieu affiché.
 * @param {string | null} [props.secondaryLabel] Texte secondaire.
 * @param {Function} [props.onDelete] Fonction de suppression.
 * @param {Function} props.onSelect Fonction de sélection.
 * @returns {JSX.Element} Ligne de préférence.
 */
export default function RoutePreferencePlaceButton({
  Icon,
  icon,
  place,
  secondaryLabel,
  onDelete,
  onSelect,
}) {
  return (
    <button
      className="route-suggestion"
      key={place.favoriteId || place.id}
      type="button"
      role="option"
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onSelect(place)}
    >
      <span className="route-suggestion__icon route-suggestion__icon--favorite">
        {icon || <Icon size={20} weight="regular" aria-hidden="true" />}
      </span>
      <span className="route-suggestion__content">
        <span className="route-suggestion__label">{place.label}</span>
        {secondaryLabel ? <small>{secondaryLabel}</small> : null}
      </span>
      {onDelete ? (
        <span
          className="route-suggestion__remove"
          role="button"
          tabIndex={0}
          aria-label={`Supprimer ${place.label}`}
          title="Supprimer"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(place);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              event.stopPropagation();
              onDelete(place);
            }
          }}
        >
          <X size={16} weight="bold" aria-hidden="true" />
        </span>
      ) : null}
    </button>
  );
}
