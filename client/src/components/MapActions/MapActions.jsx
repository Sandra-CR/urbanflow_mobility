import { DownloadSimple, Moon, Sun } from '@phosphor-icons/react';
import './MapActions.css';

function MapActions({ isDarkMode, onInstallPwa, onToggleDarkMode }) {
  return (
    <div className="map-actions" aria-label="Commandes de carte">
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
        aria-label="Installer l'application"
        title="Installer l'application"
        onClick={onInstallPwa}
      >
        <DownloadSimple size={20} weight="bold" aria-hidden="true" />
      </button>
    </div>
  );
}

export default MapActions;
