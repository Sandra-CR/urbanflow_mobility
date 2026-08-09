import { useCallback, useEffect, useState } from 'react';
import {
  DownloadSimple,
  Moon,
  SignIn,
  SignOut,
  Sun,
  Trash,
} from '@phosphor-icons/react';
import AuthPanel from './components/AuthPanel';
import InteractiveMap from './components/InteractiveMap';
import RoutePlanner from './components/RoutePlanner';
import {
  deleteCurrentUser,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
} from './utils/authApi';
import { getJourneys, searchPlaces } from './utils/idfmApi';
import { preloadMapTiles } from './utils/offlineMapTiles';
import './App.css';

const PARIS_CENTER = [2.3522, 48.8566];
const PARIS_OFFLINE_BOUNDS = {
  west: 2.24,
  south: 48.81,
  east: 2.48,
  north: 48.91,
};

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthPanel, setShowAuthPanel] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [journeys, setJourneys] = useState([]);
  const [selectedJourney, setSelectedJourney] = useState(null);
  const [isLoadingJourneys, setIsLoadingJourneys] = useState(false);
  const [journeyMessage, setJourneyMessage] = useState('');
  const [cacheProgress, setCacheProgress] = useState(null);
  const [isCachingTiles, setIsCachingTiles] = useState(false);
  const [cacheMessage, setCacheMessage] = useState('');

  const handleSearchPlaces = useCallback(async (query) => {
    const data = await searchPlaces({
      query,
      count: 8,
    });

    return data.places || [];
  }, []);

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
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleLogin(credentials) {
    const data = await loginUser(credentials);
    setCurrentUser(data.user);
    setShowAuthPanel(false);
  }

  async function handleRegister(credentials) {
    const data = await registerUser(credentials);
    setCurrentUser(data.user);
    setShowAuthPanel(false);
  }

  async function handleLogout() {
    await logoutUser();
    setCurrentUser(null);
  }

  async function handleDeleteAccount() {
    const shouldDelete = window.confirm(
      'Supprimer définitivement votre compte UrbanFlow ?'
    );

    if (!shouldDelete) {
      return;
    }

    await deleteCurrentUser();
    setCurrentUser(null);
  }

  async function handlePlanJourney({ from, to }) {
    setIsLoadingJourneys(true);
    setJourneyMessage('');
    setJourneys([]);
    setSelectedJourney(null);

    try {
      const data = await getJourneys({
        from: from.id,
        to: to.id,
        fromCoordinates: from.coordinates,
        toCoordinates: to.coordinates,
      });
      const nextJourneys = data.journeys || [];

      setJourneys(nextJourneys);
      setSelectedJourney(nextJourneys[0] || null);

      if (nextJourneys.length === 0) {
        setJourneyMessage('Aucun itinéraire trouvé.');
      } else if (data.carbonFootprintMessage) {
        setJourneyMessage(data.carbonFootprintMessage);
      }
    } catch (error) {
      setJourneyMessage(error.message);
    } finally {
      setIsLoadingJourneys(false);
    }
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
        {currentUser ? (
          <>
            <button
              className="map-icon-button"
              type="button"
              aria-label="Se déconnecter"
              title="Se déconnecter"
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
          </>
        ) : (
          <button
            className="map-icon-button"
            type="button"
            aria-label="Se connecter"
            title="Se connecter"
            onClick={() => setShowAuthPanel(true)}
          >
            <SignIn size={20} weight="bold" aria-hidden="true" />
          </button>
        )}
      </div>

      <section className="map-workspace">
        <RoutePlanner
          journeys={journeys}
          selectedJourneyId={selectedJourney?.id}
          isLoading={isLoadingJourneys}
          message={journeyMessage}
          onJourneySelect={setSelectedJourney}
          onPlan={handlePlanJourney}
          onSearchPlaces={handleSearchPlaces}
        />
        <section className="map-shell" aria-label="Carte">
          <InteractiveMap
            center={PARIS_CENTER}
            zoom={13}
            isDarkMode={isDarkMode}
            stations={[]}
            selectedRoute={selectedJourney}
          />
        </section>
      </section>

      {showAuthPanel ? (
        <AuthPanel
          isOverlay
          onClose={() => setShowAuthPanel(false)}
          onLogin={handleLogin}
          onRegister={handleRegister}
        />
      ) : null}
    </main>
  );
}

export default App;
