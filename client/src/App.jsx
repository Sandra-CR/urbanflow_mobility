import { useCallback, useEffect, useState } from 'react';
import { ArrowRight } from '@phosphor-icons/react';
import AppNavigation from './components/AppNavigation/AppNavigation';
import AuthPanel from './components/AuthPanel/AuthPanel';
import InteractiveMap from './components/InteractiveMap/InteractiveMap';
import MapActions from './components/MapActions/MapActions';
import OfflineCacheToast from './components/OfflineCacheToast/OfflineCacheToast';
import RoutePlanner from './components/RoutePlanner/RoutePlanner';
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
  const [isRouteSheetCtaVisible, setIsRouteSheetCtaVisible] = useState(false);
  const [isRouteDetailsVisible, setIsRouteDetailsVisible] = useState(false);
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
    setIsRouteSheetCtaVisible(false);
    setIsRouteDetailsVisible(false);

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

  function handleJourneySelect(journey) {
    setSelectedJourney(journey);
    setIsRouteSheetCtaVisible(true);
    setIsRouteDetailsVisible(false);
  }

  const handleJourneyInputsInvalid = useCallback(() => {
    setJourneys((currentJourneys) =>
      currentJourneys.length > 0 ? [] : currentJourneys
    );
    setSelectedJourney((currentJourney) =>
      currentJourney ? null : currentJourney
    );
    setJourneyMessage((currentMessage) =>
      currentMessage ? '' : currentMessage
    );
    setIsRouteSheetCtaVisible((isVisible) => (isVisible ? false : isVisible));
    setIsRouteDetailsVisible((isVisible) => (isVisible ? false : isVisible));
  }, []);

  return (
    <main
      className="map-test-page app-surface"
      data-theme={isDarkMode ? 'dark' : 'light'}
    >
      <AppNavigation
        currentUser={currentUser}
        isDarkMode={isDarkMode}
        isAuthPanelOpen={showAuthPanel}
        onAccountClick={() => {
          if (!currentUser) {
            setShowAuthPanel(true);
          }
        }}
      />

      <OfflineCacheToast
        cacheMessage={cacheMessage}
        cacheProgress={cacheProgress}
        isCachingTiles={isCachingTiles}
      />

      <MapActions
        currentUser={currentUser}
        isCachingTiles={isCachingTiles}
        isDarkMode={isDarkMode}
        onDeleteAccount={handleDeleteAccount}
        onDownloadOfflineMap={handlePreloadOfflineMap}
        onLoginClick={() => setShowAuthPanel(true)}
        onLogout={handleLogout}
        onToggleDarkMode={() => setIsDarkMode((currentValue) => !currentValue)}
      />

      <section className="map-workspace">
        <RoutePlanner
          currentUser={currentUser}
          journeys={journeys}
          selectedJourney={selectedJourney}
          selectedJourneyId={selectedJourney?.id}
          isRouteDetailsVisible={isRouteDetailsVisible}
          isLoading={isLoadingJourneys}
          message={journeyMessage}
          onJourneySelect={handleJourneySelect}
          onLoginClick={() => setShowAuthPanel(true)}
          onInputsInvalid={handleJourneyInputsInvalid}
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
          {selectedJourney &&
          isRouteSheetCtaVisible &&
          !isRouteDetailsVisible ? (
            <button
              className="btn-primary map-route-cta"
              type="button"
              onClick={() => setIsRouteDetailsVisible(true)}
            >
              <span>Voir l'itinéraire</span>
              <ArrowRight size={18} weight="regular" aria-hidden="true" />
            </button>
          ) : null}
        </section>
      </section>

      {showAuthPanel ? (
        <AuthPanel
          isOverlay
          isDarkMode={isDarkMode}
          onClose={() => setShowAuthPanel(false)}
          onLogin={handleLogin}
          onRegister={handleRegister}
        />
      ) : null}
    </main>
  );
}

export default App;
