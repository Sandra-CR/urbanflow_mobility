import express from 'express';
import {
  createFetchDisruptionsWithTimeout,
  createFetchPlaceFromCoordinatesWithTimeout,
  createFetchJourneysWithTimeout,
  createFetchNearbyStationsWithTimeout,
  createFetchBikeStationJourneyWithTimeout,
  createFetchBikeStationsWithTimeout,
  fetchDisruptions as defaultFetchDisruptions,
  fetchBikeStationJourney as defaultFetchBikeStationJourney,
  fetchBikeStations as defaultFetchBikeStations,
  createSearchPlacesWithTimeout,
  fetchPlaceFromCoordinates as defaultFetchPlaceFromCoordinates,
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

    if (error?.code === 'UNKNOWN_CARBON_FACTOR') {
      error.modes.forEach((mode) => missingModes.add(mode));
    }

    return journeys[index];
  });

  return {
    journeys: nextJourneys,
    missingModes: [...missingModes],
    carbonUnavailable: settledJourneys.some(
      (settledJourney) =>
        settledJourney.status === 'rejected' &&
        settledJourney.reason?.code !== 'UNKNOWN_CARBON_FACTOR'
    ),
  };
}

/**
 * Crée le routeur Express dédié aux données IDF Mobilités.
 *
 * @param {object} [options] Dépendances injectables.
 * @param {Function} [options.fetchDisruptions] Recherche les perturbations applicables par ligne.
 * @param {Function} [options.fetchNearbyStations] Recherche les stations proches.
 * @param {Function} [options.fetchBikeStations] Recherche les bornes Vélib proches.
 * @param {Function} [options.fetchBikeStationJourney] Compose un itinéraire via bornes Vélib.
 * @param {Function} [options.searchPlaces] Recherche les lieux IDF Mobilités.
 * @param {Function} [options.fetchJourneys] Calcule les itinéraires.
 * @param {Function} [options.calculateCarbonFootprint] Calcule l'empreinte carbone.
 * @returns {object} Routeur Express configuré
 */
export function createIdfmRouter({
  fetchDisruptions = createFetchDisruptionsWithTimeout(defaultFetchDisruptions),
  fetchPlaceFromCoordinates = createFetchPlaceFromCoordinatesWithTimeout(
    defaultFetchPlaceFromCoordinates
  ),
  fetchNearbyStations = createFetchNearbyStationsWithTimeout(
    defaultFetchNearbyStations
  ),
  fetchBikeStations = createFetchBikeStationsWithTimeout(
    defaultFetchBikeStations
  ),
  fetchBikeStationJourney = createFetchBikeStationJourneyWithTimeout(
    defaultFetchBikeStationJourney
  ),
  searchPlaces = createSearchPlacesWithTimeout(defaultSearchPlaces),
  fetchJourneys = createFetchJourneysWithTimeout(defaultFetchJourneys),
  calculateCarbonFootprint = defaultCalculateCarbonFootprint,
} = {}) {
  const router = express.Router();

  router.get('/disruptions', async (req, res, next) => {
    try {
      const result = await fetchDisruptions({
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

  router.get('/bike-stations', async (req, res, next) => {
    try {
      const result = await fetchBikeStations({
        lon: req.query.lon,
        lat: req.query.lat,
        distance: req.query.distance,
        count: req.query.count,
        availability: req.query.availability,
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
          error: 'Délai dépassé pour le service Vélib.',
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

  router.get('/place-from-coordinates', async (req, res, next) => {
    try {
      const result = await fetchPlaceFromCoordinates({
        lon: req.query.lon,
        lat: req.query.lat,
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

  router.get('/journeys', async (req, res, next) => {
    try {
      // `wheelchairAccessible` reste un paramètre UrbanFlow ; le client IDFM
      // le traduit ensuite en `wheelchair=true` pour Navitia.
      const result = await fetchJourneys({
        from: req.query.from,
        to: req.query.to,
        fromCoordinates: [req.query.fromLon, req.query.fromLat],
        toCoordinates: [req.query.toLon, req.query.toLat],
        wheelchairAccessible: req.query.wheelchairAccessible === 'true',
      });
      const { journeys, missingModes, carbonUnavailable } =
        await addCarbonFootprints(result.journeys, calculateCarbonFootprint);
      const routeMessages = result.serviceMessages || [];
      const carbonMessage = carbonUnavailable
        ? 'Le calcul carbone est temporairement indisponible.'
        : missingModes.length > 0
          ? `Le calcul de carbone ne trouve pas les données nécessaires (${missingModes.join(', ')}).`
          : null;

      return res.json({
        journeys,
        carbonFootprintMessage:
          [...routeMessages, carbonMessage].filter(Boolean).join(' ') || null,
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

  router.post('/bike-station-journey', async (req, res, next) => {
    try {
      const result = await fetchBikeStationJourney({
        fromCoordinates: req.body?.fromCoordinates,
        toCoordinates: req.body?.toCoordinates,
        startStation: req.body?.startStation,
      });
      const journeyWithCarbonFootprint = await withCarbonFootprint(
        result.journey,
        calculateCarbonFootprint
      );

      return res.json({
        ...result,
        journey: journeyWithCarbonFootprint,
        carbonFootprintMessage: null,
      });
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({
          error: error.message,
        });
      }

      if (error.name === 'AbortError') {
        return res.status(504).json({
          error: 'Délai dépassé pour le service Vélib.',
        });
      }

      return next(error);
    }
  });

  return router;
}
