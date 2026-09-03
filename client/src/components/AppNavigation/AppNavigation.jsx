import { MapTrifold, Tree, Trophy, User } from '@phosphor-icons/react';
import darkLogoOnPrimary from '../../assets/brand/dark/urbanflow-logo-onprimary.svg';
import lightLogoOnPrimary from '../../assets/brand/light/urbanflow-logo-onprimary.svg';
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
  const brandLogoSrc = isDarkMode ? darkLogoOnPrimary : lightLogoOnPrimary;
  const primaryNavigationItems = [
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
  ];
  const accountNavigationItem = {
    label: accountLabel,
    isActive: isAuthPanelOpen,
    onClick: onAccountClick,
  };

  return (
    <nav className="app-navigation" aria-label="Navigation principale">
      <div className="app-navigation__primary">
        <button
          className="app-navigation__brand"
          type="button"
          aria-label="Retour aux itinéraires"
          onClick={onBrandClick}
        >
          <img src={brandLogoSrc} alt="" />
        </button>
        {primaryNavigationItems.map(
          ({ id, label, Icon, isActive, onClick }) => (
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
          )
        )}
      </div>
      <button
        className="app-navigation__item app-navigation__item--account"
        data-active={accountNavigationItem.isActive}
        type="button"
        aria-current={accountNavigationItem.isActive ? 'page' : undefined}
        onClick={accountNavigationItem.onClick}
      >
        <User weight="regular" aria-hidden="true" />
        <span>{accountLabel}</span>
      </button>
    </nav>
  );
}
