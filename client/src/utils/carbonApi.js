const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:3000';

async function requestCarbon(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
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

  const data =
    response.status === 204 ? null : await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data?.error || 'Erreur carbone.');
    error.status = response.status;
    throw error;
  }

  return data;
}

export function getRemoteCompletedJourneys() {
  return requestCarbon('/api/carbon/completed-journeys').then(
    (data) => data.journeys || []
  );
}

export function saveRemoteCompletedJourney(journey) {
  return requestCarbon('/api/carbon/completed-journeys', {
    method: 'POST',
    body: JSON.stringify(journey),
  }).then((data) => data.journey);
}
