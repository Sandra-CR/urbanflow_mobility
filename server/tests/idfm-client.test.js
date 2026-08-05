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

test('fetchJourneys affiche toujours marche puis velo avant les transports', async () => {
  const previousApiKey = process.env.IDFM_API_KEY;
  process.env.IDFM_API_KEY = 'test-api-key';

  const fetchImpl = async (url) => {
    const parsedUrl = new URL(url);
    const firstSectionModes = parsedUrl.searchParams.get(
      'first_section_mode[]'
    );

    if (firstSectionModes === 'walking') {
      return {
        ok: true,
        json: async () => ({
          journeys: [
            {
              duration: 900,
              nb_transfers: 0,
              sections: [
                {
                  id: 'transit-section',
                  type: 'public_transport',
                  duration: 900,
                  display_informations: {
                    commercial_mode: 'Metro',
                    label: '1',
                  },
                  geojson: {
                    coordinates: [
                      [2.3522, 48.8566],
                      [2.295, 48.8738],
                    ],
                  },
                },
              ],
            },
          ],
        }),
      };
    }

    return {
      ok: true,
      json: async () => ({ journeys: [] }),
    };
  };

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

    assert.deepEqual(
      result.journeys.map((journey) => journey.profile),
      ['walking', 'bike', 'transit']
    );
  } finally {
    if (previousApiKey) {
      process.env.IDFM_API_KEY = previousApiKey;
    } else {
      delete process.env.IDFM_API_KEY;
    }
  }
});

test('fetchJourneys utilise une geometrie de rue pour les trajets directs de secours', async () => {
  const previousApiKey = process.env.IDFM_API_KEY;
  process.env.IDFM_API_KEY = 'test-api-key';

  const streetGeometry = [
    [2.3522, 48.8566],
    [2.331, 48.864],
    [2.295, 48.8738],
  ];
  const fetchImpl = async (url) => {
    const parsedUrl = new URL(url);

    if (parsedUrl.pathname.startsWith('/route/v1/')) {
      return {
        ok: true,
        json: async () => ({
          routes: [
            {
              duration: 480,
              distance: 4200,
              geometry: {
                coordinates: streetGeometry,
              },
            },
          ],
        }),
      };
    }

    return {
      ok: true,
      json: async () => ({ journeys: [] }),
    };
  };

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

    const walkingJourney = result.journeys.find(
      (journey) => journey.profile === 'walking'
    );
    const bikeJourney = result.journeys.find(
      (journey) => journey.profile === 'bike'
    );

    assert.deepEqual(walkingJourney.geometry, streetGeometry);
    assert.deepEqual(walkingJourney.sections[0].geometry, streetGeometry);
    assert.deepEqual(bikeJourney.geometry, streetGeometry);
    assert.equal(walkingJourney.duration, 3360);
    assert.equal(bikeJourney.duration, 1000);
  } finally {
    if (previousApiKey) {
      process.env.IDFM_API_KEY = previousApiKey;
    } else {
      delete process.env.IDFM_API_KEY;
    }
  }
});
