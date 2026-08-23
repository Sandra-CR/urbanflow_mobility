import { useEffect, useMemo, useRef, useState } from 'react';
import { WifiSlash } from '@phosphor-icons/react';
import * as maplibregl from 'maplibre-gl';
import { TILE_URLS } from '../../utils/offlineMapTiles';
import 'maplibre-gl/dist/maplibre-gl.css';
import './InteractiveMap.css';

const LIGHT_STYLE = {
  version: 8,
  sources: {
    cartoLight: {
      type: 'raster',
      tiles: [TILE_URLS.light],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    {
      id: 'carto-light',
      type: 'raster',
      source: 'cartoLight',
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

const DARK_STYLE = {
  version: 8,
  sources: {
    cartoDark: {
      type: 'raster',
      tiles: [TILE_URLS.dark],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    {
      id: 'carto-dark',
      type: 'raster',
      source: 'cartoDark',
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

const ROUTE_SOURCE_ID = 'selected-route';
const ROUTE_TRANSPORT_LAYER_ID = 'selected-route-transport-line';
const ROUTE_WALK_LAYER_ID = 'selected-route-walk-line';
const ROUTE_BIKE_LAYER_ID = 'selected-route-bike-line';

function getOnlineStyle(isDarkMode) {
  return isDarkMode ? DARK_STYLE : LIGHT_STYLE;
}

function createStationMarker(station) {
  const marker = document.createElement('button');
  marker.type = 'button';
  marker.className = `station-marker station-marker--${station.type || 'default'}`;
  marker.setAttribute('aria-label', station.name);
  marker.title = station.name;

  return marker;
}

function createStationPopup(station) {
  const content = document.createElement('div');
  content.className = 'station-popup';

  const name = document.createElement('strong');
  name.textContent = station.name;
  content.appendChild(name);

  if (station.type) {
    const type = document.createElement('span');
    type.textContent = station.type;
    content.appendChild(type);
  }

  return content;
}

function toRouteCoordinate(coordinate) {
  if (!Array.isArray(coordinate) || coordinate.length < 2) {
    return null;
  }

  const lon = Number(coordinate[0]);
  const lat = Number(coordinate[1]);

  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    return null;
  }

  return [lon, lat];
}

function toRouteGeometry(geometry) {
  if (!Array.isArray(geometry)) {
    return [];
  }

  return geometry.map(toRouteCoordinate).filter(Boolean);
}

function getRoutePattern(mode) {
  if (mode === 'walking' || mode === 'bike') {
    return mode;
  }

  return 'transport';
}

function getRouteFeatures(route) {
  const sectionFeatures = (route?.sections || [])
    .map((section, index) => ({
      coordinates: toRouteGeometry(section.geometry),
      index,
      section,
    }))
    .filter(({ coordinates }) => coordinates.length > 1)
    .map(({ coordinates, index, section }) => ({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates,
      },
      properties: {
        index,
        mode: section.mode,
        type: section.type,
        color: section.color || '#2563eb',
        pattern: getRoutePattern(section.mode),
      },
    }));

  if (sectionFeatures.length > 0) {
    return sectionFeatures;
  }

  const coordinates = toRouteGeometry(route?.geometry);

  if (coordinates.length < 2) {
    return [];
  }

  return [
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates,
      },
      properties: {
        index: 0,
        mode: route.profile,
        type: route.profile,
        color: route.profile === 'bike' ? '#14b8a6' : '#2563eb',
        pattern: getRoutePattern(route.profile),
      },
    },
  ];
}

function getRouteMarkerFeatures(route) {
  const coordinates = getRouteCoordinates(route);

  if (coordinates.length < 2) {
    return [];
  }

  return [
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: coordinates[0],
      },
      properties: {
        kind: 'start',
        label: 'Départ',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: coordinates[coordinates.length - 1],
      },
      properties: {
        kind: 'end',
        label: 'Arrivée',
      },
    },
  ];
}

function getRouteCoordinates(route) {
  const routeGeometry = toRouteGeometry(route?.geometry);

  if (routeGeometry.length > 1) {
    return routeGeometry;
  }

  return (route?.sections || [])
    .flatMap((section) => toRouteGeometry(section.geometry))
    .filter(Boolean);
}

function emptyFeatureCollection(features = []) {
  return {
    type: 'FeatureCollection',
    features,
  };
}

function createRouteEndpointMarker(kind) {
  const marker = document.createElement('div');
  marker.className = 'route-endpoint-marker';

  const bubble = document.createElement('div');
  bubble.className = 'route-endpoint-marker__bubble';
  bubble.textContent = kind === 'start' ? 'Départ' : 'Arrivée';

  const point = document.createElement('div');
  point.className = 'route-endpoint-marker__point';

  marker.appendChild(bubble);
  marker.appendChild(point);

  return marker;
}

function upsertRouteLayers(map, route) {
  const routeData = emptyFeatureCollection(getRouteFeatures(route));

  if (!map.getSource(ROUTE_SOURCE_ID)) {
    map.addSource(ROUTE_SOURCE_ID, {
      type: 'geojson',
      data: routeData,
    });
    [
      {
        id: ROUTE_TRANSPORT_LAYER_ID,
        filter: ['==', ['get', 'pattern'], 'transport'],
        dasharray: null,
        width: 6,
      },
      {
        id: ROUTE_BIKE_LAYER_ID,
        filter: ['==', ['get', 'pattern'], 'bike'],
        dasharray: [1.4, 0.8],
        width: 5,
      },
      {
        id: ROUTE_WALK_LAYER_ID,
        filter: ['==', ['get', 'pattern'], 'walking'],
        dasharray: [0.3, 1.2],
        width: 4,
      },
    ].forEach((layer) => {
      map.addLayer({
        id: layer.id,
        type: 'line',
        source: ROUTE_SOURCE_ID,
        filter: layer.filter,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': ['coalesce', ['get', 'color'], '#2563eb'],
          'line-width': layer.width,
          'line-opacity': 0.9,
          ...(layer.dasharray ? { 'line-dasharray': layer.dasharray } : {}),
        },
      });
    });
  } else {
    map.getSource(ROUTE_SOURCE_ID).setData(routeData);
  }
}

function fitRoute(map, route) {
  const coordinates = getRouteCoordinates(route);

  if (coordinates.length < 2) {
    return;
  }

  const bounds = coordinates.reduce(
    (currentBounds, coordinate) => currentBounds.extend(coordinate),
    new maplibregl.LngLatBounds(coordinates[0], coordinates[0])
  );

  map.fitBounds(bounds, {
    padding: {
      top: 80,
      right: 80,
      bottom: 80,
      left: 80,
    },
    maxZoom: 15,
    duration: 550,
  });
}

function drawRoute(map, route, { shouldFit = false } = {}) {
  if (!map.isStyleLoaded()) {
    return false;
  }

  upsertRouteLayers(map, route);

  if (shouldFit) {
    fitRoute(map, route);
  }

  return true;
}

function drawRouteWhenReady(map, route, { shouldFit = false } = {}) {
  let timeoutId = null;
  let isCancelled = false;

  const clearListeners = () => {
    map.off('load', tryDrawRoute);
    map.off('style.load', tryDrawRoute);
    map.off('styledata', tryDrawRoute);
    map.off('idle', tryDrawRoute);
  };

  const scheduleRetry = () => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(tryDrawRoute, 80);
  };

  function tryDrawRoute() {
    if (isCancelled) {
      return;
    }

    if (drawRoute(map, route, { shouldFit })) {
      window.clearTimeout(timeoutId);
      clearListeners();
      return;
    }

    scheduleRetry();
  }

  map.on('load', tryDrawRoute);
  map.on('style.load', tryDrawRoute);
  map.on('styledata', tryDrawRoute);
  map.on('idle', tryDrawRoute);
  tryDrawRoute();

  return () => {
    isCancelled = true;
    window.clearTimeout(timeoutId);
    clearListeners();
  };
}

