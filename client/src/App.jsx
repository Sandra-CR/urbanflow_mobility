import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CaretLeft, CaretRight } from '@phosphor-icons/react';
import AppNavigation from './components/AppNavigation/AppNavigation';
import AuthPanel from './components/AuthPanel/AuthPanel';
import InteractiveMap from './components/InteractiveMap/InteractiveMap';
import MapActions from './components/MapActions/MapActions';
import OfflineCacheToast from './components/OfflineCacheToast/OfflineCacheToast';
import RoutePlanner from './components/RoutePlanner/RoutePlanner';
import { getCurrentUser, loginUser, registerUser } from './utils/authApi';
import {
  getJourneys,
  getPlaceFromCoordinates,
  searchPlaces,
} from './utils/idfmApi';
import {
  clearPwaInstallPrompt,
  getPwaInstallPrompt,
  subscribeToPwaInstallPrompt,
} from './utils/pwaInstall';
import { preloadMapTiles } from './utils/offlineMapTiles';
import './App.css';

const PARIS_CENTER = [2.3522, 48.8566];
const PARIS_TILE_BOUNDS = {
  west: 2.2241,
  south: 48.8156,
  east: 2.4699,
  north: 48.9022,
};
const START_PROXIMITY_THRESHOLD_METERS = 250;
const GEOLOCATION_WATCH_OPTIONS = {
  enableHighAccuracy: false,
  maximumAge: 0,
  timeout: 30000,
};
const GEOLOCATION_REFRESH_OPTIONS = {
  enableHighAccuracy: false,
  maximumAge: 0,
  timeout: 10000,
};
// Debug geoloc utile pendant les tests manuels. A réactiver si besoin.
// const GEOLOCATION_DEBUG_INTERVAL_MS = 10000;

