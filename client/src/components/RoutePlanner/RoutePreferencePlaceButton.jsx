import { PencilSimple, X } from '@phosphor-icons/react';

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
  actionLabel,
  actionType = 'delete',
  onAction,
  secondaryLabel,
  onDelete,
  onSelect,
}) {
  const canDelete = Boolean(onDelete) && !place?.isUserLocation;
  const canRunAction = Boolean(onAction) && !place?.isUserLocation;
  const ActionIcon = actionType === 'edit' ? PencilSimple : X;
  const resolvedActionLabel =
    actionLabel || (actionType === 'edit' ? `Modifier ${place.label}` : null);
  const resolvedDeleteLabel = `Supprimer ${place.label}`;
  const actionButton = canRunAction ? (
    <button
      className="route-suggestion__remove"
      type="button"
      aria-label={resolvedActionLabel}
      title={actionType === 'edit' ? 'Modifier' : resolvedActionLabel}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onAction(place)}
    >
      <ActionIcon
        size={16}
        weight={actionType === 'edit' ? 'regular' : 'bold'}
        aria-hidden="true"
      />
    </button>
  ) : canDelete ? (
    <button
      className="route-suggestion__remove"
      type="button"
      aria-label={resolvedDeleteLabel}
      title="Supprimer"
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onDelete(place)}
    >
      <X size={16} weight="bold" aria-hidden="true" />
    </button>
  ) : null;

  return (
    <div className="route-suggestion route-suggestion--compound">
      <button
        className="route-suggestion__select"
        type="button"
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
      </button>
      {actionButton}
    </div>
  );
}
