const DEFAULT_IDFM_BASE_URL =
  'https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia';
const DEFAULT_ROUTING_BASE_URL = 'https://router.project-osrm.org';

const DEFAULT_TIMEOUT_MS = 8000;
const JOURNEY_TIMEOUT_MS = 12000;
const WALKING_SPEED_METERS_PER_SECOND = 1.25;
const BIKE_SPEED_METERS_PER_SECOND = 4.2;
const EARTH_RADIUS_METERS = 6371000;
const JOURNEY_PROFILE_ORDER = {
  walking: 0,
  bike: 1,
};

/**
 * Ligne de transport normalisée pour l'interface.
 *
 * @typedef {object} NormalizedLine
 * @property {string | null} id Identifiant Navitia/IDFM de la ligne.
 * @property {string | null} code Code court affichable.
 * @property {string | null} label Libellé complet affichable.
 * @property {string | null} commercialMode Mode commercial, par exemple Metro ou RER.
 * @property {string | null} physicalMode Mode physique si disponible.
 * @property {string | null} color Couleur hexadécimale de la ligne.
 * @property {string | null} textColor Couleur hexadécimale du texte.
 */

/**
 * Lieu normalisé renvoyé au client.
 *
 * @typedef {object} NormalizedPlace
 * @property {string} id Identifiant du lieu.
 * @property {string} [label] Libellé utilisé par l'autocomplétion.
 * @property {string} name Nom du lieu.
 * @property {string} type Type de lieu : adresse, station ou arrêt.
 * @property {number | null} distance Distance en mètres quand l'API la fournit.
 * @property {number[]} coordinates Coordonnées `[longitude, latitude]`.
 * @property {string | null} city Ville ou région administrative.
 * @property {NormalizedLine[]} lines Lignes desservant le lieu.
 */

/**
 * Segment normalisé d'un itinéraire.
 *
 * @typedef {object} NormalizedJourneySection
 * @property {string} id Identifiant de section.
 * @property {string} type Type Navitia normalisé.
 * @property {string} mode Mode de transport ou de déplacement.
 * @property {string} label Libellé affichable.
 * @property {number} duration Durée en secondes.
 * @property {string | null} from Nom du point de départ.
 * @property {string | null} to Nom du point d'arrivée.
 * @property {string | null} departureDateTime Date de départ Navitia.
 * @property {string | null} arrivalDateTime Date d'arrivée Navitia.
 * @property {string} color Couleur de rendu.
 * @property {string} textColor Couleur de texte.
 * @property {NormalizedLine | null} line Ligne de transport associée.
 * @property {number} distanceKm Distance du segment en kilomètres.
 * @property {number | null} stopCount Nombre d'arrêts intermédiaires.
 * @property {string[]} stops Arrêts de la section.
 * @property {number[][] | null} geometry Géométrie `[longitude, latitude]`.
 */

/**
 * Itinéraire normalisé renvoyé au client.
 *
 * @typedef {object} NormalizedJourney
 * @property {string} id Identifiant stable côté interface.
 * @property {string} profile Profil : walking, bike ou transit.
 * @property {number} duration Durée totale en secondes.
 * @property {number} walkingDuration Durée de marche en secondes.
 * @property {number} bikeDuration Durée vélo en secondes.
 * @property {number} nbTransfers Nombre de correspondances.
 * @property {string | null} departureDateTime Date de départ Navitia.
 * @property {string | null} arrivalDateTime Date d'arrivée Navitia.
 * @property {NormalizedJourneySection[]} sections Sections détaillées.
 * @property {number[][] | null} geometry Géométrie globale `[longitude, latitude]`.
 */

function getConfig() {
  return {
    apiKey: process.env.IDFM_API_KEY,
    baseUrl: (process.env.IDFM_API_BASE_URL || DEFAULT_IDFM_BASE_URL).replace(
      /\/$/,
      ''
    ),
    routingBaseUrl: (
      process.env.ROUTING_API_BASE_URL || DEFAULT_ROUTING_BASE_URL
    ).replace(/\/$/, ''),
  };
}

