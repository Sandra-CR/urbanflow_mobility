import { test } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createAuthRateLimiter, createAuthRouter } from '../auth/routes.js';
import { CSRF_COOKIE_NAME, requireCsrfProtection } from '../auth/csrf.js';
import { getAuthCookieOptions, signAuthToken } from '../auth/jwt.js';
import { validateStrongPassword } from '../auth/passwordPolicy.js';

process.env.JWT_SECRET = 'test-secret-with-enough-length-for-auth-tests';

function bypassCsrf(req, res, next) {
  next();
}

function createTestApp(query, options = {}) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(
    '/api/auth',
    createAuthRouter({ query, csrfProtection: bypassCsrf, ...options })
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

test('refuse un mot de passe faible', () => {
  const result = validateStrongPassword('password');

  assert.strictEqual(result.isValid, false);
  assert.ok(result.errors.length > 0);
});

test('accepte un mot de passe fort', () => {
  const result = validateStrongPassword('UrbanFlow!2026');

  assert.strictEqual(result.isValid, true);
  assert.deepStrictEqual(result.errors, []);
});

test('configure le cookie pour un frontend HTTPS distant', () => {
  const previousClientOrigin = process.env.CLIENT_ORIGIN;
  const previousNodeEnv = process.env.NODE_ENV;

  process.env.CLIENT_ORIGIN = 'https://urbanflow-mobility.vercel.app';
  delete process.env.NODE_ENV;

  try {
    const options = getAuthCookieOptions();

    assert.strictEqual(options.secure, true);
    assert.strictEqual(options.sameSite, 'none');
  } finally {
    if (previousClientOrigin === undefined) {
      delete process.env.CLIENT_ORIGIN;
    } else {
      process.env.CLIENT_ORIGIN = previousClientOrigin;
    }

    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  }
});

test('inscrit un utilisateur et pose un cookie httpOnly', async () => {
  const queries = [];
  const app = createTestApp(async (text, params) => {
    queries.push({ text, params });

    if (text.startsWith('select id from users')) {
      return { rowCount: 0, rows: [] };
    }

    if (text.startsWith('insert into users')) {
      return {
        rowCount: 1,
        rows: [
          {
            id: '1',
            email: params[0],
            created_at: new Date('2026-01-01T00:00:00.000Z'),
          },
        ],
      };
    }

    throw new Error(`Unexpected query: ${text}`);
  });
  const { server, baseUrl } = await listen(app);

  try {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: 'USER@example.com',
        password: 'UrbanFlow!2026',
      }),
    });
    const body = await response.json();
    const cookie = response.headers.get('set-cookie');

    assert.strictEqual(response.status, 201);
    assert.strictEqual(body.user.email, 'user@example.com');
    assert.match(cookie, /urbanflow_auth=/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Strict/);
    assert.strictEqual(queries[1].params[0], 'user@example.com');
    assert.notStrictEqual(queries[1].params[1], 'UrbanFlow!2026');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('renvoie un utilisateur null sans session courante', async () => {
  const app = createTestApp(async () => {
    throw new Error('Unexpected query without auth cookie');
  });
  const { server, baseUrl } = await listen(app);

  try {
    const response = await fetch(`${baseUrl}/api/auth/me`);
    const body = await response.json();

    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(body, { user: null });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('renvoie un utilisateur null avec une session invalide', async () => {
  const app = createTestApp(async () => {
    throw new Error('Unexpected query with invalid auth cookie');
  });
  const { server, baseUrl } = await listen(app);

  try {
    const response = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        cookie: 'urbanflow_auth=invalid-token',
      },
    });
    const body = await response.json();
    const cookie = response.headers.get('set-cookie');

    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(body, { user: null });
    assert.match(cookie, /urbanflow_auth=/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('renvoie l utilisateur courant avec une session valide', async () => {
  const user = {
    id: '1',
    email: 'user@example.com',
    created_at: new Date('2026-01-01T00:00:00.000Z'),
  };
  const app = createTestApp(async (text, params) => {
    assert.ok(text.includes('from users'));
    assert.deepStrictEqual(params, [user.id]);

    return {
      rowCount: 1,
      rows: [user],
    };
  });
  const { server, baseUrl } = await listen(app);
  const token = signAuthToken(user);

  try {
    const response = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        cookie: `urbanflow_auth=${token}`,
      },
    });
    const body = await response.json();

    assert.strictEqual(response.status, 200);
    assert.strictEqual(body.user.email, user.email);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("limite les tentatives d'authentification par adresse IP", async () => {
  const app = createTestApp(
    async (text) => {
      if (text.includes('from users')) {
        return {
          rowCount: 0,
          rows: [],
        };
      }

      throw new Error(`Unexpected query: ${text}`);
    },
    {
      authRateLimiter: createAuthRateLimiter({
        windowMs: 60 * 1000,
        max: 1,
      }),
    }
  );
  const { server, baseUrl } = await listen(app);

  try {
    const requestOptions = {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'UrbanFlow!2026',
      }),
    };
    const firstResponse = await fetch(
      `${baseUrl}/api/auth/login`,
      requestOptions
    );
    const secondResponse = await fetch(
      `${baseUrl}/api/auth/login`,
      requestOptions
    );
    const body = await secondResponse.json();

    assert.strictEqual(firstResponse.status, 401);
    assert.strictEqual(secondResponse.status, 429);
    assert.match(body.error, /Trop de tentatives/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('fournit un jeton CSRF utilisable par le client', async () => {
  const app = createTestApp(async () => {
    throw new Error('Unexpected query while reading CSRF token');
  });
  const { server, baseUrl } = await listen(app);

  try {
    const response = await fetch(`${baseUrl}/api/auth/csrf`);
    const body = await response.json();
    const cookie = response.headers.get('set-cookie');

    assert.strictEqual(response.status, 200);
    assert.match(body.csrfToken, /^[a-f0-9]{64}\.[a-f0-9]{64}$/);
    assert.match(cookie, new RegExp(`${CSRF_COOKIE_NAME}=`));
    assert.doesNotMatch(cookie, /HttpOnly/i);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('refuse une requete mutatrice sans jeton CSRF valide', async () => {
  const app = createTestApp(
    async () => {
      throw new Error('Unexpected query without CSRF token');
    },
    {
      csrfProtection: requireCsrfProtection,
    }
  );
  const { server, baseUrl } = await listen(app);

  try {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'UrbanFlow!2026',
      }),
    });
    const body = await response.json();

    assert.strictEqual(response.status, 403);
    assert.match(body.error, /CSRF/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('accepte une requete mutatrice avec un jeton CSRF valide', async () => {
  const app = createTestApp(
    async (text) => {
      if (text.includes('from users')) {
        return {
          rowCount: 0,
          rows: [],
        };
      }

      throw new Error(`Unexpected query: ${text}`);
    },
    {
      csrfProtection: requireCsrfProtection,
    }
  );
  const { server, baseUrl } = await listen(app);

  try {
    const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`);
    const { csrfToken } = await csrfResponse.json();
    const csrfCookie = csrfResponse.headers.get('set-cookie').split(';')[0];
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: csrfCookie,
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'UrbanFlow!2026',
      }),
    });

    assert.strictEqual(response.status, 401);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
