import { test } from 'node:test';
import assert from 'node:assert';
import { checkDatabaseConnection, closeDatabaseConnection } from '../db.js';

test('Test de connexion à la base de données', async () => {
    try {
        const result = await checkDatabaseConnection();
        assert.ok(result, "La base de données aurait dû renvoyer un résultat");
        assert.ok(result.current_time, "Le résultat devrait contenir une date");
    } catch (error) {
        assert.fail(`La connexion à la base de données a échoué: ${error.message}`);
    } finally {
        await closeDatabaseConnection();
    }
});