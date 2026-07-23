import { useEffect, useMemo, useRef, useState } from 'react';
import { WifiSlash } from '@phosphor-icons/react';
import * as maplibregl from 'maplibre-gl';
import { TILE_URLS } from '../utils/offlineMapTiles';
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

export default function InteractiveMap({
  center,
  zoom = 13,
  isDarkMode = false,
  stations = [],
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

    // On capture la camera avant le changement de style pour ne pas perdre
    // la position courante choisie par l'utilisateur.
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
    });
  }, [mapStyle, styleKey]);

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
