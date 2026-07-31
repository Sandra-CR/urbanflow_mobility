import express from 'express';
import {
  createFetchJourneysWithTimeout,
  createFetchNearbyStationsWithTimeout,
  createSearchPlacesWithTimeout,
  fetchJourneys as defaultFetchJourneys,
  fetchNearbyStations as defaultFetchNearbyStations,
  searchPlaces as defaultSearchPlaces,
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
  searchPlaces = createSearchPlacesWithTimeout(defaultSearchPlaces),
  fetchJourneys = createFetchJourneysWithTimeout(defaultFetchJourneys),
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

  router.get('/places', async (req, res, next) => {
    try {
      const result = await searchPlaces({
        query: req.query.q,
        count: req.query.count,
      });

      return res.json(result);
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({
          error: error.message,
        });
      }

      return next(error);
    }
  });

  router.get('/journeys', async (req, res, next) => {
    try {
      const result = await fetchJourneys({
        from: req.query.from,
        to: req.query.to,
        fromCoordinates: [req.query.fromLon, req.query.fromLat],
        toCoordinates: [req.query.toLon, req.query.toLat],
      });

      return res.json(result);
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({
          error: error.message,
        });
      }

      return next(error);
    }
  });

  return router;
}
