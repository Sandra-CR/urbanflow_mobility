import { test } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import { createIdfmRouter } from '../idfm/routes.js';

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${port}`,
      });
    });
  });
}

test('la route journeys garde les itinéraires si un facteur carbone manque', async () => {
  const app = express();
  const journey = {
    id: 'journey-1',
    duration: 600,
    profile: 'transit',
    sections: [{ mode: 'RER', distanceKm: 4 }],
  };
  const calculateCarbonFootprint = async () => {
    const error = new Error(
      'Mode de transport inconnu dans carbon_factors: rer.'
    );
    error.status = 400;
    error.code = 'UNKNOWN_CARBON_FACTOR';
    error.modes = ['rer'];
    throw error;
  };

  app.use(
    '/api/idfm',
    createIdfmRouter({
      fetchJourneys: async () => ({ journeys: [journey] }),
      calculateCarbonFootprint,
    })
  );

  const { server, baseUrl } = await listen(app);

  try {
    const response = await fetch(
      `${baseUrl}/api/idfm/journeys?from=from-id&to=to-id`
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.journeys.length, 1);
    assert.equal(body.journeys[0].id, 'journey-1');
    assert.equal(
      body.carbonFootprintMessage,
      'Le calcul de carbone ne trouve pas les données nécessaires (rer).'
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('la route journeys ajoute la comparaison carbone avec voiture solo', async () => {
  const app = express();
  const journey = {
    id: 'journey-1',
    duration: 600,
    profile: 'walking',
    sections: [{ mode: 'walking', distanceKm: 2 }],
  };
  const calculateCarbonFootprint = async (itinerary) => {
    const mode = itinerary.legs[0]?.mode;

    return {
      total_co2e: mode === 'voiture_solo' ? 436 : 0,
      unit: 'g',
      segments: [],
    };
  };

  app.use(
    '/api/idfm',
    createIdfmRouter({
      fetchJourneys: async () => ({ journeys: [journey] }),
      calculateCarbonFootprint,
    })
  );

  const { server, baseUrl } = await listen(app);

  try {
    const response = await fetch(
      `${baseUrl}/api/idfm/journeys?from=from-id&to=to-id`
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.journeys[0].carbonFootprint.car_solo_co2e, 436);
    assert.equal(
      body.journeys[0].carbonFootprint.savings_vs_car_solo_co2e,
      436
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('la route journeys reste disponible si le calcul carbone échoue', async () => {
  const app = express();
  const journey = {
    id: 'journey-1',
    duration: 600,
    profile: 'walking',
    sections: [{ mode: 'walking', distanceKm: 2 }],
  };
  const calculateCarbonFootprint = async () => {
    const error = new Error('Database unavailable');
    error.code = 'ENOTFOUND';
    throw error;
  };

  app.use(
    '/api/idfm',
    createIdfmRouter({
      fetchJourneys: async () => ({ journeys: [journey] }),
      calculateCarbonFootprint,
    })
  );

  const { server, baseUrl } = await listen(app);

  try {
    const response = await fetch(
      `${baseUrl}/api/idfm/journeys?from=from-id&to=to-id`
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.journeys.length, 1);
    assert.equal(body.journeys[0].id, 'journey-1');
    assert.equal(
      body.carbonFootprintMessage,
      'Le calcul carbone est temporairement indisponible.'
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('la route journeys expose les messages de service des itineraires', async () => {
  const app = express();
  const journey = {
    id: 'journey-1',
    duration: 600,
    profile: 'walking',
    sections: [{ mode: 'walking', distanceKm: 2 }],
  };

  app.use(
    '/api/idfm',
    createIdfmRouter({
      fetchJourneys: async () => ({
        journeys: [journey],
        serviceMessages: [
          'Les itinéraires multimodaux sont temporairement indisponibles.',
        ],
      }),
      calculateCarbonFootprint: async () => ({
        total_co2e: 0,
        unit: 'g',
        segments: [],
      }),
    })
  );

  const { server, baseUrl } = await listen(app);

  try {
    const response = await fetch(
      `${baseUrl}/api/idfm/journeys?from=from-id&to=to-id`
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(
      body.carbonFootprintMessage,
      'Les itinéraires multimodaux sont temporairement indisponibles.'
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('la route bike-stations renvoie les bornes velo proches', async () => {
  const app = express();

  app.use(
    '/api/idfm',
    createIdfmRouter({
      fetchBikeStations: async ({ lon, lat, availability }) => ({
        stations: [
          {
            id: 'velib:1',
            stationId: '1',
            name: 'Borne test',
            label: 'Borne test',
            type: 'bike',
            distance: 120,
            coordinates: [Number(lon), Number(lat)],
            city: null,
            lines: [],
            capacity: 30,
            availableBikes: availability === 'bikes' ? 3 : 0,
            availableDocks: availability === 'docks' ? 4 : 1,
            mechanicalBikes: 2,
            electricBikes: 1,
          },
        ],
        pagination: null,
      }),
    })
  );

  const { server, baseUrl } = await listen(app);

  try {
    const response = await fetch(
      `${baseUrl}/api/idfm/bike-stations?lon=2.3522&lat=48.8566&availability=bikes`
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.stations[0].stationId, '1');
    assert.equal(body.stations[0].availableBikes, 3);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('la route bike-stations expose les erreurs du service velo', async () => {
  const app = express();

  app.use(
    '/api/idfm',
    createIdfmRouter({
      fetchBikeStations: async () => {
        const error = new Error('Service de données vélo inaccessible.');
        error.status = 502;
        throw error;
      },
    })
  );

  const { server, baseUrl } = await listen(app);

  try {
    const response = await fetch(
      `${baseUrl}/api/idfm/bike-stations?lon=2.3522&lat=48.8566`
    );
    const body = await response.json();

    assert.equal(response.status, 502);
    assert.equal(body.error, 'Service de données vélo inaccessible.');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('la route bike-station-journey renvoie un trajet compose avec carbone', async () => {
  const app = express();
  const journey = {
    id: 'bike-stations-1-2',
    duration: 900,
    profile: 'bike',
    sections: [
      { mode: 'walking', distanceKm: 0.2 },
      { mode: 'bike', distanceKm: 3 },
      { mode: 'walking', distanceKm: 0.1 },
    ],
  };

  app.use(express.json());
  app.use(
    '/api/idfm',
    createIdfmRouter({
      fetchBikeStationJourney: async () => ({ journey }),
      calculateCarbonFootprint: async ({ legs }) => ({
        total_co2e: legs[0]?.mode === 'voiture_solo' ? 719.4 : 0,
        unit: 'g',
        segments: [],
      }),
    })
  );

  const { server, baseUrl } = await listen(app);

  try {
    const response = await fetch(`${baseUrl}/api/idfm/bike-station-journey`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        fromCoordinates: [2.3522, 48.8566],
        toCoordinates: [2.295, 48.8738],
        startStation: {
          stationId: '1',
          coordinates: [2.353, 48.857],
        },
      }),
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.journey.id, 'bike-stations-1-2');
    assert.equal(body.journey.carbonFootprint.car_solo_co2e, 719.4);
    assert.equal(body.carbonFootprintMessage, null);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('la route place-from-coordinates renvoie un lieu resolu', async () => {
  const app = express();

  app.use(
    '/api/idfm',
    createIdfmRouter({
      fetchPlaceFromCoordinates: async () => ({
        place: {
          id: '2.3522;48.8566',
          label: '5 Avenue Anatole France',
          name: '5 Avenue Anatole France',
          type: 'address',
          coordinates: [2.3522, 48.8566],
          city: 'Paris',
          lines: [],
        },
      }),
    })
  );

  const { server, baseUrl } = await listen(app);

  try {
    const response = await fetch(
      `${baseUrl}/api/idfm/place-from-coordinates?lon=2.3522&lat=48.8566`
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.place.label, '5 Avenue Anatole France');
    assert.deepEqual(body.place.coordinates, [2.3522, 48.8566]);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