function isFiniteCoordinate(value, min, max) {
  const numberValue = Number(value);
  return (
    Number.isFinite(numberValue) && numberValue >= min && numberValue <= max
  );
}

function toBoundedInteger(value, { fallback, min, max }) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.min(Math.max(Math.trunc(numberValue), min), max);
}

function toStationType(place) {
  const embeddedType = place.embedded_type;

  if (embeddedType === 'stop_area') {
    return 'transport';
  }

  if (embeddedType === 'stop_point') {
    return 'stop';
  }

  return embeddedType || 'transport';
}

function toOptionalText(value) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (value && typeof value === 'object') {
    return (
      toOptionalText(value.name) ||
      toOptionalText(value.label) ||
      toOptionalText(value.code) ||
      toOptionalText(value.id)
    );
  }

  return null;
}

function normalizeLine(line) {
  if (!line) {
    return null;
  }

  const color = toOptionalText(line.color);
  const textColor = toOptionalText(line.text_color);
  const commercialMode =
    toOptionalText(line.commercial_mode) ||
    toOptionalText(line.commercialMode) ||
    toOptionalText(line.network?.name) ||
    toOptionalText(line.physical_modes?.[0]?.name) ||
    null;
  const code =
    toOptionalText(line.code) ||
    toOptionalText(line.label) ||
    toOptionalText(line.name);

  if (!code && !commercialMode) {
    return null;
  }

  return {
    id: toOptionalText(line.id) || toOptionalText(line.uri) || code,
    code,
    label:
      toOptionalText(line.name) ||
      toOptionalText(line.label) ||
      code ||
      commercialMode,
    commercialMode,
    physicalMode:
      toOptionalText(line.physical_modes?.[0]?.name) ||
      toOptionalText(line.physicalMode) ||
      null,
    color: color ? `#${color.replace(/^#/, '')}` : null,
    textColor: textColor ? `#${textColor.replace(/^#/, '')}` : null,
  };
}

function getPlaceLines(embeddedObject) {
  return (embeddedObject.lines || []).map(normalizeLine).filter(Boolean);
}

function getPlaceCity(embeddedObject) {
  return (
    embeddedObject.address?.city ||
    embeddedObject.administrative_regions?.[0]?.name ||
    null
  );
}

function normalizePlace(place) {
  const embeddedObject = place?.[place.embedded_type] || {};
  const coord = embeddedObject.coord || place.coord;
  const lon = Number(coord?.lon);
  const lat = Number(coord?.lat);

  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    return null;
  }

  return {
    id: place.id || embeddedObject.id,
    name: place.name || embeddedObject.label || embeddedObject.name,
    type: toStationType(place),
    distance: Number.isFinite(Number(place.distance))
      ? Number(place.distance)
      : null,
    coordinates: [lon, lat],
    city: getPlaceCity(embeddedObject),
    lines: getPlaceLines(embeddedObject),
  };
}

function normalizePlacesNearby(data) {
  return (data.places_nearby || []).map(normalizePlace).filter(Boolean);
}

function normalizeSearchPlaces(data) {
  return (data.places || [])
    .map((place) => {
      const normalizedPlace = normalizePlace(place);

      if (!normalizedPlace?.id || !normalizedPlace.name) {
        return null;
      }

      return {
        ...normalizedPlace,
        label: normalizedPlace.name,
      };
    })
    .filter(Boolean);
}

function createIdfmUrl({ lon, lat, distance, count }, baseUrl) {
  const url = new URL(`${baseUrl}/coords/${lon};${lat}/places_nearby`);
  url.searchParams.set('distance', String(distance));
  url.searchParams.set('count', String(count));
  url.searchParams.append('type[]', 'stop_area');
  url.searchParams.set('disable_geojson', 'true');
  url.searchParams.set('disable_disruption', 'true');
  return url;
}

function appendArrayParams(url, name, values) {
  values.forEach((value) => {
    url.searchParams.append(`${name}[]`, value);
  });
}

