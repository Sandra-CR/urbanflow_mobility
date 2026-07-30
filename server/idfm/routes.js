import express from 'express';
import {
  createFetchNearbyStationsWithTimeout,
  fetchNearbyStations as defaultFetchNearbyStations,
} from './client.js';

/**
 * Crée le routeur Express dédié aux données IDF Mobilités.
 *
 * @param {{fetchNearbyStations?: Function}} [options] Dépendances injectables
 * @returns {object} Routeur Express configuré
 */
export function createIdfmRouter({
  fetchNearbyStations = createFetchNearbyStationsWithTimeout(
    defaultFetchNearbyStations
  ),
} = {}) {
  const router = express.Router();

  router.get('/nearby-stations', async (req, res, next) => {
    try {
      const result = await fetchNearbyStations({
        lon: req.query.lon,
        lat: req.query.lat,
        distance: req.query.distance,
        count: req.query.count,
      });

      return res.json(result);
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({
          error: error.message,
        });
      }

      if (error.name === 'AbortError') {
        return res.status(504).json({
          error: "Délai dépassé pour l'API IDF Mobilités.",
        });
      }

      return next(error);
    }
  });

  return router;
}
