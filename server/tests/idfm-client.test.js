import { test } from 'node:test';
import assert from 'node:assert';
import { fetchJourneys } from '../idfm/client.js';

test('fetchJourneys ajoute marche et vélo quand IDF Mobilités ne renvoie pas de trajet direct', async () => {
  const previousApiKey = process.env.IDFM_API_KEY;
  process.env.IDFM_API_KEY = 'test-api-key';

  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({ journeys: [] }),
  });

  try {
    const result = await fetchJourneys(
      {
        from: 'from-id',
        to: 'to-id',
        fromCoordinates: [2.3522, 48.8566],
        toCoordinates: [2.295, 48.8738],
      },
      { fetchImpl }
    );
    const profiles = result.journeys.map((journey) => journey.profile);

    assert.ok(profiles.includes('walking'));
    assert.ok(profiles.includes('bike'));
    assert.ok(
      result.journeys.every((journey) => journey.geometry?.length === 2)
    );
  } finally {
    if (previousApiKey) {
      process.env.IDFM_API_KEY = previousApiKey;
    } else {
      delete process.env.IDFM_API_KEY;
    }
  }
});
