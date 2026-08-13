import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'node:url';
import { createAuthRouter } from './auth/routes.js';
import { createFavoritesRouter } from './favorites/routes.js';
import { createIdfmRouter } from './idfm/routes.js';

dotenv.config();

/**
 * Instance principale de l'application Express.
 *
 * C'est sur cet objet que l'on ajoute les middlewares et les routes HTTP de
 * l'API.
 *
 * @type {object}
 */
const app = express();

/**
 * Port HTTP utilise par le serveur API.
 *
 * On utilise 3000 par defaut.
 *
 * @type {string | number}
 */
const PORT = process.env.PORT || 3000;

const clientOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((origin) => origin.trim())
  : true;

function isAllowedOrigin(origin) {
  if (!origin || clientOrigins === true) {
    return true;
  }

  if (clientOrigins.includes(origin)) {
    return true;
  }

  return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
}

function isDatabaseConnectionError(error) {
  return ['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN'].includes(
    error?.code
  );
}

function getDatabaseErrorResponse(error) {
  if (isDatabaseConnectionError(error)) {
    return {
      status: 503,
      error: 'Base de données inaccessible.',
    };
  }

  if (error?.code === '28P01') {
    return {
      status: 503,
      error: 'Identifiants de base de données invalides.',
    };
  }

  if (error?.code === '3D000') {
    return {
      status: 503,
      error: 'Base de données introuvable.',
    };
  }

  if (['42P01', '42703'].includes(error?.code)) {
    return {
      status: 500,
      error: 'Schema de base de données incomplet. Verifiez les migrations.',
    };
  }

  if (error?.code === '42501') {
    return {
      status: 503,
      error: 'Droits de base de données insuffisants.',
    };
  }

  if (['53300', '53400', '57P03'].includes(error?.code)) {
    return {
      status: 503,
      error: 'Base de données temporairement indisponible.',
    };
  }

  if (
    error?.code === 'XX000' &&
    String(error.message || '').includes('no tenant identifier provided')
  ) {
    return {
      status: 503,
      error:
        'Configuration Supabase pooler invalide. Utilisez postgres.<project-ref> comme utilisateur.',
    };
  }

  if (error?.code === 'ERR_INVALID_URL') {
    return {
      status: 503,
      error: 'Configuration DATABASE_URL invalide.',
    };
  }

  return null;
}

app.use(
  cors({
    origin(origin, callback) {
      callback(null, isAllowedOrigin(origin));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

/**
 * Route de verification de l'etat du serveur.
 *
 * Elle permet de confirmer rapidement que l'API demarre et repond, sans
 * interroger la base de donnees ni executer de logique metier.
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'UrbanFlow Mobility API',
  });
});

app.use('/api/auth', createAuthRouter());
app.use('/api/favorites', createFavoritesRouter());
app.use('/api/idfm', createIdfmRouter());

app.use((err, req, res, next) => {
  const errorId = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  console.error(`[${errorId}]`, err);

  if (res.headersSent) {
    return next(err);
  }

  const databaseErrorResponse = getDatabaseErrorResponse(err);

  if (databaseErrorResponse) {
    return res.status(databaseErrorResponse.status).json({
      error: databaseErrorResponse.error,
      errorId,
    });
  }

  return res.status(500).json({
    error: 'Erreur serveur.',
    errorId,
  });
});

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
