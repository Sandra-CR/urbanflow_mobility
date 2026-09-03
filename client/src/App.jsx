import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ArrowRight, CaretLeft, CaretRight } from '@phosphor-icons/react';
import AppNavigation from './components/AppNavigation/AppNavigation';
import LegalFooter from './components/LegalFooter/LegalFooter';
import MapActions from './components/MapActions/MapActions';
import OfflineCacheToast from './components/OfflineCacheToast/OfflineCacheToast';
import { useCurrentLocation } from './hooks/useCurrentLocation';
import { useModalFocusTrap } from './hooks/useModalFocusTrap';
import { usePwaInstall } from './hooks/usePwaInstall';
import { useTheme } from './hooks/useTheme';
import {
  getDistanceBetweenCoordinatesInMeters,
  getDistanceToSectionInMeters,
  isValidCoordinatePair,
} from './utils/geo';
import { formatBikeCount, formatStationDistance } from './utils/formatters';
import {
  getJourneyEndCoordinates,
  getJourneyStartCoordinates,
  getTrackableJourneySections,
} from './utils/journeyUtils';
import './App.css';

const AccountPage = lazy(() => import('./components/AccountPage/AccountPage'));
const AuthPanel = lazy(() => import('./components/AuthPanel/AuthPanel'));
const CarbonPage = lazy(() => import('./components/CarbonPage/CarbonPage'));
const InteractiveMap = lazy(
  () => import('./components/InteractiveMap/InteractiveMap')
);
const LegalPage = lazy(() => import('./components/LegalPage/LegalPage'));
const NotFoundPage = lazy(
  () => import('./components/NotFoundPage/NotFoundPage')
);
const RoutePlanner = lazy(
  () => import('./components/RoutePlanner/RoutePlanner')
);

const PARIS_CENTER = [2.3522, 48.8566];
const START_PROXIMITY_THRESHOLD_METERS = 250;
const DESTINATION_PROXIMITY_THRESHOLD_METERS = 80;
const LEGAL_PAGE_TITLES = {
  'legal-notice': 'Mentions légales',
  privacy: 'Confidentialité',
  terms: 'Conditions générales d’utilisation',
};

const KNOWN_APP_PATHS = new Set(['/', '/index.html']);

function scheduleAfterInitialRender(callback, timeout = 1500) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  if ('requestIdleCallback' in window) {
    const idleId = window.requestIdleCallback(callback, { timeout });

    return () => window.cancelIdleCallback(idleId);
  }

  const timeoutId = window.setTimeout(callback, timeout);

  return () => window.clearTimeout(timeoutId);
}

/**
 * Vérifie si le chemin courant correspond à une vue connue de la SPA.
 *
 * @param {string} pathname Chemin issu de `window.location.pathname`.
 * @returns {boolean} `true` si l'application peut afficher une vue normale.
 */
function isKnownAppPath(pathname = '/') {
  return KNOWN_APP_PATHS.has(pathname);
}

/**
 * Remplace l'URL courante sans ajouter d'entrée dans l'historique navigateur.
 *
 * @param {string} pathname Chemin à afficher dans la barre d'adresse.
 * @returns {void}
 */
function replaceBrowserPath(pathname) {
  if (typeof window === 'undefined') {
    return;
  }

  window.history.replaceState(null, '', pathname);
}

function MapHydrationPlaceholder() {
  return (
    <div className="map-hydration-placeholder" aria-hidden="true">
      <div className="map-hydration-placeholder__grid" />
      <span className="map-hydration-placeholder__pin" />
    </div>
  );
}

function RoutePlannerLoadingSkeleton() {
  return (
    <aside className="route-planner route-planner-skeleton" aria-hidden="true">
      <div className="route-planner-skeleton__header" />
      <div className="route-planner-skeleton__field" />
      <div className="route-planner-skeleton__field" />
      <div className="route-planner-skeleton__tabs" />
      <div className="route-planner-skeleton__list">
        <span />
        <span />
        <span />
      </div>
    </aside>
  );
}

/**
 * Orchestre l'écran principal de la PWA: carte, calcul d'itinéraires,
 * compte utilisateur et services locaux du navigateur.
 *
 * La géolocalisation est demandée au chargement de la page. Si l'utilisateur
 * accepte après le rendu initial, la position est injectée dans la carte et
 * transformée en lieu "Ma position" réutilisable dans le planificateur.
 *
 * @returns {import('react').JSX.Element} Interface principale de l'application.
 */
