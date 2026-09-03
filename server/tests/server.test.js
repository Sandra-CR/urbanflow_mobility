import { test } from 'node:test';
import assert from 'node:assert';
import app, { getConfiguredClientOrigins, isAllowedOrigin } from '../index.js';

function listen(appToListen) {
  return new Promise((resolve) => {
    const server = appToListen.listen(0, () => {
      const { port } = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${port}`,
      });
    });
  });
}

test('le serveur est prêt à démarrer', () => {
  const isReady = true;
  // Au lieu de expect(true).toBe(true), on utilise assert
  assert.strictEqual(isReady, true);
});

test('refuse une configuration CORS implicite en production', () => {
  assert.throws(
    () => getConfiguredClientOrigins({ NODE_ENV: 'production' }),
    /CLIENT_ORIGIN is required/
  );
});

test('lit les origines CORS configurees explicitement', () => {
  const origins = getConfiguredClientOrigins({
    NODE_ENV: 'production',
    CLIENT_ORIGIN:
      'https://urbanflow.example.com, https://app.urbanflow.example.com',
  });

  assert.deepStrictEqual(origins, [
    'https://urbanflow.example.com',
    'https://app.urbanflow.example.com',
  ]);
  assert.strictEqual(
    isAllowedOrigin('https://urbanflow.example.com', origins),
    true
  );
  assert.strictEqual(
    isAllowedOrigin('https://evil.example.com', origins),
    false
  );
});

test('autorise localhost en developpement meme sans CLIENT_ORIGIN', () => {
  const origins = getConfiguredClientOrigins({ NODE_ENV: 'development' });

  assert.strictEqual(origins, true);
  assert.strictEqual(isAllowedOrigin('http://localhost:5173', []), true);
  assert.strictEqual(isAllowedOrigin('http://127.0.0.1:5173', []), true);
});

test('ajoute les en-tetes HTTP de securite', async () => {
  const { server, baseUrl } = await listen(app);

  try {
    const response = await fetch(`${baseUrl}/api/health`);

    assert.strictEqual(response.status, 200);
    assert.strictEqual(
      response.headers.get('x-content-type-options'),
      'nosniff'
    );
    assert.strictEqual(response.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.strictEqual(response.headers.get('referrer-policy'), 'no-referrer');
    assert.match(
      response.headers.get('content-security-policy'),
      /default-src 'self'/
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
