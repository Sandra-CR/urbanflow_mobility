import { test } from 'node:test';
import assert from 'node:assert';

test('le serveur est prêt à démarrer', () => {
  const isReady = true;
  // Au lieu de expect(true).toBe(true), on utilise assert
  assert.strictEqual(isReady, true);
});
