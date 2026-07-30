const DEFAULT_IDFM_BASE_URL =
  'https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia';

const DEFAULT_TIMEOUT_MS = 8000;

function getConfig() {
  return {
    apiKey: process.env.IDFM_API_KEY,
    baseUrl: (process.env.IDFM_API_BASE_URL || DEFAULT_IDFM_BASE_URL).replace(
      /\/$/,
      ''
    ),
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
  };
}

function normalizePlacesNearby(data) {
  return (data.places_nearby || []).map(normalizePlace).filter(Boolean);
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

export async function fetchNearbyStations(
  { lon, lat, distance = 900, count = 30 },
  { fetchImpl = fetch, signal } = {}
) {
  if (
    !isFiniteCoordinate(lon, -180, 180) ||
    !isFiniteCoordinate(lat, -90, 90)
  ) {
    const error = new Error('Coordonnees invalides.');
    error.status = 400;
    throw error;
  }

  const { apiKey, baseUrl } = getConfig();

  if (!apiKey) {
    const error = new Error('Jeton Ile-de-France Mobilites manquant.');
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
        ? 'Delai depasse pour l API Ile-de-France Mobilites.'
        : 'API Ile-de-France Mobilites inaccessible.';
    throw fetchError;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data.message || data.error || 'Erreur API Ile-de-France Mobilites.'
    );
    error.status = response.status;
    throw error;
  }

  return {
    stations: normalizePlacesNearby(data),
    pagination: data.pagination || null,
  };
}

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
