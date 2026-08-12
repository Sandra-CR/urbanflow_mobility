import { query as defaultQuery } from '../db.js';

const DEFAULT_CARBON_FACTORS = new Map([
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

function normalizeMode(mode = '') {
  return String(mode || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function toCarbonMode(mode) {
  const normalizedMode = normalizeMode(mode);

  if (!normalizedMode) {
    return null;
  }

  if (normalizedMode.includes('velo') || normalizedMode.includes('bike')) {
    return 'velo';
  }

  if (
    normalizedMode.includes('platform_change') ||
    normalizedMode.includes('transfer') ||
    normalizedMode.includes('waiting') ||
    normalizedMode.includes('marche') ||
    normalizedMode.includes('walk') ||
    normalizedMode.includes('walking')
  ) {
    return 'marche';
  }

  if (normalizedMode.includes('tram')) {
    return 'tramway';
  }

  if (
    normalizedMode.includes('bus') ||
    normalizedMode.includes('on_demand_transport') ||
    normalizedMode.includes('demand')
  ) {
    return 'bus';
  }

  if (normalizedMode.includes('metro')) {
    return 'metro';
  }

  if (normalizedMode.includes('rer')) {
    return 'rer';
  }

  if (normalizedMode.includes('train') || normalizedMode.includes('rail')) {
    return 'transilien_train';
  }

  return normalizedMode;
}

function toDistanceKm(value) {
  const distance = Number(value);

  if (!Number.isFinite(distance) || distance < 0) {
    return 0;
  }

  return distance;
}

function createUnknownModeError(modes) {
  const error = new Error(
    `Mode de transport inconnu dans carbon_factors: ${modes.join(', ')}.`
  );
  error.status = 400;
  error.code = 'UNKNOWN_CARBON_FACTOR';
  error.modes = modes;
  return error;
}

function getDefaultFactorRows(modes) {
  return modes
    .filter((mode) => DEFAULT_CARBON_FACTORS.has(mode))
    .map((mode) => ({
      transport_mode: mode,
      co2_per_km: DEFAULT_CARBON_FACTORS.get(mode),
    }));
}

async function findCarbonFactorRows(modes, query) {
  try {
    const result = await query(
      `select transport_mode, co2_per_km
       from carbon_factors
      where transport_mode = any($1::text[])`,
      [modes]
    );

    return result.rows;
  } catch {
    console.info('Calcul carbone local');
    return [];
  }
}

/**
 * Calcule l'empreinte carbone d'un itineraire.
 *
 * La colonne carbon_factors.co2_per_km est attendue dans l'unite affichee
 * par l'interface, aujourd'hui des grammes de CO2e par kilometre.
 *
 * @param {{legs?: Array<{mode: string, distance_km: number}>}} itinerary
 * @param {{query?: Function}} [dependencies]
 * @returns {Promise<{total_co2e: number, unit: string, segments: Array<object>}>}
 */
export async function calculateCarbonFootprint(
  itinerary,
  { query = defaultQuery } = {}
) {
  const legs = Array.isArray(itinerary?.legs) ? itinerary.legs : [];
  const normalizedLegs = legs.map((leg, index) => ({
    index,
    mode: leg.mode,
    carbonMode: toCarbonMode(leg.mode),
    distance_km: toDistanceKm(leg.distance_km),
  }));
  const modes = [
    ...new Set(
      normalizedLegs.map((leg) => leg.carbonMode).filter((mode) => mode)
    ),
  ];

  if (modes.length === 0) {
    return {
      total_co2e: 0,
      unit: 'g',
      segments: [],
    };
  }

  const factorsByMode = new Map(
    getDefaultFactorRows(modes).map((row) => [
      normalizeMode(row.transport_mode),
      Number(row.co2_per_km),
    ])
  );
  const databaseFactorRows = await findCarbonFactorRows(modes, query);

  databaseFactorRows.forEach((row) => {
    factorsByMode.set(
      normalizeMode(row.transport_mode),
      Number(row.co2_per_km)
    );
  });

  const unknownModes = modes.filter(
    (mode) => !Number.isFinite(factorsByMode.get(mode))
  );

  if (unknownModes.length > 0) {
    throw createUnknownModeError(unknownModes);
  }

  const segments = normalizedLegs.map((leg) => {
    const co2PerKm = factorsByMode.get(leg.carbonMode);
    const co2e = leg.distance_km * co2PerKm;

    return {
      index: leg.index,
      mode: leg.mode,
      transport_mode: leg.carbonMode,
      distance_km: leg.distance_km,
      co2_per_km: co2PerKm,
      co2e,
    };
  });

  return {
    total_co2e: segments.reduce((total, segment) => total + segment.co2e, 0),
    unit: 'g',
    segments,
  };
}
