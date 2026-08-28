import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CaretLeft, CaretRight } from '@phosphor-icons/react';
import AccountPage from './components/AccountPage/AccountPage';
import AppNavigation from './components/AppNavigation/AppNavigation';
import AuthPanel from './components/AuthPanel/AuthPanel';
import CarbonPage from './components/CarbonPage/CarbonPage';
import InteractiveMap from './components/InteractiveMap/InteractiveMap';
import MapActions from './components/MapActions/MapActions';
import OfflineCacheToast from './components/OfflineCacheToast/OfflineCacheToast';
import RoutePlanner from './components/RoutePlanner/RoutePlanner';
import { saveCompletedJourney } from './utils/completedJourneysDb';
import {
  deleteCurrentUser,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
} from './utils/authApi';
import {
  getBikeStationJourney,
  getBikeStations,
  getDisruptions,
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
const DESTINATION_PROXIMITY_THRESHOLD_METERS = 80;
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
const THEME_STORAGE_KEY = 'urbanflow-theme';

function getInitialIsDarkMode() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
}
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

function formatStationDistance(distance) {
  const safeDistance = Number(distance);

  if (!Number.isFinite(safeDistance)) {
    return null;
  }

  if (safeDistance < 1000) {
    return `${Math.round(safeDistance)} m`;
  }

  return `${(safeDistance / 1000).toFixed(1)} km`;
}

