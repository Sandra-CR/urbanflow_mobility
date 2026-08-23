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

test(
  'la route journeys garde les itineraires si un facteur carbone manque',
  async () => {
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
        'Le calcul de carbone ne trouve pas les donnees necessaires (rer).'
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  }
);

test(
  'la route journeys ajoute la comparaison carbone avec voiture solo',
  async () => {
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
  }
);

test(
  'la route journeys reste disponible si le calcul carbone echoue',
  async () => {
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
  }
);

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