/**
 * Affiche la carte MapLibre, les stations, l'itinéraire actif et, si le
 * navigateur l'autorise, la position courante de l'utilisateur.
 *
 * La carte se recentre sur cette position quand elle devient disponible après
 * la demande d'autorisation. En revanche, si un itinéraire est sélectionné,
 * le cadrage de cet itinéraire reste prioritaire.
 *
 * @param {object} props Propriétés du composant.
 * @param {[number, number]} props.center Centre initial de la carte.
 * @param {number} [props.zoom=13] Niveau de zoom initial.
 * @param {boolean} [props.isDarkMode=false] Active le style sombre.
 * @param {Array<object>} [props.stations=[]] Marqueurs de stations à afficher.
 * @param {object | null} [props.selectedRoute=null] Itinéraire actuellement affiché.
 * @param {[number, number] | null} [props.userLocation=null] Position navigateur `[lon, lat]`.
 * @param {string} [props.className=''] Classe CSS racine additionnelle.
 * @returns {JSX.Element} Carte interactive UrbanFlow.
 */
export default function InteractiveMap({
  center,
  zoom = 13,
  isDarkMode = false,
  stations = [],
  selectedRoute = null,
  userLocation = null,
  className = '',
}) {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const [tileError, setTileError] = useState(false);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const routeEndpointMarkersRef = useRef([]);
  const userLocationMarkerRef = useRef(null);
  const activeStyleRef = useRef(null);
  const initialCenterRef = useRef(center);
  const initialZoomRef = useRef(zoom);
  const initialIsDarkModeRef = useRef(isDarkMode);
  const lastUserLocationKeyRef = useRef(null);
  const styleKey = isDarkMode ? 'dark' : 'light';
  const mapStyle = useMemo(() => getOnlineStyle(isDarkMode), [isDarkMode]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setTileError(false);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return undefined;
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: getOnlineStyle(initialIsDarkModeRef.current),
      center: initialCenterRef.current,
      zoom: initialZoomRef.current,
      pitch: 0,
      bearing: 0,
      attributionControl: true,
    });
    activeStyleRef.current = initialIsDarkModeRef.current ? 'dark' : 'light';

    // Vue 2D uniquement : moins de calcul GPU, plus sobre pour une PWA mobile.
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();
    map.setPitch(0);

    map.addControl(
      new maplibregl.NavigationControl({
        showCompass: false,
        showZoom: true,
        visualizePitch: false,
      }),
      'bottom-right'
    );

    map.on('error', (event) => {
      console.error('MapLibre error:', event.error);
      setTileError(true);
    });

    // Garde la carte nette quand son parent change de taille.
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(mapContainerRef.current);

    mapRef.current = map;

    return () => {
      resizeObserver.disconnect();
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      routeEndpointMarkersRef.current.forEach((marker) => marker.remove());
      routeEndpointMarkersRef.current = [];
      userLocationMarkerRef.current?.remove();
      userLocationMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
      activeStyleRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || activeStyleRef.current === styleKey) {
      return;
    }

    // On capture la caméra avant le changement de style pour ne pas perdre la position choisie par l'utilisateur.
    const camera = {
      center: map.getCenter(),
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: 0,
    };

    activeStyleRef.current = styleKey;
    setTileError(false);
    map.setStyle(mapStyle);
    map.once('styledata', () => {
      map.jumpTo(camera);
      drawRouteWhenReady(map, selectedRoute);
    });
  }, [mapStyle, selectedRoute, styleKey]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = stations.map((station) => {
      const popup = new maplibregl.Popup({
        offset: 16,
        closeButton: false,
        className: 'station-popup-frame',
      }).setDOMContent(createStationPopup(station));

      return new maplibregl.Marker({
        element: createStationMarker(station),
        anchor: 'center',
      })
        .setLngLat(station.coordinates)
        .setPopup(popup)
        .addTo(map);
    });
  }, [stations]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return undefined;
    }

    return drawRouteWhenReady(map, selectedRoute, { shouldFit: true });
  }, [selectedRoute]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    routeEndpointMarkersRef.current.forEach((marker) => marker.remove());
    routeEndpointMarkersRef.current = [];

    const endpointFeatures = getRouteMarkerFeatures(selectedRoute);

    routeEndpointMarkersRef.current = endpointFeatures.map((feature) =>
      new maplibregl.Marker({
        element: createRouteEndpointMarker(feature.properties.kind),
        anchor: 'bottom',
      })
        .setLngLat(feature.geometry.coordinates)
        .addTo(map)
    );
  }, [selectedRoute]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    if (!userLocation) {
      userLocationMarkerRef.current?.remove();
      userLocationMarkerRef.current = null;
      lastUserLocationKeyRef.current = null;
      return;
    }

    if (!userLocationMarkerRef.current) {
      const markerElement = document.createElement('div');
      markerElement.className = 'user-location-marker';
      markerElement.setAttribute('aria-label', 'Votre position');

      userLocationMarkerRef.current = new maplibregl.Marker({
        element: markerElement,
        anchor: 'center',
      })
        .setLngLat(userLocation)
        .addTo(map);
    } else {
      userLocationMarkerRef.current.setLngLat(userLocation);
    }

    const locationKey = userLocation.join(',');

    // On recentre dès que la position est connue ou évolue, sauf si
    // l'utilisateur est en train de consulter un itinéraire cadré.
    if (selectedRoute || lastUserLocationKeyRef.current === locationKey) {
      return;
    }

    lastUserLocationKeyRef.current = locationKey;
    map.easeTo({
      center: userLocation,
      duration: 650,
      essential: true,
    });
  }, [selectedRoute, userLocation]);

  return (
    <div className={`interactive-map ${className}`}>
      <div ref={mapContainerRef} className="interactive-map__canvas" />
      {!isOnline ? (
        <div className="interactive-map__status" role="status">
          <WifiSlash
            className="interactive-map__status-icon"
            size={16}
            weight="bold"
            aria-hidden="true"
          />
          <span>Hors ligne</span>
        </div>
      ) : null}
      {tileError ? (
        <div className="interactive-map__warning" role="status">
          Certaines tuiles ne sont pas encore en cache.
        </div>
      ) : null}
    </div>
  );
}
