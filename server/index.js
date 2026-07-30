import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'node:url';
import { createAuthRouter } from './auth/routes.js';
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
 * Port HTTP utilisé par le serveur API.
 *
 * On utilise 3000 par défaut.
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
 * Route de vérification de l'état du serveur.
 *
 * Elle permet de confirmer rapidement que l'API démarre et répond, sans
 * interroger la base de données ni exécuter de logique métier.
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'UrbanFlow Mobility API',
  });
});

app.use('/api/auth', createAuthRouter());
app.use('/api/idfm', createIdfmRouter());

app.use((err, req, res, next) => {
  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(500).json({
    error: 'Erreur serveur.',
  });
});

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
