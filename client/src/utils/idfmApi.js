const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:3000';

async function requestIdfm(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        accept: 'application/json',
        ...options.headers,
      },
    });
  } catch (fetchError) {
    const error = new Error(
      'Impossible de joindre le serveur UrbanFlow Mobility.'
    );
    error.cause = fetchError;
    throw error;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || 'Erreur Ile-de-France Mobilites.');
    error.status = response.status;
    throw error;
  }

  return data;
}

export function getNearbyStations({ lon, lat, distance = 900, count = 30 }) {
  const params = new URLSearchParams({
    lon: String(lon),
    lat: String(lat),
    distance: String(distance),
    count: String(count),
  });

  return requestIdfm(`/api/idfm/nearby-stations?${params.toString()}`);
}

export function getBikeStations({
  lon,
  lat,
  distance = 1500,
  count = 5,
  availability = 'bikes',
}) {
  const params = new URLSearchParams({
    lon: String(lon),
    lat: String(lat),
    distance: String(distance),
    count: String(count),
    availability,
  });

  return requestIdfm(`/api/idfm/bike-stations?${params.toString()}`);
}

export function getDisruptions({ count = 200 } = {}) {
  const params = new URLSearchParams({
    count: String(count),
  });

  return requestIdfm(`/api/idfm/disruptions?${params.toString()}`);
}

export function getBikeStationJourney({
  fromCoordinates,
  toCoordinates,
  startStation,
}) {
  return requestIdfm('/api/idfm/bike-station-journey', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      fromCoordinates,
      toCoordinates,
      startStation,
    }),
  });
}

export function searchPlaces({ query, count = 8 }) {
  const params = new URLSearchParams({
    q: query,
    count: String(count),
  });

  return requestIdfm(`/api/idfm/places?${params.toString()}`);
}

export function getPlaceFromCoordinates({ lon, lat }) {
  const params = new URLSearchParams({
    lon: String(lon),
    lat: String(lat),
  });

  return requestIdfm(`/api/idfm/place-from-coordinates?${params.toString()}`);
}

export function getJourneys({
  from,
  to,
  fromCoordinates,
  toCoordinates,
  wheelchairAccessible = false,
}) {
  const params = new URLSearchParams({
    from,
    to,
  });

  if (fromCoordinates?.length >= 2) {
    params.set('fromLon', String(fromCoordinates[0]));
    params.set('fromLat', String(fromCoordinates[1]));
  }

  if (toCoordinates?.length >= 2) {
    params.set('toLon', String(toCoordinates[0]));
    params.set('toLat', String(toCoordinates[1]));
  }

  if (wheelchairAccessible) {
    params.set('wheelchairAccessible', 'true');
  }

  return requestIdfm(`/api/idfm/journeys?${params.toString()}`);
}
