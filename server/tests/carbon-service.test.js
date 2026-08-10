import { test } from 'node:test';
import assert from 'node:assert';
import { calculateCarbonFootprint } from '../carbon/service.js';

test('calculateCarbonFootprint calcule le total et le detail par segment', async () => {
  const queries = [];
  const query = async (text, params) => {
    queries.push({ text, params });

    return {
      rows: [
        { transport_mode: 'bus', co2_per_km: '104' },
        { transport_mode: 'tramway', co2_per_km: '4' },
        { transport_mode: 'velo', co2_per_km: '0' },
      ],
    };
  };

  const result = await calculateCarbonFootprint(
    {
      legs: [
        { mode: 'bus', distance_km: 2.5 },
        { mode: 'tramway', distance_km: 3 },
        { mode: 'bike', distance_km: 1.2 },
      ],
    },
    { query }
  );

  assert.deepEqual(queries[0].params, [['bus', 'tramway', 'velo']]);
  assert.equal(result.unit, 'g');
  assert.equal(result.total_co2e, 272);
  assert.deepEqual(
    result.segments.map((segment) => segment.co2e),
    [260, 12, 0]
  );
});

test('calculateCarbonFootprint aligne les modes IDFM sur les facteurs ADEME disponibles', async () => {
  const availableFactors = new Map([
    ['marche', 0],
    ['velo', 0],
    ['velo_elec', 2.5],
    ['metro', 2.8],
    ['rer', 4.1],
    ['tramway', 3.5],
    ['transilien_train', 5.2],
    ['bus', 103],
    ['ter', 29.6],
    ['tgv', 1.73],
    ['intercites', 8.98],
    ['voiture_solo', 218],
    ['covoiturage', 109],
  ]);
  const query = async (text, params) => ({
    rows: params[0].map((mode) => ({
      transport_mode: mode,
      co2_per_km: availableFactors.get(mode),
    })),
  });

  const result = await calculateCarbonFootprint(
    {
      legs: [
        { mode: 'walking', distance_km: 1 },
        { mode: 'bike', distance_km: 1 },
        { mode: 'Metro', distance_km: 1 },
        { mode: 'RER', distance_km: 1 },
        { mode: 'Tramway', distance_km: 1 },
        { mode: 'Train', distance_km: 1 },
        { mode: 'Bus', distance_km: 1 },
        { mode: 'on_demand_transport', distance_km: 1 },
      ],
    },
    { query }
  );

  assert.equal(result.total_co2e, 221.6);
  assert.deepEqual(
    result.segments.map((segment) => segment.transport_mode),
    [
      'marche',
      'velo',
      'metro',
      'rer',
      'tramway',
      'transilien_train',
      'bus',
      'bus',
    ]
  );
});

test('calculateCarbonFootprint signale les modes absents de carbon_factors', async () => {
  const query = async () => ({
    rows: [{ transport_mode: 'bus', co2_per_km: '104' }],
  });

  await assert.rejects(
    calculateCarbonFootprint(
      {
        legs: [
          { mode: 'bus', distance_km: 1 },
          { mode: 'hoverboard', distance_km: 1 },
        ],
      },
      { query }
    ),
    {
      code: 'UNKNOWN_CARBON_FACTOR',
      status: 400,
      modes: ['hoverboard'],
    }
  );
});
