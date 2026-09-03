import { test } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import cookieParser from 'cookie-parser';
import { AUTH_COOKIE_NAME, signAuthToken } from '../auth/jwt.js';
import { createCarbonRouter } from '../carbon/routes.js';

process.env.JWT_SECRET = 'test-secret-with-enough-length-for-auth-tests';

function createTestApp(query) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/carbon', createCarbonRouter({ query }));
  return app;
}

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

test('refuse les trajets carbone sans session', async () => {
  const app = createTestApp(async () => {
    throw new Error('Unexpected query');
  });
  const { server, baseUrl } = await listen(app);

  try {
    const response = await fetch(`${baseUrl}/api/carbon/completed-journeys`);

    assert.strictEqual(response.status, 401);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('liste les trajets carbone de l utilisateur connecte', async () => {
  const queries = [];
  const userId = 'user-1';
  const token = signAuthToken({
    id: userId,
    email: 'user@example.com',
  });
  const completedAt = '2026-09-03T08:15:00.000Z';
  const app = createTestApp(async (text, params) => {
    queries.push({ text, params });

    if (text.includes('from user_completed_journeys')) {
      return {
        rows: [
          {
            id: 'journey-local-1',
            journey_id: 'bike-direct',
            type: 'bike',
            completed_at: completedAt,
            distance_km: '4.250',
            carbon_total_co2e: '0.000',
            car_solo_co2e: '926.500',
            savings_vs_car_solo_co2e: '926.500',
            carbon_unit: 'gCO2e',
          },
        ],
      };
    }

    throw new Error(`Unexpected query: ${text}`);
  });
  const { server, baseUrl } = await listen(app);

  try {
    const response = await fetch(`${baseUrl}/api/carbon/completed-journeys`, {
      headers: {
        cookie: `${AUTH_COOKIE_NAME}=${token}`,
      },
    });
    const body = await response.json();

    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(queries[0].params, [userId]);
    assert.deepStrictEqual(body.journeys, [
      {
        id: 'journey-local-1',
        journeyId: 'bike-direct',
        type: 'bike',
        completedAt,
        distanceKm: 4.25,
        carbonFootprint: {
          total_co2e: 0,
          car_solo_co2e: 926.5,
          savings_vs_car_solo_co2e: 926.5,
          unit: 'gCO2e',
        },
      },
    ]);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('enregistre un trajet carbone de maniere idempotente', async () => {
  const queries = [];
  const userId = 'user-1';
  const token = signAuthToken({
    id: userId,
    email: 'user@example.com',
  });
  const completedAt = '2026-09-03T09:30:00.000Z';
  const app = createTestApp(async (text, params) => {
    queries.push({ text, params });

    if (text.startsWith('insert into user_completed_journeys')) {
      return {
        rows: [
          {
            id: params[0],
            journey_id: params[2],
            type: params[3],
            completed_at: params[4],
            distance_km: params[5],
            carbon_total_co2e: params[6],
            car_solo_co2e: params[7],
            savings_vs_car_solo_co2e: params[8],
            carbon_unit: params[9],
          },
        ],
      };
    }

    throw new Error(`Unexpected query: ${text}`);
  });
  const { server, baseUrl } = await listen(app);

  try {
    const response = await fetch(`${baseUrl}/api/carbon/completed-journeys`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `${AUTH_COOKIE_NAME}=${token}`,
      },
      body: JSON.stringify({
        id: 'completed-1',
        journeyId: 'transit-1',
        type: 'transit',
        completedAt,
        distanceKm: 12.3,
        carbonFootprint: {
          total_co2e: 240,
          car_solo_co2e: 2681.4,
          unit: 'gCO2e',
        },
      }),
    });
    const body = await response.json();

    assert.strictEqual(response.status, 201);
    assert.deepStrictEqual(queries[0].params, [
      'completed-1',
      userId,
      'transit-1',
      'transit',
      completedAt,
      12.3,
      240,
      2681.4,
      2441.4,
      'gCO2e',
    ]);
    assert.strictEqual(body.journey.id, 'completed-1');
    assert.strictEqual(
      body.journey.carbonFootprint.savings_vs_car_solo_co2e,
      2441.4
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('refuse un trajet carbone invalide', async () => {
  const token = signAuthToken({
    id: 'user-1',
    email: 'user@example.com',
  });
  const app = createTestApp(async () => {
    throw new Error('Unexpected query');
  });
  const { server, baseUrl } = await listen(app);

  try {
    const response = await fetch(`${baseUrl}/api/carbon/completed-journeys`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `${AUTH_COOKIE_NAME}=${token}`,
      },
      body: JSON.stringify({
        id: 'completed-1',
        type: 'bike',
        carbonFootprint: {
          total_co2e: 12,
        },
      }),
    });

    assert.strictEqual(response.status, 400);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
