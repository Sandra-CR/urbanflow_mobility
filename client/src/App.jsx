import { useEffect, useState } from 'react';
import {
  DownloadSimple,
  Moon,
  SignOut,
  Sun,
  Trash,
} from '@phosphor-icons/react';
import AuthPanel from './components/AuthPanel';
import InteractiveMap from './components/InteractiveMap';
import {
  deleteCurrentUser,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
} from './utils/authApi';
import { preloadMapTiles } from './utils/offlineMapTiles';
import './App.css';

const TEST_CENTER = [2.3522, 48.8566];
const PARIS_OFFLINE_BOUNDS = {
  west: 2.24,
  south: 48.81,
  east: 2.48,
  north: 48.91,
};

const TEST_STATIONS = [
  {
    id: 'republique-bike',
    name: 'Station Republique',
    type: 'bike',
    coordinates: [2.363, 48.867],
  },
  {
    id: 'hotel-ville-bus',
    name: 'Arrêt Hôtel de Ville',
    type: 'bus',
    coordinates: [2.3522, 48.8566],
  },
  {
    id: 'chatelet-tram',
    name: 'Pole Chatelet',
    type: 'tram',
    coordinates: [2.347, 48.8586],
  },
  {
    id: 'bastille-charge',
    name: 'Recharge Bastille',
    type: 'charge',
    coordinates: [2.369, 48.853],
  },
];

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [cacheProgress, setCacheProgress] = useState(null);
  const [isCachingTiles, setIsCachingTiles] = useState(false);
  const [cacheMessage, setCacheMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    getCurrentUser()
      .then((data) => {
        if (isMounted) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCurrentUser(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleLogin(credentials) {
    const data = await loginUser(credentials);
    setCurrentUser(data.user);
  }

  async function handleRegister(credentials) {
    const data = await registerUser(credentials);
    setCurrentUser(data.user);
  }

  async function handleLogout() {
    await logoutUser();
    setCurrentUser(null);
  }

  async function handleDeleteAccount() {
    const shouldDelete = window.confirm(
      'Supprimer definitivement votre compte UrbanFlow ?'
    );

    if (!shouldDelete) {
      return;
    }

    await deleteCurrentUser();
    setCurrentUser(null);
  }

  async function handlePreloadOfflineMap() {
    setIsCachingTiles(true);
    setCacheMessage('');
    setCacheProgress({ completed: 0, total: 0, percent: 0 });

    try {
      const result = await preloadMapTiles({
        bounds: PARIS_OFFLINE_BOUNDS,
        minZoom: 11,
        maxZoom: 15,
        includeDarkMode: true,
        onProgress: setCacheProgress,
      });

      setCacheMessage(`${result.total} tuiles prêtes pour le hors ligne.`);
    } catch (error) {
      setCacheMessage(error.message);
    } finally {
      setIsCachingTiles(false);
    }
  }

  if (isCheckingSession) {
    return (
      <main className="app-loading app-surface">
        <div className="app-loading__indicator" aria-label="Chargement" />
      </main>
    );
  }

  if (!currentUser) {
    return <AuthPanel onLogin={handleLogin} onRegister={handleRegister} />;
  }

  return (
    <main
      className="map-test-page app-surface"
      data-theme={isDarkMode ? 'dark' : 'light'}
    >
      {(cacheProgress || cacheMessage) && (
        <section className="offline-cache-toast" aria-live="polite">
          {cacheProgress && (
            <div className="offline-cache-progress">
              <span
                style={{
                  width: `${cacheProgress.percent}%`,
                }}
              />
            </div>
          )}
          <p>
            {isCachingTiles
              ? `${cacheProgress?.completed || 0}/${cacheProgress?.total || 0} tuiles (${cacheProgress?.percent || 0}%)`
              : cacheMessage}
          </p>
        </section>
      )}

      <div className="map-actions" aria-label="Commandes de carte">
        <div className="user-chip" title={currentUser.email}>
          <span>{currentUser.email}</span>
        </div>
        <button
          className="map-icon-button"
          type="button"
          aria-label={
            isDarkMode ? 'Activer le mode clair' : 'Activer le mode sombre'
          }
          title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
          aria-pressed={isDarkMode}
          onClick={() => setIsDarkMode((currentValue) => !currentValue)}
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
          onClick={handlePreloadOfflineMap}
        >
          <DownloadSimple size={20} weight="bold" aria-hidden="true" />
        </button>
        <button
          className="map-icon-button"
          type="button"
          aria-label="Se deconnecter"
          title="Se deconnecter"
          onClick={handleLogout}
        >
          <SignOut size={20} weight="bold" aria-hidden="true" />
        </button>
        <button
          className="map-icon-button map-icon-button--danger"
          type="button"
          aria-label="Supprimer le compte"
          title="Supprimer le compte"
          onClick={handleDeleteAccount}
        >
          <Trash size={20} weight="bold" aria-hidden="true" />
        </button>
      </div>

      <section className="map-shell" aria-label="Carte des stations">
        <InteractiveMap
          center={TEST_CENTER}
          zoom={13}
          isDarkMode={isDarkMode}
          stations={TEST_STATIONS}
        />
      </section>
    </main>
  );
}

export default App;
