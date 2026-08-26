import { test } from 'node:test';
import assert from 'node:assert';
import {
  fetchBikeStationJourney,
  fetchBikeStations,
  fetchJourneys,
} from '../idfm/client.js';

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

test('fetchJourneys utilise les coordonnees pour les transports quand elles existent', async () => {
  const previousApiKey = process.env.IDFM_API_KEY;
  process.env.IDFM_API_KEY = 'test-api-key';
  const journeyUrls = [];

  const fetchImpl = async (url) => {
    const parsedUrl = new URL(url);

    if (parsedUrl.pathname.endsWith('/journeys')) {
      journeyUrls.push(parsedUrl);
    }

    return {
      ok: true,
      json: async () => ({ journeys: [] }),
    };
  };

  try {
    await fetchJourneys(
      {
        from: 'favorite:from',
        to: 'favorite:to',
        fromCoordinates: [2.3522, 48.8566],
        toCoordinates: [2.295, 48.8738],
      },
      { fetchImpl }
    );

    const transitUrl = journeyUrls.find(
      (url) => url.searchParams.get('direct_path') === 'none'
    );

    assert.equal(transitUrl.searchParams.get('from'), '2.3522;48.8566');
    assert.equal(transitUrl.searchParams.get('to'), '2.295;48.8738');
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

test('fetchJourneys transforme une marche au meme lieu en changement de quai', async () => {
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
              duration: 120,
              sections: [
                {
                  id: 'platform-change',
                  type: 'street_network',
                  mode: 'walking',
                  duration: 120,
                  from: { name: 'Belleville (Paris)' },
                  to: { name: 'Belleville (Paris)' },
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
    const section = result.journeys.find(
      (journey) => journey.profile === 'transit'
    ).sections[0];

    assert.equal(section.mode, 'platform_change');
    assert.equal(section.label, 'Changement de quai');
    assert.equal(section.duration, 120);
  } finally {
    if (previousApiKey) {
      process.env.IDFM_API_KEY = previousApiKey;
    } else {
      delete process.env.IDFM_API_KEY;
    }
  }
});

test('fetchBikeStations renvoie les bornes avec velos les plus proches', async () => {
  const fetchImpl = async (url) => {
    const parsedUrl = new URL(url);

    if (parsedUrl.pathname.endsWith('/station_information.json')) {
      return {
        ok: true,
        json: async () => ({
          data: {
            stations: [
              {
                station_id: 'near',
                name: 'Borne proche',
                lat: 48.8567,
                lon: 2.3523,
                capacity: 20,
              },
              {
                station_id: 'empty',
                name: 'Borne vide',
                lat: 48.8568,
                lon: 2.3524,
                capacity: 20,
              },
              {
                station_id: 'far',
                name: 'Borne lointaine',
                lat: 48.88,
                lon: 2.39,
                capacity: 20,
              },
            ],
          },
        }),
      };
    }

    return {
      ok: true,
      json: async () => ({
        data: {
          stations: [
            {
              station_id: 'near',
              is_installed: 1,
              is_renting: 1,
              is_returning: 1,
              num_bikes_available: 4,
              num_docks_available: 6,
            },
            {
              station_id: 'empty',
              is_installed: 1,
              is_renting: 1,
              is_returning: 1,
              num_bikes_available: 0,
              num_docks_available: 12,
            },
            {
              station_id: 'far',
              is_installed: 1,
              is_renting: 1,
              is_returning: 1,
              num_bikes_available: 7,
              num_docks_available: 3,
            },
          ],
        },
      }),
    };
  };

  const result = await fetchBikeStations(
    {
      lon: 2.3522,
      lat: 48.8566,
      distance: 500,
      count: 5,
      availability: 'bikes',
    },
    { fetchImpl }
  );

  assert.deepEqual(
    result.stations.map((station) => station.stationId),
    ['near']
  );
  assert.equal(result.stations[0].availableBikes, 4);
});

test('fetchBikeStations transforme une erreur reseau en erreur service velo', async () => {
  await assert.rejects(
    () =>
      fetchBikeStations(
        {
          lon: 2.3522,
          lat: 48.8566,
        },
        {
          fetchImpl: async () => {
            throw new TypeError('fetch failed');
          },
        }
      ),
    (error) => {
      assert.equal(error.status, 502);
      assert.equal(error.message, 'Service de données vélo inaccessible.');
      return true;
    }
  );
});

test('fetchBikeStationJourney compose marche velo marche avec borne retour disponible', async () => {
  const fetchImpl = async (url) => {
    const parsedUrl = new URL(url);

    if (parsedUrl.pathname.endsWith('/station_information.json')) {
      return {
        ok: true,
        json: async () => ({
          data: {
            stations: [
              {
                station_id: 'arrival',
                name: 'Borne arrivee',
                lat: 48.8738,
                lon: 2.295,
                capacity: 18,
              },
            ],
          },
        }),
      };
    }

    if (parsedUrl.pathname.endsWith('/station_status.json')) {
      return {
        ok: true,
        json: async () => ({
          data: {
            stations: [
              {
                station_id: 'arrival',
                is_installed: 1,
                is_renting: 1,
                is_returning: 1,
                num_bikes_available: 2,
                num_docks_available: 5,
              },
            ],
          },
        }),
      };
    }

    return {
      ok: true,
      json: async () => ({
        routes: [
          {
            distance: 420,
            geometry: {
              coordinates: [
                [2.35, 48.85],
                [2.351, 48.851],
              ],
            },
          },
        ],
      }),
    };
  };

  const result = await fetchBikeStationJourney(
    {
      fromCoordinates: [2.3522, 48.8566],
      toCoordinates: [2.2951, 48.8739],
      startStation: {
        stationId: 'start',
        name: 'Borne depart',
        coordinates: [2.353, 48.857],
      },
    },
    { fetchImpl }
  );

  assert.equal(result.journey.profile, 'bike');
  assert.deepEqual(
    result.journey.sections.map((section) => section.mode),
    ['walking', 'bike', 'walking']
  );
  assert.deepEqual(
    result.journey.sections.map((section) => section.label),
    ['Marche', 'Vélo', 'Marche']
  );
  assert.ok(
    result.journey.sections.every(
      (section) => section.departureDateTime && section.arrivalDateTime
    )
  );
  assert.equal(
    result.journey.sections[1].departureDateTime,
    result.journey.sections[0].arrivalDateTime
  );
  assert.equal(
    result.journey.departureDateTime,
    result.journey.sections[0].departureDateTime
  );
  assert.equal(
    result.journey.arrivalDateTime,
    result.journey.sections[2].arrivalDateTime
  );
  assert.equal(result.journey.bikeStations.end.stationId, 'arrival');
});
