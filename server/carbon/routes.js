import express from 'express';
import { query as defaultQuery } from '../db.js';
import { requireAuth } from '../auth/middleware.js';

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toNullablePositiveNumber(value) {
  const number = toFiniteNumber(value);
  return number !== null && number >= 0 ? number : null;
}

function normalizeCompletedAt(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeCompletedJourneyPayload(body = {}) {
  const carbonFootprint = body.carbonFootprint || {};
  const totalCo2e = toNullablePositiveNumber(carbonFootprint.total_co2e);
  const carSoloCo2e = toNullablePositiveNumber(carbonFootprint.car_solo_co2e);
  const rawSavings = toFiniteNumber(carbonFootprint.savings_vs_car_solo_co2e);
  const completedAt = normalizeCompletedAt(body.completedAt);
  const id = String(body.id || '')
    .trim()
    .slice(0, 120);
  const type = String(body.type || '')
    .trim()
    .slice(0, 100);
  const journeyId = body.journeyId
    ? String(body.journeyId).trim().slice(0, 255)
    : null;
  const distanceKm = toNullablePositiveNumber(body.distanceKm);
  const unit = String(carbonFootprint.unit || 'gCO2e')
    .trim()
    .slice(0, 20);

  if (
    !id ||
    !type ||
    !completedAt ||
    totalCo2e === null ||
    carSoloCo2e === null
  ) {
    return null;
  }

  return {
    id,
    journeyId,
    type,
    completedAt,
    distanceKm,
    totalCo2e,
    carSoloCo2e,
    savingsVsCarSoloCo2e:
      rawSavings === null ? carSoloCo2e - totalCo2e : rawSavings,
    unit: unit || 'gCO2e',
  };
}

function toCompletedJourney(row) {
  return {
    id: row.id,
    journeyId: row.journey_id || null,
    type: row.type,
    completedAt: new Date(row.completed_at).toISOString(),
    distanceKm:
      row.distance_km === null || row.distance_km === undefined
        ? null
        : Number(row.distance_km),
    carbonFootprint: {
      total_co2e: Number(row.carbon_total_co2e),
      car_solo_co2e: Number(row.car_solo_co2e),
      savings_vs_car_solo_co2e: Number(row.savings_vs_car_solo_co2e),
      unit: row.carbon_unit || 'gCO2e',
    },
  };
}

export function createCarbonRouter({ query = defaultQuery } = {}) {
  const router = express.Router();

  router.use(requireAuth);

  router.get('/completed-journeys', async (req, res, next) => {
    try {
      const result = await query(
        `select id,
                journey_id,
                type,
                completed_at,
                distance_km,
                carbon_total_co2e,
                car_solo_co2e,
                savings_vs_car_solo_co2e,
                carbon_unit
           from user_completed_journeys
          where user_id = $1
          order by completed_at desc, created_at desc`,
        [req.auth.sub]
      );

      return res.json({
        journeys: result.rows.map(toCompletedJourney),
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/completed-journeys', async (req, res, next) => {
    const journey = normalizeCompletedJourneyPayload(req.body);

    if (!journey) {
      return res.status(400).json({
        error: 'Trajet terminé invalide.',
      });
    }

    try {
      const result = await query(
        `insert into user_completed_journeys (
                id,
                user_id,
                journey_id,
                type,
                completed_at,
                distance_km,
                carbon_total_co2e,
                car_solo_co2e,
                savings_vs_car_solo_co2e,
                carbon_unit
              )
              values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              on conflict (user_id, id)
              do update set
                journey_id = excluded.journey_id,
                type = excluded.type,
                completed_at = excluded.completed_at,
                distance_km = excluded.distance_km,
                carbon_total_co2e = excluded.carbon_total_co2e,
                car_solo_co2e = excluded.car_solo_co2e,
                savings_vs_car_solo_co2e = excluded.savings_vs_car_solo_co2e,
                carbon_unit = excluded.carbon_unit,
                updated_at = now()
           returning id,
                     journey_id,
                     type,
                     completed_at,
                     distance_km,
                     carbon_total_co2e,
                     car_solo_co2e,
                     savings_vs_car_solo_co2e,
                     carbon_unit`,
        [
          journey.id,
          req.auth.sub,
          journey.journeyId,
          journey.type,
          journey.completedAt,
          journey.distanceKm,
          journey.totalCo2e,
          journey.carSoloCo2e,
          journey.savingsVsCarSoloCo2e,
          journey.unit,
        ]
      );

      return res.status(201).json({
        journey: toCompletedJourney(result.rows[0]),
      });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
