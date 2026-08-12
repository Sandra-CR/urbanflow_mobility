import {
  DownloadSimple,
  Moon,
  SignIn,
  SignOut,
  Sun,
  Trash,
} from '@phosphor-icons/react';
import './MapActions.css';

function MapActions({
  currentUser,
  isCachingTiles,
  isDarkMode,
  onDeleteAccount,
  onDownloadOfflineMap,
  onLoginClick,
  onLogout,
  onToggleDarkMode,
}) {
  return (
    <div className="map-actions" aria-label="Commandes de carte">
      {currentUser ? (
        <div className="user-chip" title={currentUser.email}>
          <span>{currentUser.email}</span>
        </div>
      ) : null}
      <button
        className="map-icon-button"
        type="button"
        aria-label={
          isDarkMode ? 'Activer le mode clair' : 'Activer le mode sombre'
        }
        title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
        aria-pressed={isDarkMode}
        onClick={onToggleDarkMode}
      >
        {isDarkMode ? (
          <Sun size={20} weight="bold" aria-hidden="true" />
        ) : (
          <Moon size={20} weight="bold" aria-hidden="true" />
        )}
      </button>
      <button
        className="map-icon-button"
        type="button"
        aria-label="Télécharger les tuiles pour le hors ligne"
        title="Télécharger les tuiles"
        disabled={isCachingTiles}
        onClick={onDownloadOfflineMap}
      >
        <DownloadSimple size={20} weight="bold" aria-hidden="true" />
      </button>
      {currentUser ? (
        <>
          <button
            className="map-icon-button"
            type="button"
            aria-label="Se déconnecter"
            title="Se déconnecter"
            onClick={onLogout}
          >
            <SignOut size={20} weight="bold" aria-hidden="true" />
          </button>
          <button
            className="map-icon-button map-icon-button--danger"
            type="button"
            aria-label="Supprimer le compte"
            title="Supprimer le compte"
            onClick={onDeleteAccount}
          >
            <Trash size={20} weight="bold" aria-hidden="true" />
          </button>
        </>
      ) : (
        <button
          className="map-icon-button"
          type="button"
          aria-label="Se connecter"
          title="Se connecter"
          onClick={onLoginClick}
        >
          <SignIn size={20} weight="bold" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export default MapActions;
