import { useCallback, useEffect, useMemo, useState } from 'react';
import { isValidCoordinatePair } from '../utils/geo';

const GEOLOCATION_WATCH_OPTIONS = {
  enableHighAccuracy: false,
  maximumAge: 60000,
  timeout: 30000,
};
const GEOLOCATION_REFRESH_OPTIONS = {
  enableHighAccuracy: false,
  maximumAge: 60000,
  timeout: 10000,
};

function scheduleAfterInitialRender(callback, timeout = 1800) {
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

export function useCurrentLocation({ onPositionChange } = {}) {
  const [userLocation, setUserLocation] = useState(null);
  const [userLocationAddress, setUserLocationAddress] = useState(null);

  const syncUserLocation = useCallback(
    (position) => {
      const nextCoordinates = [
        position.coords.longitude,
        position.coords.latitude,
      ];

      setUserLocation(nextCoordinates);
      onPositionChange?.(nextCoordinates);
    },
    [onPositionChange]
  );

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
        () => {
          isRefreshInFlight = false;
        },
        GEOLOCATION_REFRESH_OPTIONS
      );
    };

    let watchId = null;

    const handleVisibilityRefresh = () => {
      if (document.visibilityState === 'visible') {
        refreshCurrentPosition();
      }
    };

    const cancelInitialGeolocation = scheduleAfterInitialRender(() => {
      refreshCurrentPosition();
      watchId = navigator.geolocation.watchPosition(
        syncUserLocation,
        () => {},
        GEOLOCATION_WATCH_OPTIONS
      );
    });

    window.addEventListener('focus', refreshCurrentPosition);
    document.addEventListener('visibilitychange', handleVisibilityRefresh);

    return () => {
      cancelInitialGeolocation();
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      window.removeEventListener('focus', refreshCurrentPosition);
      document.removeEventListener('visibilitychange', handleVisibilityRefresh);
    };
  }, [syncUserLocation]);

  useEffect(() => {
    if (!isValidCoordinatePair(userLocation)) {
      return undefined;
    }

    let isMounted = true;
    const [lon, lat] = userLocation;

    const cancelReverseGeocode = scheduleAfterInitialRender(() => {
      import('../utils/idfmApi')
        .then(({ getPlaceFromCoordinates }) =>
          getPlaceFromCoordinates({ lon, lat })
        )
        .then((data) => {
          if (!isMounted) {
            return;
          }

          const resolvedPlace = data.place;

          setUserLocationAddress({
            coordinates: [lon, lat],
            city: resolvedPlace?.city || null,
            secondaryLabel:
              resolvedPlace?.label ||
              resolvedPlace?.name ||
              'Position actuelle',
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
    });

    return () => {
      isMounted = false;
      cancelReverseGeocode();
    };
  }, [userLocation]);

  const userLocationPlace = useMemo(() => {
    if (!isValidCoordinatePair(userLocation)) {
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

  return {
    requestCurrentPosition,
    setUserLocation,
    userLocation,
    userLocationPlace,
  };
}