function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthPanel, setShowAuthPanel] = useState(false);
  const [showAccountPage, setShowAccountPage] = useState(false);
  const [showCarbonPage, setShowCarbonPage] = useState(false);
  const [activeLegalPage, setActiveLegalPage] = useState(null);
  const [isNotFoundPage, setIsNotFoundPage] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return !isKnownAppPath(window.location.pathname);
  });
  const { isDarkMode, toggleDarkMode: handleToggleDarkMode } = useTheme();
  const {
    cacheMessage,
    installPwa: handleInstallPwa,
    setCacheMessage,
  } = usePwaInstall();
  const [isRoutePlannerCollapsed, setIsRoutePlannerCollapsed] = useState(false);
  const [routePlannerResetKey, setRoutePlannerResetKey] = useState(0);
  const [journeys, setJourneys] = useState([]);
  const [disruptions, setDisruptions] = useState([]);
  const [isLoadingDisruptions, setIsLoadingDisruptions] = useState(false);
  const [hasLoadedDisruptions, setHasLoadedDisruptions] = useState(false);
  const [selectedJourney, setSelectedJourney] = useState(null);
  const [latestRoutePlaces, setLatestRoutePlaces] = useState(null);
  const [bikeStationPromptJourney, setBikeStationPromptJourney] =
    useState(null);
  const [bikeStationChoices, setBikeStationChoices] = useState([]);
  const [isLoadingBikeStations, setIsLoadingBikeStations] = useState(false);
  const [bikeStationMessage, setBikeStationMessage] = useState('');
  const [isRouteSheetCtaVisible, setIsRouteSheetCtaVisible] = useState(false);
  const [isRouteDetailsVisible, setIsRouteDetailsVisible] = useState(false);
  const [isLoadingJourneys, setIsLoadingJourneys] = useState(false);
  const [journeyMessage, setJourneyMessage] = useState('');
  const [isMapReadyForHydration, setIsMapReadyForHydration] = useState(false);
  const [routeTrackingMessage, setRouteTrackingMessage] = useState('');
  const [trackingPopupMessage, setTrackingPopupMessage] = useState('');
  const [hasTrackedJourneyCompleted, setHasTrackedJourneyCompleted] =
    useState(false);
  const [trackedStepIndex, setTrackedStepIndex] = useState(0);
  const isRouteTrackingActiveRef = useRef(false);
  const selectedJourneyEndCoordinatesRef = useRef(null);
  const selectedJourneyRef = useRef(null);
  const disruptionRequestIdRef = useRef(0);
  const savedCompletedJourneyKeyRef = useRef(null);
  const bikeStationModalRef = useRef(null);
  const trackingMessageModalRef = useRef(null);

  const saveCompletedJourneyOnce = useCallback(
    (journey) => {
      if (!journey) {
        return;
      }

      const completedJourneyKey =
        journey.id || JSON.stringify(journey.geometry);

      if (savedCompletedJourneyKeyRef.current === completedJourneyKey) {
        return;
      }

      savedCompletedJourneyKeyRef.current = completedJourneyKey;
      import('./utils/completedJourneysDb')
        .then(({ saveCompletedJourney }) =>
          saveCompletedJourney(journey, {
            syncRemote: Boolean(currentUser),
          })
        )
        .catch(() => {
          savedCompletedJourneyKeyRef.current = null;
        });
    },
    [currentUser]
  );

  const handleBikeStationPromptClose = useCallback(() => {
    setBikeStationPromptJourney(null);
    setBikeStationChoices([]);
    setBikeStationMessage('');
    setIsLoadingBikeStations(false);
  }, []);

  const handleTrackingPopupClose = useCallback(() => {
    setTrackingPopupMessage('');
  }, []);

  useModalFocusTrap({
    isOpen: Boolean(bikeStationPromptJourney),
    dialogRef: bikeStationModalRef,
    onClose: handleBikeStationPromptClose,
  });
  useModalFocusTrap({
    isOpen: Boolean(trackingPopupMessage),
    dialogRef: trackingMessageModalRef,
    onClose: handleTrackingPopupClose,
  });

  const handleUserPositionChange = useCallback(
    (nextCoordinates) => {
      if (
        isRouteTrackingActiveRef.current &&
        isValidCoordinatePair(selectedJourneyEndCoordinatesRef.current) &&
        getDistanceBetweenCoordinatesInMeters(
          nextCoordinates,
          selectedJourneyEndCoordinatesRef.current
        ) <= DESTINATION_PROXIMITY_THRESHOLD_METERS
      ) {
        setHasTrackedJourneyCompleted(true);
        saveCompletedJourneyOnce(selectedJourneyRef.current);
      }
    },
    [saveCompletedJourneyOnce]
  );

  const {
    requestCurrentPosition,
    setUserLocation,
    userLocation,
    userLocationPlace,
  } = useCurrentLocation({
    onPositionChange: handleUserPositionChange,
  });

  const deferredSelectedJourney = useDeferredValue(selectedJourney);
  const deferredBikeStationChoices = useDeferredValue(bikeStationChoices);

  const handleSearchPlaces = useCallback(async (query) => {
    const { searchPlaces } = await import('./utils/idfmApi');
    const data = await searchPlaces({
      query,
      count: 8,
    });

    return data.places || [];
  }, []);

  const refreshDisruptions = useCallback(({ count = 200 } = {}) => {
    const requestId = disruptionRequestIdRef.current + 1;
    disruptionRequestIdRef.current = requestId;
    setIsLoadingDisruptions(true);

    import('./utils/idfmApi')
      .then(({ getDisruptions }) => getDisruptions({ count }))
      .then((data) => {
        if (disruptionRequestIdRef.current !== requestId) {
          return;
        }

        setDisruptions(data.disruptions || []);
      })
      .catch(() => {
        if (disruptionRequestIdRef.current !== requestId) {
          return;
        }

        setDisruptions([]);
      })
      .finally(() => {
        if (disruptionRequestIdRef.current !== requestId) {
          return;
        }

        setHasLoadedDisruptions(true);
        setIsLoadingDisruptions(false);
      });
  }, []);

  const clearBikeStationFlow = useCallback(() => {
    setBikeStationPromptJourney(null);
    setBikeStationChoices([]);
    setIsLoadingBikeStations(false);
    setBikeStationMessage('');
  }, []);

  useEffect(() => {
    let isMounted = true;
    const cancelAuthRefresh = scheduleAfterInitialRender(() => {
      import('./utils/authApi')
        .then(({ getCurrentUser }) => getCurrentUser())
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
    });

    return () => {
      isMounted = false;
      cancelAuthRefresh();
    };
  }, []);

  useEffect(() => {
    return scheduleAfterInitialRender(() => {
      setIsMapReadyForHydration(true);
    }, 1200);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    function handleBrowserNavigation() {
      setIsNotFoundPage(!isKnownAppPath(window.location.pathname));
    }

    window.addEventListener('popstate', handleBrowserNavigation);

    return () => {
      window.removeEventListener('popstate', handleBrowserNavigation);
    };
  }, []);

  const selectedJourneyStartCoordinates = useMemo(
    () => getJourneyStartCoordinates(selectedJourney),
    [selectedJourney]
  );
  const selectedJourneyEndCoordinates = useMemo(
    () => getJourneyEndCoordinates(selectedJourney),
    [selectedJourney]
  );
  const isRouteTrackingActive = routeTrackingMessage === "C'est parti";
  const isTrackedJourneyComplete = hasTrackedJourneyCompleted;
  const trackedJourneySections = useMemo(
    () => getTrackableJourneySections(selectedJourney),
    [selectedJourney]
  );

  useEffect(() => {
    isRouteTrackingActiveRef.current = isRouteTrackingActive;
  }, [isRouteTrackingActive]);

  useEffect(() => {
    selectedJourneyEndCoordinatesRef.current = selectedJourneyEndCoordinates;
  }, [selectedJourneyEndCoordinates]);

  useEffect(() => {
    selectedJourneyRef.current = selectedJourney;
  }, [selectedJourney]);
  const activeTrackedSection =
    isRouteTrackingActive && !isTrackedJourneyComplete
      ? trackedJourneySections[
          Math.min(
            trackedStepIndex,
            Math.max(trackedJourneySections.length - 1, 0)
          )
        ] || null
      : null;
  const currentTrackedStepIndex = useMemo(() => {
    if (
      !isRouteTrackingActive ||
      !isValidCoordinatePair(userLocation) ||
      trackedJourneySections.length === 0
    ) {
      return 0;
    }

    return trackedJourneySections.reduce(
      (closestSectionIndex, section, sectionIndex, sections) => {
        const currentDistance = getDistanceToSectionInMeters(
          userLocation,
          section
        );
        const closestDistance = getDistanceToSectionInMeters(
          userLocation,
          sections[closestSectionIndex]
        );

        return currentDistance < closestDistance
          ? sectionIndex
          : closestSectionIndex;
      },
      0
    );
  }, [isRouteTrackingActive, trackedJourneySections, userLocation]);

  async function handleLogin(credentials) {
    const { loginUser } = await import('./utils/authApi');
    const data = await loginUser(credentials);
    setCurrentUser(data.user);
    setIsNotFoundPage(false);
    setShowAuthPanel(false);
    setShowAccountPage(false);
    setShowCarbonPage(false);
  }

  async function handleRegister(credentials) {
    const { registerUser } = await import('./utils/authApi');
    const data = await registerUser(credentials);
    setCurrentUser(data.user);
    setIsNotFoundPage(false);
    setShowAuthPanel(false);
    setShowAccountPage(false);
    setShowCarbonPage(false);
  }

  async function handleLogout() {
    const { logoutUser } = await import('./utils/authApi');
    await logoutUser();
    setCurrentUser(null);
    setIsNotFoundPage(false);
    setShowAuthPanel(false);
    setShowAccountPage(false);
    setShowCarbonPage(false);
  }

  async function handleDeleteAccount() {
    const { deleteCurrentUser } = await import('./utils/authApi');
    await deleteCurrentUser();
    setCurrentUser(null);
    setIsNotFoundPage(false);
    setShowAuthPanel(false);
    setShowAccountPage(false);
    setShowCarbonPage(false);
  }

  async function handlePlanJourney({ from, to, wheelchairAccessible = false }) {
    setIsLoadingJourneys(true);
    setJourneyMessage('');
    setJourneys([]);
    setSelectedJourney(null);
    setLatestRoutePlaces({ from, to });
    clearBikeStationFlow();
    setIsRouteSheetCtaVisible(false);
    setIsRouteDetailsVisible(false);
    setRouteTrackingMessage('');
    setTrackingPopupMessage('');
    setHasTrackedJourneyCompleted(false);
    savedCompletedJourneyKeyRef.current = null;
    setTrackedStepIndex(0);

    try {
      const { getJourneys } = await import('./utils/idfmApi');
      const data = await getJourneys({
        from: from.id,
        to: to.id,
        fromCoordinates: from.coordinates,
        toCoordinates: to.coordinates,
        wheelchairAccessible,
      });
      const nextJourneys = data.journeys || [];
      const nextSelectedJourney = wheelchairAccessible
        ? nextJourneys.find((journey) => journey.profile !== 'bike') || null
        : nextJourneys[0] || null;

      refreshDisruptions();
      setJourneys(nextJourneys);
      setSelectedJourney(nextSelectedJourney);

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

  const selectJourneyForDisplay = useCallback((journey) => {
    setSelectedJourney(journey);
    setIsRouteSheetCtaVisible(true);
    setIsRouteDetailsVisible(false);
    setRouteTrackingMessage('');
    setTrackingPopupMessage('');
    setHasTrackedJourneyCompleted(false);
    savedCompletedJourneyKeyRef.current = null;
    setTrackedStepIndex(0);
  }, []);

  function handleBikeStationPromptYes() {
    if (bikeStationPromptJourney) {
      selectJourneyForDisplay(bikeStationPromptJourney);
    }

    clearBikeStationFlow();
  }

  async function handleBikeStationPromptNo() {
    if (!latestRoutePlaces?.from?.coordinates) {
      setBikeStationMessage('Le point de départ est introuvable.');
      return;
    }

    setIsLoadingBikeStations(true);
    setBikeStationMessage('');

    try {
      const { getBikeStations } = await import('./utils/idfmApi');
      const [lon, lat] = latestRoutePlaces.from.coordinates;
      const data = await getBikeStations({
        lon,
        lat,
        distance: 1500,
        count: 5,
        availability: 'bikes',
      });
      const stations = data.stations || [];

      setBikeStationChoices(stations);

      if (stations.length === 0) {
        setBikeStationMessage('Aucune borne avec vélo disponible à proximité.');
      }
    } catch (error) {
      setBikeStationMessage(error.message);
    } finally {
      setIsLoadingBikeStations(false);
    }
  }

  const handleBikeStationSelect = useCallback(
    async (station) => {
      if (
        bikeStationChoices.length === 0 ||
        !latestRoutePlaces?.from?.coordinates ||
        !latestRoutePlaces?.to?.coordinates
      ) {
        return;
      }

      setIsLoadingBikeStations(true);
      setBikeStationMessage('');

      try {
        const { getBikeStationJourney } = await import('./utils/idfmApi');
        const data = await getBikeStationJourney({
          fromCoordinates: latestRoutePlaces.from.coordinates,
          toCoordinates: latestRoutePlaces.to.coordinates,
          startStation: station,
        });
        const stationJourney = data.journey;

        setJourneys((currentJourneys) =>
          currentJourneys.map((currentJourney) =>
            currentJourney === bikeStationPromptJourney
              ? stationJourney
              : currentJourney
          )
        );
        selectJourneyForDisplay(stationJourney);
        clearBikeStationFlow();

        if (data.carbonFootprintMessage) {
          setJourneyMessage(data.carbonFootprintMessage);
        }
      } catch (error) {
        setBikeStationMessage(error.message);
      } finally {
        setIsLoadingBikeStations(false);
      }
    },
    [
      bikeStationChoices.length,
      bikeStationPromptJourney,
      clearBikeStationFlow,
      latestRoutePlaces,
      selectJourneyForDisplay,
    ]
  );

  function handleJourneySelect(journey) {
    if (journey.profile === 'bike' && !journey.bikeStations) {
      setBikeStationPromptJourney(journey);
      setBikeStationChoices([]);
      setBikeStationMessage('');
      setIsLoadingBikeStations(false);
      return;
    }

    clearBikeStationFlow();
    selectJourneyForDisplay(journey);
  }

  const handleJourneyInputsInvalid = useCallback(() => {
    setJourneys((currentJourneys) =>
      currentJourneys.length > 0 ? [] : currentJourneys
    );
    setSelectedJourney((currentJourney) =>
      currentJourney ? null : currentJourney
    );
    setLatestRoutePlaces(null);
    clearBikeStationFlow();
    setJourneyMessage((currentMessage) =>
      currentMessage ? '' : currentMessage
    );
    setIsRouteSheetCtaVisible((isVisible) => (isVisible ? false : isVisible));
    setIsRouteDetailsVisible((isVisible) => (isVisible ? false : isVisible));
    setRouteTrackingMessage((currentMessage) =>
      currentMessage ? '' : currentMessage
    );
    setTrackingPopupMessage((currentMessage) =>
      currentMessage ? '' : currentMessage
    );
    setHasTrackedJourneyCompleted((isComplete) =>
      isComplete ? false : isComplete
    );
    savedCompletedJourneyKeyRef.current = null;
    setTrackedStepIndex((currentIndex) =>
      currentIndex !== 0 ? 0 : currentIndex
    );
  }, [clearBikeStationFlow]);

  const handleRoutesHome = useCallback(() => {
    replaceBrowserPath('/');
    setIsNotFoundPage(false);
    setShowAuthPanel(false);
    setShowAccountPage(false);
    setShowCarbonPage(false);
    setActiveLegalPage(null);
    setIsRoutePlannerCollapsed(false);
    setJourneys([]);
    setSelectedJourney(null);
    setLatestRoutePlaces(null);
    clearBikeStationFlow();
    setJourneyMessage('');
    setIsRouteSheetCtaVisible(false);
    setIsRouteDetailsVisible(false);
    setRouteTrackingMessage('');
    setTrackingPopupMessage('');
    setHasTrackedJourneyCompleted(false);
    savedCompletedJourneyKeyRef.current = null;
    setTrackedStepIndex(0);
    setRoutePlannerResetKey((currentValue) => currentValue + 1);
  }, [clearBikeStationFlow]);

  const handleCarbonPageOpen = useCallback(() => {
    replaceBrowserPath('/');
    setIsNotFoundPage(false);
    setShowAuthPanel(false);
    setShowAccountPage(false);
    setActiveLegalPage(null);
    setShowCarbonPage(true);
  }, []);

  const handleDisruptionsOpen = useCallback(() => {
    if (!hasLoadedDisruptions && !isLoadingDisruptions) {
      refreshDisruptions();
    }
  }, [hasLoadedDisruptions, isLoadingDisruptions, refreshDisruptions]);

  useEffect(() => {
    const viewTitle = activeLegalPage
      ? LEGAL_PAGE_TITLES[activeLegalPage] || 'Informations légales'
      : showCarbonPage
        ? 'Mon carbone'
        : showAccountPage && currentUser
          ? 'Mon compte'
          : 'Itinéraires';

    const resolvedViewTitle = isNotFoundPage ? 'Page introuvable' : viewTitle;

    document.title = `${resolvedViewTitle} - UrbanFlow Mobility`;
  }, [
    activeLegalPage,
    currentUser,
    isNotFoundPage,
    showAccountPage,
    showCarbonPage,
  ]);

  const handleLegalPageOpen = useCallback((pageId) => {
    replaceBrowserPath('/');
    setIsNotFoundPage(false);
    setShowAuthPanel(false);
    setShowAccountPage(false);
    setShowCarbonPage(false);
    setActiveLegalPage(pageId);
    setIsRoutePlannerCollapsed(false);
  }, []);

  const handleCloseTrackedJourneyComplete = useCallback(() => {
    handleRoutesHome();
  }, [handleRoutesHome]);

  const handleStartRouteTracking = useCallback(async () => {
    setRouteTrackingMessage('');
    setTrackingPopupMessage('');
    setHasTrackedJourneyCompleted(false);

    let currentCoordinates = userLocation;

    if (!isValidCoordinatePair(currentCoordinates)) {
      try {
        currentCoordinates = await requestCurrentPosition();
        setUserLocation(currentCoordinates);
      } catch {
        setTrackingPopupMessage(
          'Activez votre géolocalisation pour démarrer votre trajet.'
        );
        return;
      }
    }

    if (!isValidCoordinatePair(selectedJourneyStartCoordinates)) {
      setTrackingPopupMessage(
        'Impossible de vérifier votre point de départ pour le moment.'
      );
      return;
    }

    const distanceToStart = getDistanceBetweenCoordinatesInMeters(
      currentCoordinates,
      selectedJourneyStartCoordinates
    );

    if (distanceToStart > START_PROXIMITY_THRESHOLD_METERS) {
      setTrackingPopupMessage(
        'Vous devez vous situer proche de votre point de départ'
      );
      return;
    }

    setRouteTrackingMessage("C'est parti");
    setTrackedStepIndex(0);

    if (
      isValidCoordinatePair(selectedJourneyEndCoordinates) &&
      getDistanceBetweenCoordinatesInMeters(
        currentCoordinates,
        selectedJourneyEndCoordinates
      ) <= DESTINATION_PROXIMITY_THRESHOLD_METERS
    ) {
      setHasTrackedJourneyCompleted(true);
      saveCompletedJourneyOnce(selectedJourney);
    }
  }, [
    requestCurrentPosition,
    saveCompletedJourneyOnce,
    selectedJourney,
    selectedJourneyEndCoordinates,
    selectedJourneyStartCoordinates,
    setUserLocation,
    userLocation,
  ]);

  return (
    <main
      id="app-content"
      className="map-test-page app-surface"
      data-theme={isDarkMode ? 'dark' : 'light'}
      tabIndex={-1}
    >
      <a className="skip-link" href="#app-content">
        Aller au contenu principal
      </a>
      <AppNavigation
        currentUser={currentUser}
        isDarkMode={isDarkMode}
        isAuthPanelOpen={showAuthPanel || showAccountPage}
        isCarbonPageOpen={showCarbonPage}
        isLegalPageOpen={Boolean(activeLegalPage)}
        isNotFoundPageOpen={isNotFoundPage}
        onAccountClick={() => {
          replaceBrowserPath('/');
          setIsNotFoundPage(false);
          if (currentUser) {
            setShowAuthPanel(false);
            setShowAccountPage(true);
            setShowCarbonPage(false);
            setActiveLegalPage(null);
          } else {
            setShowAuthPanel(true);
            setShowCarbonPage(false);
            setActiveLegalPage(null);
          }
        }}
        onBrandClick={handleRoutesHome}
        onCarbonClick={handleCarbonPageOpen}
        onRoutesClick={handleRoutesHome}
      />

      <OfflineCacheToast
        cacheMessage={cacheMessage}
        cacheProgress={null}
        isCachingTiles={false}
        onDismiss={() => setCacheMessage('')}
      />

      {!showAccountPage &&
      !showCarbonPage &&
      !activeLegalPage &&
      !isNotFoundPage ? (
        <MapActions
          isDarkMode={isDarkMode}
          onInstallPwa={handleInstallPwa}
          onToggleDarkMode={handleToggleDarkMode}
        />
      ) : null}

      <Suspense fallback={null}>
        {isNotFoundPage ? (
          <NotFoundPage
            onHomeClick={handleRoutesHome}
            onLegalLinkClick={handleLegalPageOpen}
          />
        ) : activeLegalPage ? (
          <LegalPage
            activeLegalPage={activeLegalPage}
            isDarkMode={isDarkMode}
            onLegalLinkClick={handleLegalPageOpen}
            onToggleDarkMode={handleToggleDarkMode}
          />
        ) : showCarbonPage ? (
          <CarbonPage
            currentUser={currentUser}
            isDarkMode={isDarkMode}
            onLegalLinkClick={handleLegalPageOpen}
            onToggleDarkMode={handleToggleDarkMode}
          />
        ) : showAccountPage && currentUser ? (
          <AccountPage
            currentUser={currentUser}
            isDarkMode={isDarkMode}
            onDeleteAccount={handleDeleteAccount}
            onLogout={handleLogout}
            onLegalLinkClick={handleLegalPageOpen}
            onSearchPlaces={handleSearchPlaces}
            onToggleDarkMode={handleToggleDarkMode}
          />
        ) : (
          <section
            className="map-workspace"
            style={{
              '--route-planner-width': isRoutePlannerCollapsed
                ? '0px'
                : '360px',
            }}
          >
            <div
              className="route-planner-shell"
              data-collapsed={isRoutePlannerCollapsed}
            >
              <button
                className="route-planner-shell__collapse-toggle"
                type="button"
                aria-label={
                  isRoutePlannerCollapsed
                    ? "Ouvrir le panneau d'itinéraire"
                    : "Replier le panneau d'itinéraire"
                }
                aria-expanded={!isRoutePlannerCollapsed}
                onClick={() =>
                  setIsRoutePlannerCollapsed((currentValue) => !currentValue)
                }
              >
                {isRoutePlannerCollapsed ? (
                  <CaretRight size={18} weight="bold" aria-hidden="true" />
                ) : (
                  <CaretLeft size={18} weight="bold" aria-hidden="true" />
                )}
              </button>
              <Suspense fallback={<RoutePlannerLoadingSkeleton />}>
                <RoutePlanner
                  key={routePlannerResetKey}
                  currentUser={currentUser}
                  disruptions={disruptions}
                  hasLoadedDisruptions={hasLoadedDisruptions}
                  journeys={journeys}
                  selectedJourney={selectedJourney}
                  isRouteDetailsVisible={isRouteDetailsVisible}
                  isRouteTrackingActive={isRouteTrackingActive}
                  isTrackedJourneyComplete={isTrackedJourneyComplete}
                  currentTrackedStepIndex={currentTrackedStepIndex}
                  trackedStepIndex={trackedStepIndex}
                  isLoading={isLoadingJourneys}
                  isLoadingDisruptions={isLoadingDisruptions}
                  message={journeyMessage}
                  userLocation={userLocation}
                  onTrackedStepChange={setTrackedStepIndex}
                  onBackToResults={() => setIsRouteDetailsVisible(false)}
                  onTrackedJourneyCompleteClose={
                    handleCloseTrackedJourneyComplete
                  }
                  onJourneySelect={handleJourneySelect}
                  onDisruptionsOpen={handleDisruptionsOpen}
                  onLegalLinkClick={handleLegalPageOpen}
                  onLoginClick={() => setShowAuthPanel(true)}
                  onInputsInvalid={handleJourneyInputsInvalid}
                  onPlan={handlePlanJourney}
                  onSearchPlaces={handleSearchPlaces}
                  userLocationPlace={userLocationPlace}
                />
              </Suspense>
            </div>
            <section className="map-shell" aria-label="Carte">
              {isMapReadyForHydration ? (
                <Suspense fallback={<MapHydrationPlaceholder />}>
                  <InteractiveMap
                    center={PARIS_CENTER}
                    zoom={13}
                    isDarkMode={isDarkMode}
                    stations={deferredBikeStationChoices}
                    selectedRoute={deferredSelectedJourney}
                    focusedSection={activeTrackedSection}
                    isJourneyComplete={isTrackedJourneyComplete}
                    onStationSelect={handleBikeStationSelect}
                    userLocation={userLocation}
                  />
                </Suspense>
              ) : (
                <MapHydrationPlaceholder />
              )}
              {selectedJourney && isRouteSheetCtaVisible ? (
                isRouteDetailsVisible ? (
                  isRouteTrackingActive ? null : (
                    <button
                      className="btn-primary map-route-cta"
                      type="button"
                      onClick={handleStartRouteTracking}
                    >
                      <span>Go</span>
                      <ArrowRight
                        size={18}
                        weight="regular"
                        aria-hidden="true"
                      />
                    </button>
                  )
                ) : (
                  <button
                    className="btn-primary map-route-cta"
                    type="button"
                    onClick={() => setIsRouteDetailsVisible(true)}
                  >
                    <span>Voir l'itinéraire</span>
                    <ArrowRight size={18} weight="regular" aria-hidden="true" />
                  </button>
                )
              ) : null}
            </section>
            <LegalFooter
              className="map-workspace__legal-footer"
              onLegalLinkClick={handleLegalPageOpen}
            />
          </section>
        )}

        {showAuthPanel ? (
          <AuthPanel
            isOverlay
            isDarkMode={isDarkMode}
            onClose={() => setShowAuthPanel(false)}
            onLogin={handleLogin}
            onRegister={handleRegister}
          />
        ) : null}
      </Suspense>

      {bikeStationPromptJourney ? (
        <div
          className="route-tracking-modal bike-station-modal-overlay"
          data-mode={bikeStationChoices.length > 0 ? 'stations' : 'prompt'}
          role="presentation"
        >
          <div
            ref={bikeStationModalRef}
            className="route-tracking-modal__dialog bike-station-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bike-station-modal-title"
            tabIndex={-1}
          >
            <p id="bike-station-modal-title">Avez-vous un vélo ?</p>
            {bikeStationChoices.length === 0 ? (
              <div className="bike-station-modal__actions">
                <button
                  className="btn-outline-primary"
                  type="button"
                  onClick={handleBikeStationPromptYes}
                >
                  Oui
                </button>
                <button
                  className="btn-primary"
                  type="button"
                  disabled={isLoadingBikeStations}
                  onClick={handleBikeStationPromptNo}
                >
                  {isLoadingBikeStations
                    ? 'Recherche...'
                    : 'Non, voir les bornes'}
                </button>
              </div>
            ) : (
              <div className="bike-station-modal__stations">
                {bikeStationChoices.map((station) => (
                  <button
                    key={station.id}
                    type="button"
                    disabled={isLoadingBikeStations}
                    onClick={() => handleBikeStationSelect(station)}
                  >
                    <strong>{station.name}</strong>
                    <span>
                      {[
                        formatStationDistance(station.distance),
                        formatBikeCount(station.availableBikes),
                      ]
                        .filter(Boolean)
                        .join(' - ')}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {bikeStationMessage ? (
              <span className="bike-station-modal__message">
                {bikeStationMessage}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {trackingPopupMessage ? (
        <div className="route-tracking-modal" role="presentation">
          <div
            ref={trackingMessageModalRef}
            className="route-tracking-modal__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="route-tracking-modal-title"
            tabIndex={-1}
          >
            <p id="route-tracking-modal-title">{trackingPopupMessage}</p>
            <button
              className="btn-primary route-tracking-modal__button"
              type="button"
              onClick={handleTrackingPopupClose}
            >
              J'ai compris
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default App;
