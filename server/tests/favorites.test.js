import { test } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import cookieParser from 'cookie-parser';
import { AUTH_COOKIE_NAME, signAuthToken } from '../auth/jwt.js';
import { createFavoritesRouter } from '../favorites/routes.js';

process.env.JWT_SECRET = 'test-secret-with-enough-length-for-auth-tests';

function bypassCsrf(req, res, next) {
  next();
}

function createTestApp(query) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(
    '/api/favorites',
    createFavoritesRouter({ query, csrfProtection: bypassCsrf })
  );
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

test('refuse les favoris sans session', async () => {
  const app = createTestApp(async () => {
    throw new Error('Unexpected query');
  });
  const { server, baseUrl } = await listen(app);

  try {
    const response = await fetch(`${baseUrl}/api/favorites?category=favorite`);

    assert.strictEqual(response.status, 401);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('liste les favoris de la categorie demandee', async () => {
  const queries = [];
  const userId = 'user-1';
  const token = signAuthToken({
    id: userId,
    email: 'user@example.com',
  });
  const app = createTestApp(async (text, params) => {
    queries.push({ text, params });

    if (text.includes('from user_favorite_places')) {
      return {
        rows: [
          {
            id: 'fav-1',
            category: 'home',
            label: 'Maison',
            place_label: 'Chatelet',
            station_id: null,
            lon: 2.35,
            lat: 48.85,
          },
        ],
      };
    }

    throw new Error(`Unexpected query: ${text}`);
  });
  const { server, baseUrl } = await listen(app);

  try {
    const response = await fetch(`${baseUrl}/api/favorites?category=home`, {
      headers: {
        cookie: `${AUTH_COOKIE_NAME}=${token}`,
      },
    });
    const body = await response.json();

    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(queries[0].params, [userId, 'home']);
    assert.deepStrictEqual(body.places[0], {
      id: 'favorite:fav-1',
      stationId: null,
      favoriteId: 'fav-1',
      category: 'home',
      label: 'Maison',
      name: 'Maison',
      placeLabel: 'Chatelet',
      type: 'address',
      distance: null,
      coordinates: [2.35, 48.85],
      city: null,
      lines: [],
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("supprime un favori de l'utilisateur connecte", async () => {
  const queries = [];
  const userId = 'user-1';
  const token = signAuthToken({
    id: userId,
    email: 'user@example.com',
  });
  const app = createTestApp(async (text, params) => {
    queries.push({ text, params });

    if (text.startsWith('delete from user_favorite_places')) {
      return {
        rowCount: 1,
        rows: [],
      };
    }

    throw new Error(`Unexpected query: ${text}`);
  });
  const { server, baseUrl } = await listen(app);

  try {
    const response = await fetch(`${baseUrl}/api/favorites/fav-1`, {
      method: 'DELETE',
      headers: {
        cookie: `${AUTH_COOKIE_NAME}=${token}`,
      },
    });

    assert.strictEqual(response.status, 204);
    assert.deepStrictEqual(queries[0].params, ['fav-1', userId]);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("remplace le domicile existant lors d'un nouvel enregistrement", async () => {
  const queries = [];
  const userId = 'user-1';
  const token = signAuthToken({
    id: userId,
    email: 'user@example.com',
  });
  const app = createTestApp(async (text, params) => {
    queries.push({ text, params });

    if (text.startsWith('delete from user_favorite_places')) {
      return {
        rowCount: 1,
        rows: [],
      };
    }

    if (text.startsWith('insert into user_favorite_places')) {
      return {
        rows: [
          {
            id: 'fav-home-2',
            category: 'home',
            label: 'Domicile',
            place_label: 'Nation',
            station_id: null,
            lon: 2.395,
            lat: 48.848,
          },
        ],
      };
    }

    throw new Error(`Unexpected query: ${text}`);
  });
  const { server, baseUrl } = await listen(app);

  try {
    const response = await fetch(`${baseUrl}/api/favorites`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `${AUTH_COOKIE_NAME}=${token}`,
      },
      body: JSON.stringify({
        category: 'home',
        label: 'Domicile',
        placeLabel: 'Nation',
        stationId: null,
        coordinates: [2.395, 48.848],
      }),
    });
    const body = await response.json();

    assert.strictEqual(response.status, 201);
    assert.strictEqual(queries.length, 2);
    assert.ok(
      queries[0].text.startsWith('delete from user_favorite_places'),
      'delete query should run before insert'
    );
    assert.deepStrictEqual(queries[0].params, [userId, 'home']);
    assert.ok(
      queries[1].text.startsWith('insert into user_favorite_places'),
      'insert query should run after delete'
    );
    assert.deepStrictEqual(body.place, {
      id: 'favorite:fav-home-2',
      stationId: null,
      favoriteId: 'fav-home-2',
      category: 'home',
      label: 'Domicile',
      name: 'Domicile',
      placeLabel: 'Nation',
      type: 'address',
      distance: null,
      coordinates: [2.395, 48.848],
      city: null,
      lines: [],
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
