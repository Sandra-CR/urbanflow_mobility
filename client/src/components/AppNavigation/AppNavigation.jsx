import { MapTrifold, Tree, Trophy, User } from '@phosphor-icons/react';
import UrbanflowBrand from '../UrbanflowBrand/UrbanflowBrand';
import './AppNavigation.css';

/**
 * Navigation principale de l'application.
 *
 * Le logo utilise la variante `onPrimary`, conçue pour le fond primaire de la
 * barre latérale et sélectionnée automatiquement selon le thème.
 *
 * @param {object} props Propriétés de navigation.
 * @param {object | null} props.currentUser Utilisateur connecté.
 * @param {boolean} props.isDarkMode Thème courant.
 * @param {boolean} props.isAuthPanelOpen Etat du panneau auth.
 * @param {boolean} props.isLegalPageOpen Etat d'une page légale.
 * @param {boolean} props.isNotFoundPageOpen Etat de la page introuvable.
 * @param {Function} props.onAccountClick Ouverture compte/connexion.
 * @param {Function} props.onBrandClick Retour à l'accueil itinéraires vide.
 * @param {Function} props.onRoutesClick Ouverture du panneau itinéraire.
 * @returns {JSX.Element} Navigation principale.
 */
export default function AppNavigation({
  currentUser,
  isDarkMode,
  isAuthPanelOpen,
  isCarbonPageOpen = false,
  isLegalPageOpen = false,
  isNotFoundPageOpen = false,
  onAccountClick,
  onBrandClick,
  onCarbonClick,
  onRoutesClick,
}) {
  const accountLabel = currentUser ? 'Mon compte' : 'Connexion';
  const navigationItems = [
    {
      id: 'routes',
      label: 'Itinéraires',
      Icon: MapTrifold,
      isActive:
        !isAuthPanelOpen &&
        !isCarbonPageOpen &&
        !isLegalPageOpen &&
        !isNotFoundPageOpen,
      onClick: onRoutesClick,
    },
    {
      id: 'carbon',
      label: 'Mon carbone',
      Icon: Tree,
      isActive: isCarbonPageOpen,
      onClick: onCarbonClick,
    },
    {
      id: 'achievements',
      label: 'Mes succès',
      Icon: Trophy,
      isActive: false,
    },
    {
      id: 'account',
      label: accountLabel,
      Icon: User,
      isActive: isAuthPanelOpen,
      onClick: onAccountClick,
    },
  ];

  return (
    <nav className="app-navigation" aria-label="Navigation principale">
      <div className="app-navigation__primary">
        <button
          className="app-navigation__brand"
          type="button"
          aria-label="Retour aux itinéraires"
          onClick={onBrandClick}
        >
          <UrbanflowBrand
            kind="logo"
            variant="onPrimary"
            isDarkMode={isDarkMode}
            alt=""
          />
        </button>
        {navigationItems
          .slice(0, 3)
          .map(({ id, label, Icon, isActive, onClick }) => (
            <button
              className="app-navigation__item"
              data-active={isActive}
              key={id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              disabled={!onClick}
              onClick={onClick}
            >
              <Icon weight="regular" aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
      </div>
      <button
        className="app-navigation__item app-navigation__item--account"
        data-active={navigationItems[3].isActive}
        type="button"
        aria-current={navigationItems[3].isActive ? 'page' : undefined}
        onClick={navigationItems[3].onClick}
      >
        <User weight="regular" aria-hidden="true" />
        <span>{accountLabel}</span>
      </button>
    </nav>
  );
}