function createPlacesUrl({ query, count }, baseUrl) {
  const url = new URL(`${baseUrl}/places`);
  url.searchParams.set('q', query);
  url.searchParams.set('count', String(count));
  url.searchParams.append('type[]', 'address');
  url.searchParams.append('type[]', 'stop_area');
  url.searchParams.set('disable_geojson', 'true');
  url.searchParams.set('disable_disruption', 'true');
  return url;
}

function createJourneyUrl(
  {
    from,
    to,
    directPath,
    directPathModes = [],
    firstSectionModes = ['walking'],
    lastSectionModes = ['walking'],
    count,
  },
  baseUrl
) {
  const url = new URL(`${baseUrl}/journeys`);
  url.searchParams.set('from', from);
  url.searchParams.set('to', to);
  url.searchParams.set('count', String(count));
  url.searchParams.set('language', 'fr-FR');
  url.searchParams.set('datetime_represents', 'departure');
  url.searchParams.set('data_freshness', 'realtime');
  url.searchParams.set('direct_path', directPath);
  url.searchParams.set('min_nb_journeys', String(count));
  appendArrayParams(url, 'first_section_mode', firstSectionModes);
  appendArrayParams(url, 'last_section_mode', lastSectionModes);

  if (directPathModes.length > 0) {
    appendArrayParams(url, 'direct_path_mode', directPathModes);
  }

  return url;
}

function toCoordinateParam(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  const lon = Number(coordinates[0]);
  const lat = Number(coordinates[1]);

  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    return null;
  }

  return `${lon};${lat}`;
}

