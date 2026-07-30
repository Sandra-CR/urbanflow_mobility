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