function formatBikeCount(count) {
  const safeCount = Number(count);
  const bikeCount = Number.isFinite(safeCount) ? safeCount : 0;

  return `${bikeCount} ${bikeCount === 1 ? 'vélo' : 'vélos'}`;
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

function getJourneyEndCoordinates(journey) {
  if (Array.isArray(journey?.geometry)) {
    const lastJourneyCoordinate = journey.geometry[journey.geometry.length - 1];

    if (isValidCoordinatePair(lastJourneyCoordinate)) {
      return lastJourneyCoordinate;
    }
  }

  const sections = journey?.sections || [];

  for (let index = sections.length - 1; index >= 0; index -= 1) {
    const geometry = sections[index]?.geometry;

    if (Array.isArray(geometry)) {
      const lastSectionCoordinate = geometry[geometry.length - 1];

      if (isValidCoordinatePair(lastSectionCoordinate)) {
        return lastSectionCoordinate;
      }
    }
  }

  return null;
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
  const [showAccountPage, setShowAccountPage] = useState(false);
  const [showCarbonPage, setShowCarbonPage] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(getInitialIsDarkMode);
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [isRoutePlannerCollapsed, setIsRoutePlannerCollapsed] = useState(false);
  const [routePlannerResetKey, setRoutePlannerResetKey] = useState(0);
  const [journeys, setJourneys] = useState([]);
  const [disruptions, setDisruptions] = useState([]);
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
  const [cacheMessage, setCacheMessage] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [userLocationAddress, setUserLocationAddress] = useState(null);
  const [routeTrackingMessage, setRouteTrackingMessage] = useState('');
  const [trackingPopupMessage, setTrackingPopupMessage] = useState('');
  const [hasTrackedJourneyCompleted, setHasTrackedJourneyCompleted] =
    useState(false);
  const [trackedStepIndex, setTrackedStepIndex] = useState(0);
  const latestUserLocationRef = useRef(null);
  const isRouteTrackingActiveRef = useRef(false);
  const selectedJourneyEndCoordinatesRef = useRef(null);
  const selectedJourneyRef = useRef(null);
  const savedCompletedJourneyKeyRef = useRef(null);
  const hasStartedTileCacheRef = useRef(false);
  // const lastGeolocationUpdateAtRef = useRef(0);

  const saveCompletedJourneyOnce = useCallback((journey) => {
    if (!journey) {
      return;
    }

    const completedJourneyKey = journey.id || JSON.stringify(journey.geometry);

    if (savedCompletedJourneyKeyRef.current === completedJourneyKey) {
      return;
    }

    savedCompletedJourneyKeyRef.current = completedJourneyKey;
    saveCompletedJourney(journey).catch(() => {
      savedCompletedJourneyKeyRef.current = null;
    });
  }, []);

  const syncUserLocation = useCallback(
    (position) => {
      const nextCoordinates = [
        position.coords.longitude,
        position.coords.latitude,
      ];

      latestUserLocationRef.current = nextCoordinates;
      setUserLocation(nextCoordinates);

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

  const handleSearchPlaces = useCallback(async (query) => {
    const data = await searchPlaces({
      query,
      count: 8,
    });

    return data.places || [];
  }, []);

  const refreshDisruptions = useCallback(() => {
    getDisruptions({ count: 100 })
      .then((data) => {
        setDisruptions(data.disruptions || []);
      })
      .catch(() => {
        setDisruptions([]);
      });
  }, []);

  const clearBikeStationFlow = useCallback(() => {
    setBikeStationPromptJourney(null);
    setBikeStationChoices([]);
    setIsLoadingBikeStations(false);
    setBikeStationMessage('');
  }, []);

  const handleToggleDarkMode = useCallback(() => {
    setIsDarkMode((currentValue) => {
      const nextValue = !currentValue;

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          THEME_STORAGE_KEY,
          nextValue ? 'dark' : 'light'
        );
      }

      return nextValue;
    });
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

  useEffect(() => {
    refreshDisruptions();
  }, [refreshDisruptions]);

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
  const activeTrackedSection = isRouteTrackingActive && !isTrackedJourneyComplete
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
    setShowAccountPage(false);
    setShowCarbonPage(false);
  }

  async function handleRegister(credentials) {
    const data = await registerUser(credentials);
    setCurrentUser(data.user);
    setShowAuthPanel(false);
    setShowAccountPage(false);
    setShowCarbonPage(false);
  }

  async function handleLogout() {
    await logoutUser();
    setCurrentUser(null);
    setShowAuthPanel(false);
    setShowAccountPage(false);
    setShowCarbonPage(false);
  }

  async function handleDeleteAccount() {
    await deleteCurrentUser();
    setCurrentUser(null);
    setShowAuthPanel(false);
    setShowAccountPage(false);
    setShowCarbonPage(false);
  }

  async function handlePlanJourney({ from, to }) {
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
      const data = await getJourneys({
        from: from.id,
        to: to.id,
        fromCoordinates: from.coordinates,
        toCoordinates: to.coordinates,
      });
      const nextJourneys = data.journeys || [];

      refreshDisruptions();
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
        "L'installation directe n'est pas disponible pour l'instant. Utilisez le bouton Installer dans la barre d'adresse si disponible."
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
    setShowAuthPanel(false);
    setShowAccountPage(false);
    setShowCarbonPage(false);
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
    setShowAuthPanel(false);
    setShowAccountPage(false);
    setShowCarbonPage(true);
  }, []);

  const handleCloseTrackedJourneyComplete = useCallback(() => {
    handleRoutesHome();
  }, [handleRoutesHome]);

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
    userLocation,
  ]);

  return (
    <main
      className="map-test-page app-surface"
      data-theme={isDarkMode ? 'dark' : 'light'}
    >
      <AppNavigation
        currentUser={currentUser}
        isDarkMode={isDarkMode}
        isAuthPanelOpen={showAuthPanel || showAccountPage}
        isCarbonPageOpen={showCarbonPage}
        onAccountClick={() => {
          if (currentUser) {
            setShowAuthPanel(false);
            setShowAccountPage(true);
            setShowCarbonPage(false);
          } else {
            setShowAuthPanel(true);
            setShowCarbonPage(false);
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

      {!showAccountPage && !showCarbonPage ? (
        <MapActions
          isDarkMode={isDarkMode}
          onInstallPwa={handleInstallPwa}
          onToggleDarkMode={handleToggleDarkMode}
        />
      ) : null}

      {showCarbonPage ? (
        <CarbonPage
          isDarkMode={isDarkMode}
          onToggleDarkMode={handleToggleDarkMode}
        />
      ) : showAccountPage && currentUser ? (
        <AccountPage
          currentUser={currentUser}
          isDarkMode={isDarkMode}
          onDeleteAccount={handleDeleteAccount}
          onLogout={handleLogout}
          onSearchPlaces={handleSearchPlaces}
          onToggleDarkMode={handleToggleDarkMode}
        />
      ) : (
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
              disruptions={disruptions}
              journeys={journeys}
              selectedJourney={selectedJourney}
              isRouteDetailsVisible={isRouteDetailsVisible}
              isRouteTrackingActive={isRouteTrackingActive}
              isTrackedJourneyComplete={isTrackedJourneyComplete}
              currentTrackedStepIndex={currentTrackedStepIndex}
              trackedStepIndex={trackedStepIndex}
              isLoading={isLoadingJourneys}
              message={journeyMessage}
              userLocation={userLocation}
              onTrackedStepChange={setTrackedStepIndex}
              onBackToResults={() => setIsRouteDetailsVisible(false)}
              onTrackedJourneyCompleteClose={handleCloseTrackedJourneyComplete}
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
              stations={bikeStationChoices}
              selectedRoute={selectedJourney}
              focusedSection={activeTrackedSection}
              isJourneyComplete={isTrackedJourneyComplete}
              onStationSelect={handleBikeStationSelect}
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

      {bikeStationPromptJourney ? (
        <div
          className="route-tracking-modal bike-station-modal-overlay"
          data-mode={bikeStationChoices.length > 0 ? 'stations' : 'prompt'}
          role="presentation"
        >
          <div
            className="route-tracking-modal__dialog bike-station-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bike-station-modal-title"
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
