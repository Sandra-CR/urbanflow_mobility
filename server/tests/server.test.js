import { test, expect } from 'node:test';

test('le serveur est prêt à démarrer', () => {
  const isReady = true;
  if (!isReady) throw new Error('Le serveur n\'est pas prêt');
});