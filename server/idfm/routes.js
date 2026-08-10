import express from 'express';
import {
  createFetchJourneysWithTimeout,
  createFetchNearbyStationsWithTimeout,
  createSearchPlacesWithTimeout,
  fetchJourneys as defaultFetchJourneys,
  fetchNearbyStations as defaultFetchNearbyStations,
  searchPlaces as defaultSearchPlaces,
} from './client.js';
import { calculateCarbonFootprint as defaultCalculateCarbonFootprint } from '../carbon/service.js';

function toCarbonLeg(section) {
  return {
    mode: section.mode,
    distance_km: section.distanceKm || 0,
  };
}

async function withCarbonFootprint(journey, calculateCarbonFootprint) {
  const legs = journey.sections
    .map(toCarbonLeg)
    .filter((leg) => Number(leg.distance_km) > 0);
  const carbonFootprint = await calculateCarbonFootprint({ legs });
  const carSoloFootprint = await calculateCarbonFootprint({
    legs: [
      {
        mode: 'voiture_solo',
        distance_km: legs.reduce(
          (totalDistance, leg) => totalDistance + Number(leg.distance_km),
          0
        ),
      },
    ],
  });

  return {
    ...journey,
    carbonFootprint: {
      ...carbonFootprint,
      car_solo_co2e: carSoloFootprint.total_co2e,
      savings_vs_car_solo_co2e:
        carSoloFootprint.total_co2e - carbonFootprint.total_co2e,
    },
  };
}

async function addCarbonFootprints(journeys, calculateCarbonFootprint) {
  const settledJourneys = await Promise.allSettled(
    journeys.map((journey) =>
      withCarbonFootprint(journey, calculateCarbonFootprint)
    )
  );
  const missingModes = new Set();

  const nextJourneys = settledJourneys.map((settledJourney, index) => {
    if (settledJourney.status === 'fulfilled') {
      return settledJourney.value;
    }

    const error = settledJourney.reason;

    if (error?.code !== 'UNKNOWN_CARBON_FACTOR') {
      throw error;
    }

    error.modes.forEach((mode) => missingModes.add(mode));
    return journeys[index];
  });

  return {
    journeys: nextJourneys,
    missingModes: [...missingModes],
  };
}

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
  calculateCarbonFootprint = defaultCalculateCarbonFootprint,
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
      const { journeys, missingModes } = await addCarbonFootprints(
        result.journeys,
        calculateCarbonFootprint
      );

      return res.json({
        ...result,
        journeys,
        carbonFootprintMessage:
          missingModes.length > 0
            ? `Le calcul de carbone ne trouve pas les données nécessaires (${missingModes.join(', ')}).`
            : null,
      });
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