function toCoordinatePair(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  const lon = Number(coordinates[0]);
  const lat = Number(coordinates[1]);

  if (
    !isFiniteCoordinate(lon, -180, 180) ||
    !isFiniteCoordinate(lat, -90, 90)
  ) {
    return null;
  }

  return [lon, lat];
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function getStraightLineDistanceMeters(fromCoordinates, toCoordinates) {
  const [fromLon, fromLat] = fromCoordinates;
  const [toLon, toLat] = toCoordinates;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLon = toRadians(toLon - fromLon);
  const lat1 = toRadians(fromLat);
  const lat2 = toRadians(toLat);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

function getPathDistanceMeters(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  return coordinates
    .slice(1)
    .reduce(
      (totalDistance, coordinate, index) =>
        totalDistance +
        getStraightLineDistanceMeters(coordinates[index], coordinate),
      0
    );
}

function createDirectFallbackJourney({
  profile,
  fromCoordinates,
  toCoordinates,
  route = null,
}) {
  const speed =
    profile === 'bike'
      ? BIKE_SPEED_METERS_PER_SECOND
      : WALKING_SPEED_METERS_PER_SECOND;
  const geometry = route?.geometry || [fromCoordinates, toCoordinates];
  const distance =
    route?.distance ||
    getPathDistanceMeters(geometry) ||
    getStraightLineDistanceMeters(fromCoordinates, toCoordinates);
  const duration = Math.max(60, Math.round(distance / speed));
  const mode = profile === 'bike' ? 'bike' : 'walking';
  const label = profile === 'bike' ? 'Velo' : 'Marche';
  const color = profile === 'bike' ? '#14b8a6' : '#64748b';
  const section = {
    id: `${profile}-direct-fallback-section`,
    type: 'street_network',
    mode,
    label,
    duration,
    from: null,
    to: null,
    departureDateTime: null,
    arrivalDateTime: null,
    color,
    textColor: '#ffffff',
    line: null,
    distanceKm: distance / 1000,
    geometry,
  };

  return {
    id: `${profile}-direct-fallback`,
    profile,
    duration,
    walkingDuration: profile === 'walking' ? duration : 0,
    bikeDuration: profile === 'bike' ? duration : 0,
    nbTransfers: 0,
    departureDateTime: null,
    arrivalDateTime: null,
    sections: [section],
    geometry,
  };
}

function createRoutingUrl(
  { profile, fromCoordinates, toCoordinates },
  baseUrl
) {
  const routingProfile = profile === 'bike' ? 'bike' : 'foot';
  const url = new URL(
    `${baseUrl}/route/v1/${routingProfile}/${fromCoordinates.join(',')};${toCoordinates.join(',')}`
  );
  url.searchParams.set('overview', 'full');
  url.searchParams.set('geometries', 'geojson');
  url.searchParams.set('steps', 'false');
  url.searchParams.set('alternatives', 'false');
  return url;
}

async function fetchStreetRoute(
  { profile, fromCoordinates, toCoordinates },
  { fetchImpl, signal, routingBaseUrl }
) {
  const url = createRoutingUrl(
    { profile, fromCoordinates, toCoordinates },
    routingBaseUrl
  );

  try {
    const response = await fetchImpl(url, {
      signal,
      headers: {
        accept: 'application/json',
      },
    });
    const data = await response.json().catch(() => ({}));
    const route = data.routes?.[0];
    const coordinates = (route?.geometry?.coordinates || []).filter(
      (coordinate) => Array.isArray(coordinate) && coordinate.length >= 2
    );

    if (!response.ok || coordinates.length < 2) {
      return null;
    }

    return {
      distance: Number.isFinite(Number(route.distance))
        ? Number(route.distance)
        : null,
      geometry: simplifyGeometry(coordinates),
    };
  } catch {
    return null;
  }
}

async function requestIdfm(url, { apiKey, fetchImpl, signal }) {
  let response;

  try {
    response = await fetchImpl(url, {
      signal,
      headers: {
        accept: 'application/json',
        apikey: apiKey,
      },
    });
  } catch (fetchError) {
    fetchError.status = fetchError.name === 'AbortError' ? 504 : 502;
    fetchError.message =
      fetchError.name === 'AbortError'
        ? "Délai dépassé pour l'API Ile-de-France Mobilités."
        : 'API Ile-de-France Mobilités inaccessible.';
    throw fetchError;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data.message || data.error || 'Erreur API Ile-de-France Mobilités.'
    );
    error.status = response.status;
    throw error;
  }

  return data;
}

function normalizePlaceName(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function isPlatformChangeSection(section) {
  const fromName = normalizePlaceName(section.from?.name);
  const toName = normalizePlaceName(section.to?.name);

  return (
    section.mode === 'walking' &&
    Boolean(fromName) &&
    Boolean(toName) &&
    fromName === toName
  );
}

function removeCitySuffix(value) {
  return toOptionalText(value)?.replace(/\s+\([^)]*\)\s*$/, '') || null;
}

function getSectionMode(section) {
  if (section.type === 'waiting') {
    return 'waiting';
  }

  if (section.type === 'transfer' || isPlatformChangeSection(section)) {
    return 'platform_change';
  }

  if (section.type === 'public_transport') {
    return (
      section.display_informations?.commercial_mode ||
      section.display_informations?.physical_mode ||
      'Transport'
    );
  }

  return section.mode || section.type || 'section';
}

function getSectionLabel(section) {
  if (section.type === 'waiting') {
    return 'Attente';
  }

  if (section.type === 'transfer' || isPlatformChangeSection(section)) {
    return 'Changement de quai';
  }

  if (section.type === 'public_transport') {
    return (
      removeCitySuffix(section.display_informations?.direction) || 'Transport'
    );
  }

  if (section.mode === 'walking') {
    return 'Marche';
  }

  if (section.mode === 'bike') {
    return 'Vélo';
  }

  return section.type || 'Trajet';
}

function toBikeSection(section) {
  return {
    ...section,
    mode: 'bike',
    label: 'Vélo',
    duration: Math.max(1, Math.round((section.duration || 0) * 0.36)),
    color: '#14b8a6',
    textColor: '#ffffff',
  };
}

function getSectionColor(section) {
  if (section.display_informations?.color) {
    return `#${section.display_informations.color.replace(/^#/, '')}`;
  }

  if (section.mode === 'walking') {
    return '#64748b';
  }

  if (section.mode === 'bike') {
    return '#14b8a6';
  }

  return '#2563eb';
}

function getSectionTextColor(section) {
  if (section.display_informations?.text_color) {
    return `#${section.display_informations.text_color.replace(/^#/, '')}`;
  }

  return '#ffffff';
}

function getSectionLine(section) {
  if (section.type !== 'public_transport') {
    return null;
  }

  return {
    id: section.display_informations?.uris?.line || null,
    code:
      section.display_informations?.code || section.display_informations?.label,
    label: section.display_informations?.label || null,
    name: section.display_informations?.name || null,
    direction: section.display_informations?.direction || null,
    commercialMode: section.display_informations?.commercial_mode || null,
    physicalMode: section.display_informations?.physical_mode || null,
  };
}

function getSectionGeometry(section) {
  const coordinates = (section.geojson?.coordinates || []).filter(
    (coordinate) => Array.isArray(coordinate) && coordinate.length >= 2
  );

  return coordinates.length > 1 ? simplifyGeometry(coordinates, 120) : null;
}

function getSectionDistanceKm(section, geometry) {
  const lengthMeters = Number(section.length);

  if (Number.isFinite(lengthMeters) && lengthMeters >= 0) {
    return lengthMeters / 1000;
  }

  const geometryDistance = getPathDistanceMeters(geometry);

  return geometryDistance ? geometryDistance / 1000 : 0;
}

function getSectionStopCount(section) {
  if (!Array.isArray(section.stop_date_times)) {
    return null;
  }

  return Math.max(0, section.stop_date_times.length - 1);
}

function getSectionStops(section) {
  if (!Array.isArray(section.stop_date_times)) {
    return [];
  }

  return section.stop_date_times
    .map((stopDateTime) =>
      removeCitySuffix(
        stopDateTime.stop_point?.name ||
          stopDateTime.stop_point?.label ||
          stopDateTime.stop_point?.id
      )
    )
    .filter(Boolean);
}

function normalizeSection(section) {
  const geometry = getSectionGeometry(section);

  return {
    id: section.id,
    type: section.type,
    mode: getSectionMode(section),
    label: getSectionLabel(section),
    duration: section.duration || 0,
    from: removeCitySuffix(section.from?.name),
    to: removeCitySuffix(section.to?.name),
    departureDateTime: section.departure_date_time || null,
    arrivalDateTime: section.arrival_date_time || null,
    color: getSectionColor(section),
    textColor: getSectionTextColor(section),
    line: getSectionLine(section),
    distanceKm: getSectionDistanceKm(section, geometry),
    stopCount: getSectionStopCount(section),
    stops: getSectionStops(section),
    geometry,
  };
}

function simplifyGeometry(coordinates, maxPoints = 240) {
  if (coordinates.length <= maxPoints) {
    return coordinates;
  }

  const step = Math.ceil(coordinates.length / maxPoints);
  const simplifiedCoordinates = coordinates.filter(
    (coordinate, index) => index % step === 0
  );
  const lastCoordinate = coordinates[coordinates.length - 1];

  if (
    simplifiedCoordinates[simplifiedCoordinates.length - 1] !== lastCoordinate
  ) {
    simplifiedCoordinates.push(lastCoordinate);
  }

  return simplifiedCoordinates;
}

function normalizeJourney(journey, profile) {
  const rawSections = journey.sections || [];
  const normalizedSections = rawSections.map(normalizeSection);
  const isBikeFallback =
    profile === 'bike' &&
    normalizedSections.length > 0 &&
    normalizedSections.every((section) => section.mode === 'walking');
  const sections = isBikeFallback
    ? normalizedSections.map(toBikeSection)
    : normalizedSections;
  const coordinates = rawSections
    .flatMap((section) => section.geojson?.coordinates || [])
    .filter(
      (coordinate) => Array.isArray(coordinate) && coordinate.length >= 2
    );

  return {
    id: `${profile}-${journey.tags?.join('-') || journey.duration}`,
    profile,
    duration: isBikeFallback
      ? sections.reduce((total, section) => total + section.duration, 0)
      : journey.duration || 0,
    walkingDuration: journey.walking_duration || 0,
    bikeDuration: isBikeFallback
      ? sections.reduce((total, section) => total + section.duration, 0)
      : journey.bike_duration || 0,
    nbTransfers: journey.nb_transfers || 0,
    departureDateTime: journey.departure_date_time || null,
    arrivalDateTime: journey.arrival_date_time || null,
    sections,
    geometry: coordinates.length > 1 ? simplifyGeometry(coordinates) : null,
  };
}

function normalizeJourneys(data, profile) {
  return (data.journeys || []).map((journey) =>
    normalizeJourney(journey, profile)
  );
}

function getJourneyProfileOrder(journey) {
  return JOURNEY_PROFILE_ORDER[journey.profile] ?? 2;
}

function orderJourneys(journeys) {
  return journeys.sort(
    (firstJourney, secondJourney) =>
      getJourneyProfileOrder(firstJourney) -
      getJourneyProfileOrder(secondJourney)
  );
}

/**
 * Recherche les stations de transport proches d'une coordonnée.
 *
 * Les paramètres `distance` et `count` sont bornés pour éviter les requêtes
 * trop larges vers IDF Mobilités.
 *
 * @param {object} params Paramètres de recherche.
 * @param {number | string} params.lon Longitude du point de recherche.
 * @param {number | string} params.lat Latitude du point de recherche.
 * @param {number | string} [params.distance=900] Rayon en mètres, borné entre 100 et 3000.
 * @param {number | string} [params.count=30] Nombre de stations, borné entre 1 et 80.
 * @param {object} [dependencies] Dépendances injectables.
 * @param {Function} [dependencies.fetchImpl] Implémentation compatible fetch.
 * @param {AbortSignal} [dependencies.signal] Signal d'annulation.
 * @returns {Promise<{stations: NormalizedPlace[], pagination: object | null}>}
 * @throws {Error} 400 si les coordonnées sont invalides.
 * @throws {Error} 503 si `IDFM_API_KEY` est absent.
 * @throws {Error} 502/504 si l'API IDF Mobilités échoue ou expire.
 */
export async function fetchNearbyStations(
  { lon, lat, distance = 900, count = 30 },
  { fetchImpl = fetch, signal } = {}
) {
  if (
    !isFiniteCoordinate(lon, -180, 180) ||
    !isFiniteCoordinate(lat, -90, 90)
  ) {
    const error = new Error('Coordonnées invalides.');
    error.status = 400;
    throw error;
  }

  const { apiKey, baseUrl } = getConfig();

  if (!apiKey) {
    const error = new Error('Jeton Ile-de-France Mobilités manquant.');
    error.status = 503;
    throw error;
  }

  const safeDistance = toBoundedInteger(distance, {
    fallback: 900,
    min: 100,
    max: 3000,
  });
  const safeCount = toBoundedInteger(count, {
    fallback: 30,
    min: 1,
    max: 80,
  });
  const url = createIdfmUrl(
    {
      lon: Number(lon),
      lat: Number(lat),
      distance: safeDistance,
      count: safeCount,
    },
    baseUrl
  );

  const data = await requestIdfm(url, { apiKey, fetchImpl, signal });

  return {
    stations: normalizePlacesNearby(data),
    pagination: data.pagination || null,
  };
}

/**
 * Recherche des lieux IDF Mobilités pour l'autocomplétion.
 *
 * Une requête de moins de deux caractères renvoie une liste vide sans appeler
 * l'API distante.
 *
 * @param {object} params Paramètres de recherche.
 * @param {string} params.query Texte saisi par l'utilisateur.
 * @param {number | string} [params.count=8] Nombre de résultats, borné entre 1 et 12.
 * @param {object} [dependencies] Dépendances injectables.
 * @param {Function} [dependencies.fetchImpl] Implémentation compatible fetch.
 * @param {AbortSignal} [dependencies.signal] Signal d'annulation.
 * @returns {Promise<{places: NormalizedPlace[], pagination: object | null}>}
 * @throws {Error} 503 si `IDFM_API_KEY` est absent.
 * @throws {Error} 502/504 si l'API IDF Mobilités échoue ou expire.
 */
export async function searchPlaces(
  { query, count = 8 },
  { fetchImpl = fetch, signal } = {}
) {
  const safeQuery = String(query || '').trim();

  if (safeQuery.length < 2) {
    return {
      places: [],
    };
  }

  const { apiKey, baseUrl } = getConfig();

  if (!apiKey) {
    const error = new Error('Jeton Ile-de-France Mobilités manquant.');
    error.status = 503;
    throw error;
  }

  const safeCount = toBoundedInteger(count, {
    fallback: 8,
    min: 1,
    max: 12,
  });
  const url = createPlacesUrl(
    {
      query: safeQuery,
      count: safeCount,
    },
    baseUrl
  );
  const data = await requestIdfm(url, { apiKey, fetchImpl, signal });

  return {
    places: normalizeSearchPlaces(data),
    pagination: data.pagination || null,
  };
}

/**
 * Calcule les itinéraires marche, vélo et transports entre deux lieux.
 *
 * Le client interroge IDF Mobilités pour trois profils : marche directe, vélo
 * direct et transports. Si les coordonnées sont fournies et qu'IDF Mobilités ne
 * renvoie pas de trajet direct marche ou vélo, un itinéraire de secours est
 * construit avec OSRM. Si OSRM échoue, le fallback utilise une ligne directe
 * entre les deux coordonnées.
 *
 * @param {object} params Paramètres de calcul.
 * @param {string} params.from Identifiant IDF Mobilités du départ.
 * @param {string} params.to Identifiant IDF Mobilités de l'arrivée.
 * @param {number[] | string[]} [params.fromCoordinates] Coordonnées `[longitude, latitude]` du départ.
 * @param {number[] | string[]} [params.toCoordinates] Coordonnées `[longitude, latitude]` de l'arrivée.
 * @param {object} [dependencies] Dépendances injectables.
 * @param {Function} [dependencies.fetchImpl] Implémentation compatible fetch.
 * @param {AbortSignal} [dependencies.signal] Signal d'annulation.
 * @returns {Promise<{journeys: NormalizedJourney[]}>}
 * @throws {Error} 400 si le départ ou l'arrivée est invalide.
 * @throws {Error} 503 si `IDFM_API_KEY` est absent.
 * @throws {Error} 404 si aucun itinéraire n'est trouvé.
 * @throws {Error} 502/504 si l'API IDF Mobilités échoue ou expire.
 */
export async function fetchJourneys(
  { from, to, fromCoordinates, toCoordinates },
  { fetchImpl = fetch, signal } = {}
) {
  const safeFrom = String(from || '').trim();
  const safeTo = String(to || '').trim();

  if (!safeFrom || !safeTo || safeFrom === safeTo) {
    const error = new Error('Départ et arrivée invalides.');
    error.status = 400;
    throw error;
  }

  const { apiKey, baseUrl, routingBaseUrl } = getConfig();

  if (!apiKey) {
    const error = new Error('Jeton Ile-de-France Mobilités manquant.');
    error.status = 503;
    throw error;
  }

  const fromCoordinateParam = toCoordinateParam(fromCoordinates);
  const toCoordinateParamValue = toCoordinateParam(toCoordinates);

  const requests = [
    {
      profile: 'walking',
      from: fromCoordinateParam || safeFrom,
      to: toCoordinateParamValue || safeTo,
      directPathModes: ['walking'],
      firstSectionModes: ['walking'],
      lastSectionModes: ['walking'],
      count: 1,
    },
    {
      profile: 'bike',
      from: fromCoordinateParam || safeFrom,
      to: toCoordinateParamValue || safeTo,
      directPathModes: ['bike'],
      firstSectionModes: ['bike'],
      lastSectionModes: ['bike'],
      count: 1,
    },
    {
      profile: 'transit',
      // Les favoris d'adresse ont des ids internes.
      // Les coordonnées gardent la requête transports valide.
      from: fromCoordinateParam || safeFrom,
      to: toCoordinateParamValue || safeTo,
      directPath: 'none',
      firstSectionModes: ['walking'],
      lastSectionModes: ['walking'],
      count: 5,
    },
  ].map((request) => ({
    profile: request.profile,
    url: createJourneyUrl(
      {
        from: request.from,
        to: request.to,
        directPath: request.directPath || 'only',
        directPathModes: request.directPathModes,
        firstSectionModes: request.firstSectionModes,
        lastSectionModes: request.lastSectionModes,
        count: request.count,
      },
      baseUrl
    ),
  }));

  const settledResponses = await Promise.allSettled(
    requests.map((request) =>
      requestIdfm(request.url, { apiKey, fetchImpl, signal }).then((data) => ({
        profile: request.profile,
        data,
      }))
    )
  );
  const journeys = settledResponses.flatMap((response) => {
    if (response.status === 'rejected') {
      return [];
    }

    return normalizeJourneys(response.value.data, response.value.profile);
  });
  const directFallbackCoordinates = {
    fromCoordinates: toCoordinatePair(fromCoordinates),
    toCoordinates: toCoordinatePair(toCoordinates),
  };

  if (
    directFallbackCoordinates.fromCoordinates &&
    directFallbackCoordinates.toCoordinates
  ) {
    for (const profile of ['walking', 'bike']) {
      if (!journeys.some((journey) => journey.profile === profile)) {
        const route = await fetchStreetRoute(
          {
            profile,
            ...directFallbackCoordinates,
          },
          { fetchImpl, signal, routingBaseUrl }
        );

        journeys.push(
          createDirectFallbackJourney({
            profile,
            ...directFallbackCoordinates,
            route,
          })
        );
      }
    }
  }

  if (journeys.length === 0) {
    const firstError = settledResponses.find(
      (response) => response.status === 'rejected'
    )?.reason;
    const error = new Error(firstError?.message || 'Aucun itinéraire trouvé.');
    error.status = firstError?.status || 404;
    throw error;
  }

  return {
    journeys: orderJourneys(journeys),
  };
}

/**
 * Décore une fonction de recherche de stations avec un timeout court.
 *
 * @param {Function} fetchNearbyStationsImpl Fonction compatible avec `fetchNearbyStations`.
 * @returns {Function} Fonction qui annule la recherche après `DEFAULT_TIMEOUT_MS`.
 */
export function createFetchNearbyStationsWithTimeout(fetchNearbyStationsImpl) {
  return async function fetchNearbyStationsWithTimeout(params) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      return await fetchNearbyStationsImpl(params, {
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  };
}

/**
 * Décore une fonction de recherche de lieux avec un timeout court.
 *
 * @param {Function} searchPlacesImpl Fonction compatible avec `searchPlaces`.
 * @returns {Function} Fonction qui annule la recherche après `DEFAULT_TIMEOUT_MS`.
 */
export function createSearchPlacesWithTimeout(searchPlacesImpl) {
  return async function searchPlacesWithTimeout(params) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      return await searchPlacesImpl(params, {
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  };
}

/**
 * Décore une fonction de calcul d'itinéraires avec un timeout plus long.
 *
 * @param {Function} fetchJourneysImpl Fonction compatible avec `fetchJourneys`.
 * @returns {Function} Fonction qui annule le calcul après `JOURNEY_TIMEOUT_MS`.
 */
export function createFetchJourneysWithTimeout(fetchJourneysImpl) {
  return async function fetchJourneysWithTimeout(params) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), JOURNEY_TIMEOUT_MS);

    try {
      return await fetchJourneysImpl(params, {
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  };
}
