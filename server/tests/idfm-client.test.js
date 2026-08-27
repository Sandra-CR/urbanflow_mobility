import { test } from 'node:test';
import assert from 'node:assert';
import {
  fetchBikeStationJourney,
  fetchBikeStations,
  fetchDisruptions,
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

test('fetchDisruptions trie les interruptions puis perturbations hors bus', async () => {
  const previousApiKey = process.env.IDFM_API_KEY;
  process.env.IDFM_API_KEY = 'test-api-key';
  const requestedUrls = [];
  const now = new Date('2026-08-27T10:00:00');

  const fetchImpl = async (url) => {
    requestedUrls.push(new URL(url));

    return {
      ok: true,
      json: async () => ({
        disruptions: [
          {
            id: 'tram-delay',
            status: 'active',
            severity: { effect: 'SIGNIFICANT_DELAYS', name: 'Retards' },
            messages: [{ text: '<b>Retards</b> sur **Biblioth&#232;que**' }],
            application_periods: [
              { begin: '20260827T080000', end: '20260827T120000' },
            ],
          },
          {
            id: 'rer-stop',
            status: 'active',
            severity: { effect: 'NO_SERVICE', name: 'Trafic interrompu' },
            messages: [{ text: 'Trafic interrompu sur le RER C' }],
            application_periods: [
              { begin: '20260827T060000', end: '20260827T110000' },
            ],
          },
          {
            id: 'rer-delay',
            status: 'active',
            severity: { effect: 'SIGNIFICANT_DELAYS', name: 'Retards' },
            messages: [{ text: 'Retards sur le RER C' }],
            application_periods: [
              { begin: '20260827T060000', end: '20260827T110000' },
            ],
          },
          {
            id: 'metro-stop',
            status: 'active',
            severity: { effect: 'NO_SERVICE', name: 'Trafic interrompu' },
            messages: [{ text: 'Trafic interrompu sur le metro 1' }],
            application_periods: [
              { begin: '20260827T090000', end: '20260827T103000' },
            ],
          },
          {
            id: 'rapid-weekend',
            status: 'futur',
            severity: { effect: 'SIGNIFICANT_DELAYS', name: 'Retards' },
            messages: [{ text: 'Travaux ce weekend sur la ligne N' }],
            application_periods: [
              { begin: '20260829T000000', end: '20260830T235959' },
            ],
          },
          {
            id: 'rer-weekend-text',
            status: 'active',
            severity: { effect: 'SIGNIFICANT_DELAYS', name: 'Retards' },
            messages: [
              {
                text: 'RER C : entre Champ de Mars et Pontoise les 05-06/09 et 19-20/09',
              },
            ],
            application_periods: [
              { begin: '20260827T060000', end: '20260827T110000' },
            ],
          },
          {
            id: 'metro-weekend-html',
            status: 'active',
            severity: { effect: 'NO_SERVICE', name: 'Trafic interrompu' },
            messages: [
              {
                text: '<p>P&#233;riode : les week-ends, toute la journ&#233;e.<br><br>Dates : du samedi 29 au dimanche 30 ao&#251;t.<br><br>Le trafic est interrompu entre Gare du Nord et Denfert-Rochereau</p>',
              },
            ],
            application_periods: [
              { begin: '20260827T060000', end: '20260827T110000' },
            ],
          },
          {
            id: 'rer-long-range',
            status: 'active',
            severity: { effect: 'SIGNIFICANT_DELAYS', name: 'Retards' },
            messages: [
              {
                text: 'RER B : Châtelet <-> Aéroport CDG2 - Mitry - Claye 01/06-31/12',
              },
            ],
            application_periods: [
              { begin: '20260827T060000', end: '20260827T110000' },
            ],
          },
          {
            id: 'rer-c-summer',
            status: 'active',
            severity: { effect: 'SIGNIFICANT_DELAYS', name: 'Retards' },
            messages: [
              {
                text: 'RER C : toute la journee du 6 juillet au 30 aout, Orly Ville non desservie',
              },
            ],
            application_periods: [
              { begin: '20260827T060000', end: '20260827T110000' },
            ],
            impacted_objects: [
              {
                pt_object: {
                  embedded_type: 'line',
                  line: {
                    id: 'line:rer:C',
                    code: 'C',
                    name: 'RER C',
                    commercial_mode: 'RER',
                  },
                },
              },
            ],
          },
          {
            id: 'rer-d-open-start',
            status: 'active',
            severity: { effect: 'SIGNIFICANT_DELAYS', name: 'Trafic reduit' },
            messages: [
              {
                text: 'RER D : a partir du 24 aout, le trafic est reduit',
              },
            ],
            application_periods: [
              { begin: '20260827T060000', end: '20260827T110000' },
            ],
            impacted_objects: [
              {
                pt_object: {
                  embedded_type: 'line',
                  line: {
                    id: 'line:rer:D',
                    code: 'D',
                    name: 'RER D',
                    commercial_mode: 'RER',
                  },
                },
              },
            ],
          },
          {
            id: 'tram-vague',
            status: 'active',
            severity: { effect: 'SIGNIFICANT_DELAYS', name: 'Retards' },
            messages: [{ text: 'Arrêt(s) non desservi(s)' }],
            application_periods: [
              { begin: '20260827T060000', end: '20260827T110000' },
            ],
          },
          {
            id: 'bus-delay',
            status: 'active',
            severity: { effect: 'SIGNIFICANT_DELAYS', name: 'Retards' },
            messages: [{ text: 'Retards sur le bus 42' }],
          },
        ],
        traffic_reports: [
          {
            lines: [
              {
                id: 'line:tram:T3A',
                code: 'T3a',
                name: 'T3a',
                commercial_mode: 'Tram',
                links: [{ type: 'disruption', id: 'tram-delay' }],
              },
              {
                id: 'line:rer:C',
                code: 'C',
                name: 'RER C',
                commercial_mode: 'RER',
                links: [
                  { type: 'disruption', id: 'rer-stop' },
                  { type: 'disruption', id: 'rer-delay' },
                  { type: 'disruption', id: 'rer-weekend-text' },
                ],
              },
              {
                id: 'line:metro:1',
                code: '1',
                name: 'Metro 1',
                commercial_mode: 'Metro',
                links: [
                  { type: 'disruption', id: 'metro-stop' },
                  { type: 'disruption', id: 'metro-weekend-html' },
                ],
              },
              {
                id: 'line:rer:B',
                code: 'B',
                name: 'RER B',
                commercial_mode: 'RER',
                links: [{ type: 'disruption', id: 'rer-long-range' }],
              },
              {
                id: 'line:rapid:N',
                code: 'N',
                name: 'Ligne N',
                commercial_mode: 'Train',
                links: [{ type: 'disruption', id: 'rapid-weekend' }],
              },
              {
                id: 'line:tram:T2',
                code: 'T2',
                name: 'T2',
                commercial_mode: 'Tram',
                links: [{ type: 'disruption', id: 'tram-vague' }],
              },
              {
                id: 'line:bus:42',
                code: '42',
                name: 'Bus 42',
                commercial_mode: 'Bus',
                links: [{ type: 'disruption', id: 'bus-delay' }],
              },
            ],
          },
        ],
        pagination: { total_result: 12 },
      }),
    };
  };

  try {
    const result = await fetchDisruptions({ count: 12 }, { fetchImpl, now });

    assert.equal(requestedUrls[0].pathname.endsWith('/traffic_reports'), true);
    assert.equal(requestedUrls[0].searchParams.get('count'), '12');
    assert.equal(requestedUrls[0].searchParams.get('since'), '20260827T100000');
    assert.equal(requestedUrls[0].searchParams.get('until'), '20260827T100000');
    assert.deepEqual(
      result.disruptions.map((disruption) => disruption.id),
      ['line:metro:1', 'line:rer:C', 'line:rer:B', 'line:rer:D', 'line:tram:T3A']
    );
    assert.deepEqual(
      result.disruptions.map((disruption) => disruption.type),
      [
        'interruption',
        'interruption',
        'perturbation',
        'perturbation',
        'perturbation',
      ]
    );
    assert.equal(result.disruptions[0].line.code, '1');
    assert.equal(result.disruptions[1].count, 3);
    assert.equal(result.disruptions[4].message, 'Retards sur Bibliothèque');
    assert.equal(result.pagination.total_result, 12);
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
