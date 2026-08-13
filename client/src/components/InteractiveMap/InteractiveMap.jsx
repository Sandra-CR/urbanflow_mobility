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
const ROUTE_MARKER_SOURCE_ID = 'selected-route-markers';
const ROUTE_MARKER_LAYER_ID = 'selected-route-marker-circles';

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

function getRouteFeatures(route) {
  const sectionFeatures = (route?.sections || [])
    .filter((section) => section.geometry?.length > 1)
    .map((section, index) => ({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: section.geometry,
      },
      properties: {
        index,
        mode: section.mode,
        type: section.type,
        color: section.color || '#2563eb',
        pattern:
          section.mode === 'walking'
            ? 'walking'
            : section.mode === 'bike'
              ? 'bike'
              : 'transport',
      },
    }));

  if (sectionFeatures.length > 0) {
    return sectionFeatures;
  }

  if (!route?.geometry?.length) {
    return [];
  }

  return [
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: route.geometry,
      },
      properties: {
        index: 0,
        mode: route.profile,
        type: route.profile,
        color: route.profile === 'bike' ? '#14b8a6' : '#2563eb',
        pattern: route.profile === 'walking' ? 'walking' : route.profile,
      },
    },
  ];
}

function getRouteMarkerFeatures(route) {
  const coordinates = route?.geometry || [];

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
      },
    },
  ];
}

function emptyFeatureCollection(features = []) {
  return {
    type: 'FeatureCollection',
    features,
  };
}

function upsertRouteLayers(map, route) {
  const routeData = emptyFeatureCollection(getRouteFeatures(route));
  const markerData = emptyFeatureCollection(getRouteMarkerFeatures(route));

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

  if (!map.getSource(ROUTE_MARKER_SOURCE_ID)) {
    map.addSource(ROUTE_MARKER_SOURCE_ID, {
      type: 'geojson',
      data: markerData,
    });
    map.addLayer({
      id: ROUTE_MARKER_LAYER_ID,
      type: 'circle',
      source: ROUTE_MARKER_SOURCE_ID,
      paint: {
        'circle-radius': 7,
        'circle-color': [
          'match',
          ['get', 'kind'],
          'start',
          '#16a34a',
          '#dc2626',
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });
  } else {
    map.getSource(ROUTE_MARKER_SOURCE_ID).setData(markerData);
  }
}

function fitRoute(map, route) {
  const coordinates = route?.geometry || [];

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

export default function InteractiveMap({
  center,
  zoom = 13,
  isDarkMode = false,
  stations = [],
  selectedRoute = null,
  className = '',
}) {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const [tileError, setTileError] = useState(false);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const activeStyleRef = useRef(null);
  const initialCenterRef = useRef(center);
  const initialZoomRef = useRef(zoom);
  const initialIsDarkModeRef = useRef(isDarkMode);
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
      upsertRouteLayers(map, selectedRoute);
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

    if (!map.isStyleLoaded()) {
      map.once('load', () => {
        upsertRouteLayers(map, selectedRoute);
        fitRoute(map, selectedRoute);
      });
      return undefined;
    }

    upsertRouteLayers(map, selectedRoute);
    fitRoute(map, selectedRoute);

    return undefined;
  }, [selectedRoute]);

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