function normalizeMode(mode = '') {
  return String(mode || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function isValidCoordinatePair(coordinates) {
  return (
    Array.isArray(coordinates) &&
    coordinates.length >= 2 &&
    Number.isFinite(Number(coordinates[0])) &&
    Number.isFinite(Number(coordinates[1]))
  );
}

function getDistanceBetweenCoordinatesInMeters(fromCoordinates, toCoordinates) {
  if (
    !isValidCoordinatePair(fromCoordinates) ||
    !isValidCoordinatePair(toCoordinates)
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const [fromLon, fromLat] = fromCoordinates.map(Number);
  const [toLon, toLat] = toCoordinates.map(Number);
  const earthRadiusMeters = 6371000;
  const latDelta = ((toLat - fromLat) * Math.PI) / 180;
  const lonDelta = ((toLon - fromLon) * Math.PI) / 180;
  const fromLatRadians = (fromLat * Math.PI) / 180;
  const toLatRadians = (toLat * Math.PI) / 180;
  const haversineValue =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(fromLatRadians) *
      Math.cos(toLatRadians) *
      Math.sin(lonDelta / 2) ** 2;

  return (
    2 *
    earthRadiusMeters *
    Math.atan2(Math.sqrt(haversineValue), Math.sqrt(1 - haversineValue))
  );
}

function getDistanceFromPointToSegmentInMeters(
  pointCoordinates,
  segmentStartCoordinates,
  segmentEndCoordinates
) {
  if (
    !isValidCoordinatePair(pointCoordinates) ||
    !isValidCoordinatePair(segmentStartCoordinates) ||
    !isValidCoordinatePair(segmentEndCoordinates)
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const [pointLon, pointLat] = pointCoordinates.map(Number);
  const [startLon, startLat] = segmentStartCoordinates.map(Number);
  const [endLon, endLat] = segmentEndCoordinates.map(Number);
  const latitudeScale = 111320;
  const longitudeScale =
    111320 * Math.cos((((pointLat + startLat + endLat) / 3) * Math.PI) / 180);
  const pointX = pointLon * longitudeScale;
  const pointY = pointLat * latitudeScale;
  const startX = startLon * longitudeScale;
  const startY = startLat * latitudeScale;
  const endX = endLon * longitudeScale;
  const endY = endLat * latitudeScale;
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const segmentLengthSquared = deltaX ** 2 + deltaY ** 2;

  if (segmentLengthSquared === 0) {
    return Math.hypot(pointX - startX, pointY - startY);
  }

  const projectionRatio = Math.max(
    0,
    Math.min(
      1,
      ((pointX - startX) * deltaX + (pointY - startY) * deltaY) /
        segmentLengthSquared
    )
  );
  const projectedX = startX + deltaX * projectionRatio;
  const projectedY = startY + deltaY * projectionRatio;

  return Math.hypot(pointX - projectedX, pointY - projectedY);
}

function getDistanceToSectionInMeters(userCoordinates, section) {
  const geometry = Array.isArray(section?.geometry) ? section.geometry : [];

  if (geometry.length >= 2) {
    let shortestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < geometry.length - 1; index += 1) {
      const segmentDistance = getDistanceFromPointToSegmentInMeters(
        userCoordinates,
        geometry[index],
        geometry[index + 1]
      );

      if (segmentDistance < shortestDistance) {
        shortestDistance = segmentDistance;
      }
    }

    return shortestDistance;
  }

  if (isValidCoordinatePair(geometry[0])) {
    return getDistanceBetweenCoordinatesInMeters(userCoordinates, geometry[0]);
  }

  return Number.POSITIVE_INFINITY;
}

function getJourneyStartCoordinates(journey) {
  if (isValidCoordinatePair(journey?.geometry?.[0])) {
    return journey.geometry[0];
  }

  const firstSectionWithGeometry = (journey?.sections || []).find((section) =>
    isValidCoordinatePair(section?.geometry?.[0])
  );

  return firstSectionWithGeometry?.geometry?.[0] || null;
}

function getTrackableJourneySections(journey) {
  return (journey?.sections || []).filter((section) => {
    const mode = normalizeMode(section?.mode);

    return mode !== 'platform_change' && !mode.includes('waiting');
  });
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
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [isRoutePlannerCollapsed, setIsRoutePlannerCollapsed] = useState(false);
  const [routePlannerResetKey, setRoutePlannerResetKey] = useState(0);
  const [journeys, setJourneys] = useState([]);
  const [selectedJourney, setSelectedJourney] = useState(null);
  const [isRouteSheetCtaVisible, setIsRouteSheetCtaVisible] = useState(false);
  const [isRouteDetailsVisible, setIsRouteDetailsVisible] = useState(false);
  const [isLoadingJourneys, setIsLoadingJourneys] = useState(false);
  const [journeyMessage, setJourneyMessage] = useState('');
  const [cacheMessage, setCacheMessage] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [userLocationAddress, setUserLocationAddress] = useState(null);
  const [routeTrackingMessage, setRouteTrackingMessage] = useState('');
  const [trackingPopupMessage, setTrackingPopupMessage] = useState('');
  const [trackedStepIndex, setTrackedStepIndex] = useState(0);
  const latestUserLocationRef = useRef(null);
  const hasStartedTileCacheRef = useRef(false);
  // const lastGeolocationUpdateAtRef = useRef(0);

  const syncUserLocation = useCallback((position) => {
    const nextCoordinates = [
      position.coords.longitude,
      position.coords.latitude,
    ];

    latestUserLocationRef.current = nextCoordinates;
    setUserLocation(nextCoordinates);
  }, []);

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

  useEffect(
    () =>
      subscribeToPwaInstallPrompt((promptEvent) => {
        setInstallPromptEvent(promptEvent);
      }),
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    function handleAppInstalled() {
      clearPwaInstallPrompt();
      setCacheMessage('UrbanFlow est installée sur votre appareil.');
    }

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof navigator === 'undefined' ||
      hasStartedTileCacheRef.current
    ) {
      return undefined;
    }

    async function cacheTilesForOfflineUse() {
      if (!navigator.onLine) {
        return;
      }

      hasStartedTileCacheRef.current = true;

      try {
        await preloadMapTiles({
          bounds: PARIS_TILE_BOUNDS,
          minZoom: 11,
          maxZoom: 15,
          includeDarkMode: true,
        });
      } catch {
        hasStartedTileCacheRef.current = false;
      }
    }

    cacheTilesForOfflineUse();
    window.addEventListener('online', cacheTilesForOfflineUse);

    return () => {
      window.removeEventListener('online', cacheTilesForOfflineUse);
    };
  }, []);

  useEffect(() => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.geolocation ||
      typeof window === 'undefined'
    ) {
      return undefined;
    }

    let isRefreshInFlight = false;

    const refreshCurrentPosition = () => {
      if (isRefreshInFlight) {
        return;
      }

      isRefreshInFlight = true;
      navigator.geolocation.getCurrentPosition(
        (position) => {
          syncUserLocation(position);
          isRefreshInFlight = false;
        },
        (error) => {
          isRefreshInFlight = false;

          if (error.code !== error.PERMISSION_DENIED) {
            // console.warn('[geolocation:refresh] failed:', error);
          }
        },
        GEOLOCATION_REFRESH_OPTIONS
      );
    };

    const watchId = navigator.geolocation.watchPosition(
      syncUserLocation,
      (error) => {
        if (error.code !== error.PERMISSION_DENIED) {
          // console.warn('[geolocation:watch] failed:', error);
        }
      },
      GEOLOCATION_WATCH_OPTIONS
    );

    const handleVisibilityRefresh = () => {
      if (document.visibilityState === 'visible') {
        refreshCurrentPosition();
      }
    };

    const handleFocusRefresh = () => {
      refreshCurrentPosition();
    };

    refreshCurrentPosition();
    // const refreshIntervalId = window.setInterval(
    //   refreshCurrentPosition,
    //   GEOLOCATION_DEBUG_INTERVAL_MS
    // );
    window.addEventListener('focus', handleFocusRefresh);
    document.addEventListener('visibilitychange', handleVisibilityRefresh);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      // window.clearInterval(refreshIntervalId);
      window.removeEventListener('focus', handleFocusRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityRefresh);
    };
  }, [syncUserLocation]);

  // useEffect(() => {
  //   if (typeof window === 'undefined') {
  //     return undefined;
  //   }
  //
  //   const debugIntervalId = window.setInterval(() => {
  //     const coordinates = latestUserLocationRef.current;
  //
  //     if (!isValidCoordinatePair(coordinates)) {
  //       console.log('[geolocation:debug] aucune position disponible');
  //       return;
  //     }
  //
  //     const [longitude, latitude] = coordinates;
  //     const secondsSinceLastUpdate = lastGeolocationUpdateAtRef.current
  //       ? Math.round(
  //           (Date.now() - lastGeolocationUpdateAtRef.current) / 1000
  //         )
  //       : null;
  //
  //     console.log(
  //       `[geolocation:debug] (${latitude} ; ${longitude})${
  //         secondsSinceLastUpdate === null
  //           ? ''
  //           : ` - derniere mise a jour il y a ${secondsSinceLastUpdate}s`
  //       }`
  //     );
  //   }, GEOLOCATION_DEBUG_INTERVAL_MS);
  //
  //   return () => {
  //     window.clearInterval(debugIntervalId);
  //   };
  // }, []);

  useEffect(() => {
    if (!Array.isArray(userLocation) || userLocation.length < 2) {
      return;
    }

    let isMounted = true;
    const [lon, lat] = userLocation;

    // On résout la position courante en libellé lisible pour proposer un
    // départ "Ma position" compréhensible dans les champs d'itinéraire.
    getPlaceFromCoordinates({ lon, lat })
      .then((data) => {
        if (!isMounted) {
          return;
        }

        const resolvedPlace = data.place;

        setUserLocationAddress({
          coordinates: [lon, lat],
          city: resolvedPlace?.city || null,
          secondaryLabel:
            resolvedPlace?.label || resolvedPlace?.name || 'Position actuelle',
        });
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setUserLocationAddress({
          coordinates: [lon, lat],
          city: null,
          secondaryLabel: 'Position actuelle',
        });
      });

    return () => {
      isMounted = false;
    };
  }, [userLocation]);

  const userLocationPlace = useMemo(() => {
    if (!Array.isArray(userLocation) || userLocation.length < 2) {
      return null;
    }

    const [lon, lat] = userLocation;
    const hasResolvedCurrentCoordinates =
      userLocationAddress?.coordinates?.[0] === lon &&
      userLocationAddress?.coordinates?.[1] === lat;

    return {
      id: `current-location-${lon},${lat}`,
      label: 'Ma position',
      name: 'Ma position',
      type: 'address',
      coordinates: [lon, lat],
      city: hasResolvedCurrentCoordinates ? userLocationAddress?.city : null,
      secondaryLabel: hasResolvedCurrentCoordinates
        ? userLocationAddress?.secondaryLabel || 'Position actuelle'
        : 'Position actuelle',
      isUserLocation: true,
    };
  }, [userLocation, userLocationAddress]);

  const selectedJourneyStartCoordinates = useMemo(
    () => getJourneyStartCoordinates(selectedJourney),
    [selectedJourney]
  );
  const isRouteTrackingActive = routeTrackingMessage === "C'est parti";
  const trackedJourneySections = useMemo(
    () => getTrackableJourneySections(selectedJourney),
    [selectedJourney]
  );
  const activeTrackedSection = isRouteTrackingActive
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
    const data = await loginUser(credentials);
    setCurrentUser(data.user);
    setShowAuthPanel(false);
  }

  async function handleRegister(credentials) {
    const data = await registerUser(credentials);
    setCurrentUser(data.user);
    setShowAuthPanel(false);
  }

  async function handlePlanJourney({ from, to }) {
    setIsLoadingJourneys(true);
    setJourneyMessage('');
    setJourneys([]);
    setSelectedJourney(null);
    setIsRouteSheetCtaVisible(false);
    setIsRouteDetailsVisible(false);
    setRouteTrackingMessage('');
    setTrackingPopupMessage('');
    setTrackedStepIndex(0);

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

  async function handleInstallPwa() {
    const promptEvent = installPromptEvent || getPwaInstallPrompt();

    if (!promptEvent) {
      setCacheMessage(
        "L'installation directe n'est pas disponible pour l'instant. Utilisez le bouton Installé dans la barre d'adresse si disponible."
      );
      return;
    }

    setCacheMessage('');
    await promptEvent.prompt();
    const choiceResult = await promptEvent.userChoice;

    if (choiceResult.outcome === 'accepted') {
      setCacheMessage("Installation de l'app lancée.");
      clearPwaInstallPrompt();
      return;
    }

    setCacheMessage("Installation de l'app annulée.");
  }

  function handleJourneySelect(journey) {
    setSelectedJourney(journey);
    setIsRouteSheetCtaVisible(true);
    setIsRouteDetailsVisible(false);
    setRouteTrackingMessage('');
    setTrackingPopupMessage('');
    setTrackedStepIndex(0);
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
    setRouteTrackingMessage((currentMessage) =>
      currentMessage ? '' : currentMessage
    );
    setTrackingPopupMessage((currentMessage) =>
      currentMessage ? '' : currentMessage
    );
    setTrackedStepIndex((currentIndex) =>
      currentIndex !== 0 ? 0 : currentIndex
    );
  }, []);

  const handleRoutesHome = useCallback(() => {
    setShowAuthPanel(false);
    setIsRoutePlannerCollapsed(false);
    setJourneys([]);
    setSelectedJourney(null);
    setJourneyMessage('');
    setIsRouteSheetCtaVisible(false);
    setIsRouteDetailsVisible(false);
    setRouteTrackingMessage('');
    setTrackingPopupMessage('');
    setTrackedStepIndex(0);
    setRoutePlannerResetKey((currentValue) => currentValue + 1);
  }, []);

  const requestCurrentPosition = useCallback(
    () =>
      new Promise((resolve, reject) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          reject(new Error('GEOLOCATION_UNAVAILABLE'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) =>
            resolve([position.coords.longitude, position.coords.latitude]),
          (error) => reject(error),
          GEOLOCATION_REFRESH_OPTIONS
        );
      }),
    []
  );

  const handleStartRouteTracking = useCallback(async () => {
    setRouteTrackingMessage('');
    setTrackingPopupMessage('');

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
  }, [requestCurrentPosition, selectedJourneyStartCoordinates, userLocation]);

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
        onBrandClick={handleRoutesHome}
        onRoutesClick={handleRoutesHome}
      />

      <OfflineCacheToast
        cacheMessage={cacheMessage}
        cacheProgress={null}
        isCachingTiles={false}
        onDismiss={() => setCacheMessage('')}
      />

      <MapActions
        isDarkMode={isDarkMode}
        onInstallPwa={handleInstallPwa}
        onToggleDarkMode={() => setIsDarkMode((currentValue) => !currentValue)}
      />

      <section
        className="map-workspace"
        style={{
          '--route-planner-width': isRoutePlannerCollapsed ? '0px' : '360px',
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
          <RoutePlanner
            key={routePlannerResetKey}
            currentUser={currentUser}
            journeys={journeys}
            selectedJourney={selectedJourney}
            isRouteDetailsVisible={isRouteDetailsVisible}
            isRouteTrackingActive={isRouteTrackingActive}
            currentTrackedStepIndex={currentTrackedStepIndex}
            trackedStepIndex={trackedStepIndex}
            isLoading={isLoadingJourneys}
            message={journeyMessage}
            userLocation={userLocation}
            onTrackedStepChange={setTrackedStepIndex}
            onBackToResults={() => setIsRouteDetailsVisible(false)}
            onJourneySelect={handleJourneySelect}
            onLoginClick={() => setShowAuthPanel(true)}
            onInputsInvalid={handleJourneyInputsInvalid}
            onPlan={handlePlanJourney}
            onSearchPlaces={handleSearchPlaces}
            userLocationPlace={userLocationPlace}
          />
        </div>
        <section className="map-shell" aria-label="Carte">
          <InteractiveMap
            center={PARIS_CENTER}
            zoom={13}
            isDarkMode={isDarkMode}
            stations={[]}
            selectedRoute={selectedJourney}
            focusedSection={activeTrackedSection}
            userLocation={userLocation}
          />
          {selectedJourney && isRouteSheetCtaVisible ? (
            isRouteDetailsVisible ? (
              routeTrackingMessage ? (
                <div
                  className="map-route-cta map-route-status"
                  role="status"
                  aria-live="polite"
                >
                  {routeTrackingMessage}
                </div>
              ) : (
                <button
                  className="btn-primary map-route-cta"
                  type="button"
                  onClick={handleStartRouteTracking}
                >
                  <span>Go</span>
                  <ArrowRight size={18} weight="regular" aria-hidden="true" />
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

      {trackingPopupMessage ? (
        <div className="route-tracking-modal" role="presentation">
          <div
            className="route-tracking-modal__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="route-tracking-modal-title"
          >
            <p id="route-tracking-modal-title">{trackingPopupMessage}</p>
            <button
              className="btn-primary route-tracking-modal__button"
              type="button"
              onClick={() => setTrackingPopupMessage('')}
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
