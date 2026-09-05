const DEFAULT_IDFM_BASE_URL =
  'https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia';
const DEFAULT_ROUTING_BASE_URL = 'https://router.project-osrm.org';
const DEFAULT_VELIB_BASE_URL =
  'https://velib-metropole-opendata.smovengo.cloud/opendata/Velib_Metropole';

const DEFAULT_TIMEOUT_MS = 8000;
const JOURNEY_TIMEOUT_MS = 12000;
const WALKING_SPEED_METERS_PER_SECOND = 1.25;
const BIKE_SPEED_METERS_PER_SECOND = 4.2;
const EARTH_RADIUS_METERS = 6371000;
const VELIB_TIMEOUT_MS = 8000;
const JOURNEY_PROFILE_ORDER = {
  walking: 0,
  bike: 1,
};

/**
 * Ligne de transport normalisée pour l'interface.
 *
 * @typedef {object} NormalizedLine
 * @property {string | null} id Identifiant Navitia/IDFM de la ligne.
 * @property {string | null} code Code court affichable.
 * @property {string | null} label Libellé complet affichable.
 * @property {string | null} commercialMode Mode commercial, par exemple Metro ou RER.
 * @property {string | null} physicalMode Mode physique si disponible.
 * @property {string | null} color Couleur hexadécimale de la ligne.
 * @property {string | null} textColor Couleur hexadécimale du texte.
 */

/**
 * Perturbation IDF Mobilites normalisee et rattachee a une ligne.
 *
 * Les perturbations sont regroupees par ligne avant exposition au client. Le
 * type vaut `interruption` pour les effets bloquants comme `NO_SERVICE`, sinon
 * `perturbation`. Les bus sont exclus, les messages HTML sont nettoyes, et les
 * periodes futures ou non applicables au jour courant sont filtrees.
 *
 * @typedef {object} NormalizedDisruption
 * @property {string} id Identifiant de regroupement, generalement celui de la ligne.
 * @property {string | null} status Statut Navitia/IDFM dominant du groupe.
 * @property {'interruption' | 'perturbation'} type Gravite normalisee.
 * @property {string} title Titre affiche pour le groupe.
 * @property {string} message Message principal nettoye.
 * @property {NormalizedLine} line Ligne concernee.
 * @property {number} count Nombre de perturbations distinctes retenues sur la ligne.
 * @property {object[]} disruptions Details distincts rattaches a la ligne.
 */

/**
 * Lieu normalisé renvoyé au client.
 *
 * @typedef {object} NormalizedPlace
 * @property {string} id Identifiant du lieu.
 * @property {string} [label] Libellé utilisé par l'autocomplétion.
 * @property {string} name Nom du lieu.
 * @property {string} type Type de lieu : adresse, station ou arrêt.
 * @property {number | null} distance Distance en mètres quand l'API la fournit.
 * @property {number[]} coordinates Coordonnées `[longitude, latitude]`.
 * @property {string | null} city Ville ou région administrative.
 * @property {NormalizedLine[]} lines Lignes desservant le lieu.
 */

/**
 * Borne vélo normalisée renvoyée au client.
 *
 * @typedef {object} NormalizedBikeStation
 * @property {string} id Identifiant normalisé côté client.
 * @property {string} stationId Identifiant GBFS/Vélib de la borne.
 * @property {string} name Nom de la borne.
 * @property {string} label Libellé utilisé dans l'interface.
 * @property {'bike'} type Type de lieu vélo.
 * @property {number} distance Distance en mètres depuis le point de recherche.
 * @property {number[]} coordinates Coordonnées `[longitude, latitude]`.
 * @property {string | null} city Ville, non renseignée pour Vélib.
 * @property {NormalizedLine[]} lines Toujours vide pour les bornes Vélib.
 * @property {number} capacity Capacité totale déclarée par la borne.
 * @property {number} availableBikes Nombre de vélos disponibles.
 * @property {number} availableDocks Nombre de places libres.
 * @property {number} mechanicalBikes Nombre de vélos mécaniques disponibles.
 * @property {number} electricBikes Nombre de vélos électriques disponibles.
 */

/**
 * Segment normalisé d'un itinéraire.
 *
 * @typedef {object} NormalizedJourneySection
 * @property {string} id Identifiant de section.
 * @property {string} type Type Navitia normalisé.
 * @property {string} mode Mode de transport ou de déplacement.
 * @property {string} label Libellé affichable.
 * @property {number} duration Durée en secondes.
 * @property {string | null} from Nom du point de départ.
 * @property {string | null} to Nom du point d'arrivée.
 * @property {string | null} departureDateTime Date de départ Navitia.
 * @property {string | null} arrivalDateTime Date d'arrivée Navitia.
 * @property {string} color Couleur de rendu.
 * @property {string} textColor Couleur de texte.
 * @property {NormalizedLine | null} line Ligne de transport associée.
 * @property {number} distanceKm Distance du segment en kilomètres.
 * @property {number | null} stopCount Nombre d'arrêts intermédiaires.
 * @property {string[]} stops Arrêts de la section.
 * @property {number[][] | null} geometry Géométrie `[longitude, latitude]`.
 */

/**
 * Itinéraire normalisé renvoyé au client.
 *
 * @typedef {object} NormalizedJourney
 * @property {string} id Identifiant stable côté interface.
 * @property {string} profile Profil : walking, bike ou transit.
 * @property {number} duration Durée totale en secondes.
 * @property {number} walkingDuration Durée de marche en secondes.
 * @property {number} bikeDuration Durée vélo en secondes.
 * @property {number} nbTransfers Nombre de correspondances.
 * @property {string | null} departureDateTime Date de départ Navitia.
 * @property {string | null} arrivalDateTime Date d'arrivée Navitia.
 * @property {NormalizedJourneySection[]} sections Sections détaillées.
 * @property {number[][] | null} geometry Géométrie globale `[longitude, latitude]`.
 * @property {{start: NormalizedBikeStation, end: NormalizedBikeStation}} [bikeStations] Bornes utilisées par un itinéraire vélo partagé.
 */

function getConfig() {
  return {
    apiKey: process.env.IDFM_API_KEY,
    baseUrl: (process.env.IDFM_API_BASE_URL || DEFAULT_IDFM_BASE_URL).replace(
      /\/$/,
      ''
    ),
    routingBaseUrl: (
      process.env.ROUTING_API_BASE_URL || DEFAULT_ROUTING_BASE_URL
    ).replace(/\/$/, ''),
    velibBaseUrl: (
      process.env.VELIB_API_BASE_URL || DEFAULT_VELIB_BASE_URL
    ).replace(/\/$/, ''),
  };
}

function isFiniteCoordinate(value, min, max) {
  const numberValue = Number(value);
  return (
    Number.isFinite(numberValue) && numberValue >= min && numberValue <= max
  );
}

function toBoundedInteger(value, { fallback, min, max }) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.min(Math.max(Math.trunc(numberValue), min), max);
}

function toStationType(place) {
  const embeddedType = place.embedded_type;

  if (embeddedType === 'stop_area') {
    return 'transport';
  }

  if (embeddedType === 'stop_point') {
    return 'stop';
  }

  return embeddedType || 'transport';
}

function toOptionalText(value) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (value && typeof value === 'object') {
    return (
      toOptionalText(value.name) ||
      toOptionalText(value.label) ||
      toOptionalText(value.code) ||
      toOptionalText(value.id)
    );
  }

  return null;
}

function normalizeLine(line) {
  if (!line) {
    return null;
  }

  const color = toOptionalText(line.color);
  const textColor = toOptionalText(line.text_color);
  const commercialMode =
    toOptionalText(line.commercial_mode) ||
    toOptionalText(line.commercialMode) ||
    toOptionalText(line.network?.name) ||
    toOptionalText(line.physical_modes?.[0]?.name) ||
    null;
  const code =
    toOptionalText(line.code) ||
    toOptionalText(line.label) ||
    toOptionalText(line.name);

  if (!code && !commercialMode) {
    return null;
  }

  return {
    id: toOptionalText(line.id) || toOptionalText(line.uri) || code,
    code,
    label:
      toOptionalText(line.name) ||
      toOptionalText(line.label) ||
      code ||
      commercialMode,
    commercialMode,
    physicalMode:
      toOptionalText(line.physical_modes?.[0]?.name) ||
      toOptionalText(line.physicalMode) ||
      null,
    color: color ? `#${color.replace(/^#/, '')}` : null,
    textColor: textColor ? `#${textColor.replace(/^#/, '')}` : null,
  };
}

function getLineModeText(line = {}) {
  return [
    line.commercialMode,
    line.commercial_mode,
    line.physicalMode,
    line.physical_modes?.[0]?.name,
    line.network?.name,
    line.label,
    line.code,
    line.name,
  ]
    .filter(Boolean)
    .join(' ');
}

function getDisruptionModeRank(line = {}) {
  const normalizedMode = normalizePlaceName(getLineModeText(line));
  const code = String(line.code || line.label || '').trim();

  if (normalizedMode.includes('bus')) {
    return null;
  }

  if (normalizedMode.includes('metro') || /^\d{1,2}$/.test(code)) {
    return 0;
  }

  if (normalizedMode.includes('rer')) {
    return 1;
  }

  if (
    normalizedMode.includes('rapid') ||
    normalizedMode.includes('train') ||
    /^[A-E]$/i.test(code)
  ) {
    return 2;
  }

  if (normalizedMode.includes('tram') || /^T\d*/i.test(code)) {
    return 3;
  }

  return null;
}

function getDisruptionSeverityRank(disruption = {}) {
  const severityText = normalizePlaceName(
    [
      disruption.severity?.effect,
      disruption.severity?.name,
      disruption.status,
      disruption.cause,
      disruption.category,
    ]
      .filter(Boolean)
      .join(' ')
  );

  if (
    severityText.includes('no_service') ||
    severityText.includes('interrupt') ||
    severityText.includes('suspend') ||
    severityText.includes('ferme') ||
    severityText.includes('closed') ||
    severityText.includes('blocked')
  ) {
    return 0;
  }

  return 1;
}

function getDisruptionMessage(disruption = {}) {
  const messages = Array.isArray(disruption.messages)
    ? disruption.messages
    : [];

  return cleanDisruptionText(
    toOptionalText(messages[0]?.text) ||
      toOptionalText(disruption.message) ||
      toOptionalText(disruption.severity?.name) ||
      'Perturbation en cours'
  );
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([a-f\d]+);/gi, (_, code) =>
      String.fromCharCode(Number.parseInt(code, 16))
    )
    .replace(
      /&(amp|lt|gt|quot|apos|nbsp);/g,
      (_, entity) =>
        ({
          amp: '&',
          lt: '<',
          gt: '>',
          quot: '"',
          apos: "'",
          nbsp: ' ',
        })[entity] || ''
    );
}

function cleanDisruptionText(value) {
  return decodeHtmlEntities(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDisruptionText(value) {
  return normalizePlaceName(cleanDisruptionText(value))
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isUninformativeDisruptionMessage(message) {
  const normalizedMessage = normalizeDisruptionText(message);

  return [
    'arret s non desservi s',
    'arret non desservi',
    'arrets non desservis',
  ].includes(normalizedMessage);
}

function getLineDisruptionIds(line = {}) {
  const links = Array.isArray(line.links) ? line.links : [];

  return links
    .filter((link) => link.rel === 'disruptions' || link.type === 'disruption')
    .map((link) => toOptionalText(link.id))
    .filter(Boolean);
}

function getImpactedObjectLine(impactedObject = {}) {
  const ptObject =
    impactedObject.pt_object ||
    impactedObject.impacted_object ||
    impactedObject;

  if (!ptObject || typeof ptObject !== 'object') {
    return null;
  }

  if (ptObject.embedded_type === 'line' && ptObject.line) {
    return ptObject.line;
  }

  return (
    ptObject.line ||
    ptObject.route?.line ||
    ptObject.stop_point?.line ||
    ptObject.stop_area?.line ||
    null
  );
}

function getDisruptionImpactedLines(disruption = {}) {
  const impactedObjects = [
    ...(Array.isArray(disruption.impacted_objects)
      ? disruption.impacted_objects
      : []),
    ...(Array.isArray(disruption.impactedObjects)
      ? disruption.impactedObjects
      : []),
  ];

  return impactedObjects.map(getImpactedObjectLine).filter(Boolean);
}

function upsertNormalizedTrafficDisruption(
  normalizedDisruptions,
  disruption,
  line,
  now
) {
  if (!isDisruptionCurrentlyApplicable(disruption, now)) {
    return;
  }

  const normalizedDisruption = normalizeTrafficDisruption(disruption, line);

  if (!normalizedDisruption) {
    return;
  }

  normalizedDisruptions.set(
    `${normalizedDisruption.id}:${normalizedDisruption.line.id}`,
    normalizedDisruption
  );
}

function formatNavitiaDateTime(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    'T',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
}

function createTrafficReportsUrl({ count, date = new Date() }, baseUrl) {
  const url = new URL(`${baseUrl}/traffic_reports`);
  const navitiaDateTime = formatNavitiaDateTime(date);

  url.searchParams.set('count', String(count));
  url.searchParams.set('depth', '2');
  url.searchParams.set('since', navitiaDateTime);
  url.searchParams.set('until', navitiaDateTime);
  url.searchParams.set('disable_geojson', 'true');

  return url;
}

function parseNavitiaDateTime(value) {
  if (!value) {
    return null;
  }

  if (/^\d{8}T\d{6}$/.test(value)) {
    return new Date(
      `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}`
    );
  }

  if (/^\d{14}$/.test(value)) {
    return new Date(
      `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(8, 10)}:${value.slice(10, 12)}:${value.slice(12, 14)}`
    );
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getMonthIndex(value) {
  const month = Number(value);

  return Number.isInteger(month) && month >= 1 && month <= 12
    ? month - 1
    : null;
}

const FRENCH_MONTHS = new Map(
  [
    'janvier',
    'fevrier',
    'mars',
    'avril',
    'mai',
    'juin',
    'juillet',
    'aout',
    'septembre',
    'octobre',
    'novembre',
    'decembre',
  ].map((month, index) => [month, index])
);

const FRENCH_WEEKDAY_PATTERN =
  '(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\\s+';
const FRENCH_MONTH_PATTERN =
  '(janvier|fevrier|février|mars|avril|mai|juin|juillet|aout|août|septembre|octobre|novembre|decembre|décembre)';

function getFrenchMonthIndex(value) {
  return FRENCH_MONTHS.get(normalizePlaceName(value));
}

function isDatePartsCurrent({ startDay, startMonth, endDay, endMonth }, now) {
  if (
    !Number.isInteger(startDay) ||
    !Number.isInteger(endDay) ||
    !Number.isInteger(startMonth) ||
    !Number.isInteger(endMonth)
  ) {
    return false;
  }

  const currentYear = now.getFullYear();
  const startDate = new Date(currentYear, startMonth, startDay, 0, 0, 0);
  const endDate = new Date(currentYear, endMonth, endDay, 23, 59, 59);
  const currentTime = now.getTime();

  return startDate.getTime() <= currentTime && currentTime <= endDate.getTime();
}

function isStartDateReached({ startDay, startMonth }, now) {
  if (!Number.isInteger(startDay) || !Number.isInteger(startMonth)) {
    return false;
  }

  const startDate = new Date(now.getFullYear(), startMonth, startDay, 0, 0, 0);

  return startDate.getTime() <= now.getTime();
}

function hasCurrentDateInFrenchMessageDates(message, now = new Date()) {
  const normalizedMessage = cleanDisruptionText(message);
  const fullRangePattern = new RegExp(
    `\\b(?:du\\s+)?(?:${FRENCH_WEEKDAY_PATTERN})?(\\d{1,2})\\s+${FRENCH_MONTH_PATTERN}\\s+(?:au|a|à|-)\\s+(?:${FRENCH_WEEKDAY_PATTERN})?(\\d{1,2})\\s+${FRENCH_MONTH_PATTERN}\\b`,
    'gi'
  );
  const rangePattern = new RegExp(
    `\\b(?:du\\s+)?(?:${FRENCH_WEEKDAY_PATTERN})?(\\d{1,2})\\s+(?:au|a|à|-)\\s+(?:${FRENCH_WEEKDAY_PATTERN})?(\\d{1,2})\\s+${FRENCH_MONTH_PATTERN}\\b`,
    'gi'
  );
  const openStartPattern = new RegExp(
    `\\b(?:a|à)\\s+partir\\s+du\\s+(?:${FRENCH_WEEKDAY_PATTERN})?(\\d{1,2})\\s+${FRENCH_MONTH_PATTERN}\\b`,
    'gi'
  );
  const singleDatePattern = new RegExp(
    `\\b(?:${FRENCH_WEEKDAY_PATTERN})?(\\d{1,2})\\s+${FRENCH_MONTH_PATTERN}\\b`,
    'gi'
  );
  const fullRangeMatches = [...normalizedMessage.matchAll(fullRangePattern)];
  const dateMatches = [
    ...normalizedMessage.matchAll(rangePattern),
    ...normalizedMessage.matchAll(singleDatePattern),
  ];
  const openStartMatches = [...normalizedMessage.matchAll(openStartPattern)];

  if (
    fullRangeMatches.length === 0 &&
    dateMatches.length === 0 &&
    openStartMatches.length === 0
  ) {
    return true;
  }

  const todayDay = now.getDate();
  const todayMonth = now.getMonth();

  if (
    fullRangeMatches.some((match) =>
      isDatePartsCurrent(
        {
          startDay: Number(match[1]),
          startMonth: getFrenchMonthIndex(match[2]),
          endDay: Number(match[3]),
          endMonth: getFrenchMonthIndex(match[4]),
        },
        now
      )
    )
  ) {
    return true;
  }

  if (
    openStartMatches.some((match) =>
      isStartDateReached(
        {
          startDay: Number(match[1]),
          startMonth: getFrenchMonthIndex(match[2]),
        },
        now
      )
    )
  ) {
    return true;
  }

  return dateMatches.some((match) => {
    if (match.length === 4) {
      const startDay = Number(match[1]);
      const endDay = Number(match[2]);
      const monthIndex = getFrenchMonthIndex(match[3]);

      return (
        monthIndex === todayMonth &&
        Number.isInteger(startDay) &&
        Number.isInteger(endDay) &&
        startDay <= todayDay &&
        todayDay <= endDay
      );
    }

    const day = Number(match[1]);
    const monthIndex = getFrenchMonthIndex(match[2]);

    return monthIndex === todayMonth && day === todayDay;
  });
}

function isWeekendOnlyMessage(message, now = new Date()) {
  const normalizedMessage = normalizeDisruptionText(message);
  const day = now.getDay();
  const isWeekend = day === 0 || day === 6;

  return (
    !isWeekend &&
    (normalizedMessage.includes('week end') ||
      normalizedMessage.includes('week ends') ||
      normalizedMessage.includes('weekend') ||
      normalizedMessage.includes('weekends'))
  );
}

function hasCurrentDateInExplicitMessageDates(message, now = new Date()) {
  const normalizedMessage = cleanDisruptionText(message);
  const numericRangeSeparator = String.raw`\s*(?:-|au|a|\u00e0|jusqu['\u2019]au)\s*`;
  const numericRangeMatches = [
    ...normalizedMessage.matchAll(
      new RegExp(
        String.raw`\b(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?${numericRangeSeparator}(?:\d{1,2}\/)?(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?\b`,
        'gi'
      )
    ),
  ];
  const dateMatches = [
    ...normalizedMessage.matchAll(/\b(\d{1,2})-(\d{1,2})\/(\d{1,2})\b/g),
    ...normalizedMessage
      .replace(/\b\d{1,2}\/\d{1,2}\s*-\s*\d{1,2}\/\d{1,2}\b/g, '')
      .matchAll(/\b(\d{1,2})\/(\d{1,2})\b/g),
  ];

  if (numericRangeMatches.length === 0 && dateMatches.length === 0) {
    return hasCurrentDateInFrenchMessageDates(message, now);
  }

  const todayDay = now.getDate();
  const todayMonth = now.getMonth();

  const hasCurrentNumericRange = numericRangeMatches.some((match) =>
    isDatePartsCurrent(
      {
        startDay: Number(match[1]),
        startMonth: getMonthIndex(match[2]),
        endDay: Number(match[3]),
        endMonth: getMonthIndex(match[4]),
      },
      now
    )
  );
  const hasCurrentNumericDate = dateMatches.some((match) => {
    if (match.length === 4) {
      const startDay = Number(match[1]);
      const endDay = Number(match[2]);
      const monthIndex = getMonthIndex(match[3]);

      return (
        monthIndex === todayMonth &&
        Number.isInteger(startDay) &&
        Number.isInteger(endDay) &&
        startDay <= todayDay &&
        todayDay <= endDay
      );
    }

    const day = Number(match[1]);
    const monthIndex = getMonthIndex(match[2]);

    return monthIndex === todayMonth && day === todayDay;
  });

  return (
    (hasCurrentNumericRange || hasCurrentNumericDate) &&
    hasCurrentDateInFrenchMessageDates(message, now)
  );
}

function isDisruptionCurrentlyApplicable(disruption = {}, now = new Date()) {
  const applicationPeriods = Array.isArray(disruption.application_periods)
    ? disruption.application_periods
    : [];
  const message = getDisruptionMessage(disruption);

  if (
    isUninformativeDisruptionMessage(message) ||
    isWeekendOnlyMessage(message, now)
  ) {
    return false;
  }

  if (!hasCurrentDateInExplicitMessageDates(message, now)) {
    return false;
  }

  if (applicationPeriods.length === 0) {
    return true;
  }

  const nowTime = now.getTime();

  return applicationPeriods.some((period) => {
    const begin = parseNavitiaDateTime(period.begin || period.start);
    const end = parseNavitiaDateTime(period.end || period.stop);

    if (!begin || !end) {
      return false;
    }

    return begin.getTime() <= nowTime && nowTime <= end.getTime();
  });
}

function normalizeTrafficDisruption(disruption, line) {
  const normalizedLine = normalizeLine(line);
  const modeRank = getDisruptionModeRank(line);

  if (!disruption || !normalizedLine || modeRank === null) {
    return null;
  }

  const severityRank = getDisruptionSeverityRank(disruption);

  return {
    id: toOptionalText(disruption.id) || toOptionalText(disruption.uri),
    uri: toOptionalText(disruption.uri),
    status: toOptionalText(disruption.status),
    type: severityRank === 0 ? 'interruption' : 'perturbation',
    title: getDisruptionMessage(disruption),
    message: getDisruptionMessage(disruption),
    cause: toOptionalText(disruption.cause),
    category: toOptionalText(disruption.category),
    severity: {
      name: toOptionalText(disruption.severity?.name),
      effect: toOptionalText(disruption.severity?.effect),
      color: toOptionalText(disruption.severity?.color),
    },
    applicationPeriods: disruption.application_periods || [],
    line: normalizedLine,
    severityRank,
    modeRank,
  };
}

function groupDisruptionsByLine(disruptions) {
  const disruptionsByLine = new Map();

  disruptions.forEach((disruption) => {
    const lineKey = disruption.line.id || disruption.line.code;
    const currentGroup = disruptionsByLine.get(lineKey);
    const nextDisruption = {
      id: disruption.id,
      uri: disruption.uri,
      status: disruption.status,
      type: disruption.type,
      title: disruption.title,
      message: disruption.message,
      cause: disruption.cause,
      category: disruption.category,
      severity: disruption.severity,
      applicationPeriods: disruption.applicationPeriods,
    };

    if (!currentGroup) {
      disruptionsByLine.set(lineKey, {
        id: lineKey,
        status: disruption.status,
        type: disruption.type,
        title: disruption.title,
        message: disruption.message,
        line: disruption.line,
        severityRank: disruption.severityRank,
        modeRank: disruption.modeRank,
        disruptions: [nextDisruption],
      });
      return;
    }

    const hasSameMessage = currentGroup.disruptions.some(
      (currentDisruption) =>
        currentDisruption.id === nextDisruption.id ||
        currentDisruption.message === nextDisruption.message
    );

    if (!hasSameMessage) {
      currentGroup.disruptions.push(nextDisruption);
    }

    if (disruption.severityRank < currentGroup.severityRank) {
      currentGroup.status = disruption.status;
      currentGroup.type = disruption.type;
      currentGroup.title = disruption.title;
      currentGroup.message = disruption.message;
      currentGroup.severityRank = disruption.severityRank;
    }
  });

  return [...disruptionsByLine.values()].map((group) => ({
    ...group,
    count: group.disruptions.length,
    title:
      group.disruptions.length === 1
        ? group.title
        : `${group.disruptions.length} perturbations sur cette ligne`,
  }));
}

function sortDisruptions(disruptions) {
  return disruptions.sort((first, second) => {
    const severityDelta = first.severityRank - second.severityRank;

    if (severityDelta !== 0) {
      return severityDelta;
    }

    const modeDelta = first.modeRank - second.modeRank;

    if (modeDelta !== 0) {
      return modeDelta;
    }

    return String(first.line.code || first.line.label || '').localeCompare(
      String(second.line.code || second.line.label || ''),
      'fr',
      { numeric: true }
    );
  });
}

function normalizeTrafficReports(data, { now = new Date() } = {}) {
  const disruptionsById = new Map(
    (data.disruptions || [])
      .map((disruption) => [toOptionalText(disruption.id), disruption])
      .filter(([id]) => id)
  );
  const normalizedDisruptions = new Map();

  (data.traffic_reports || []).forEach((trafficReport) => {
    (trafficReport.lines || []).forEach((line) => {
      getLineDisruptionIds(line).forEach((disruptionId) => {
        const disruption = disruptionsById.get(disruptionId);

        upsertNormalizedTrafficDisruption(
          normalizedDisruptions,
          disruption,
          line,
          now
        );
      });
    });
  });

  (data.disruptions || []).forEach((disruption) => {
    getDisruptionImpactedLines(disruption).forEach((line) => {
      upsertNormalizedTrafficDisruption(
        normalizedDisruptions,
        disruption,
        line,
        now
      );
    });
  });

  return sortDisruptions(
    groupDisruptionsByLine([...normalizedDisruptions.values()])
  );
}

function getPlaceLines(embeddedObject) {
  return (embeddedObject.lines || []).map(normalizeLine).filter(Boolean);
}

function getPlaceCity(embeddedObject) {
  return (
    embeddedObject.address?.city ||
    embeddedObject.administrative_regions?.[0]?.name ||
    null
  );
}

function normalizePlace(place) {
  const embeddedObject = place?.[place.embedded_type] || {};
  const coord = embeddedObject.coord || place.coord;
  const lon = Number(coord?.lon);
  const lat = Number(coord?.lat);

  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    return null;
  }

  return {
    id: place.id || embeddedObject.id,
    name: place.name || embeddedObject.label || embeddedObject.name,
    type: toStationType(place),
    distance: Number.isFinite(Number(place.distance))
      ? Number(place.distance)
      : null,
    coordinates: [lon, lat],
    city: getPlaceCity(embeddedObject),
    lines: getPlaceLines(embeddedObject),
  };
}

function normalizePlacesNearby(data) {
  return (data.places_nearby || []).map(normalizePlace).filter(Boolean);
}

function normalizeCoordinatesPlace(data) {
  const places = normalizePlacesNearby(data);
  const bestAddressPlace = places.find((place) => place.type === 'address');

  if (bestAddressPlace) {
    return {
      place: {
        ...bestAddressPlace,
        label: bestAddressPlace.name,
      },
    };
  }

  const firstPlace = places[0];

  return {
    place: firstPlace
      ? {
          ...firstPlace,
          label: firstPlace.name,
        }
      : null,
  };
}

function normalizeSearchPlaces(data) {
  return (data.places || [])
    .map((place) => {
      const normalizedPlace = normalizePlace(place);

      if (!normalizedPlace?.id || !normalizedPlace.name) {
        return null;
      }

      return {
        ...normalizedPlace,
        label: normalizedPlace.name,
      };
    })
    .filter(Boolean);
}

function createIdfmUrl({ lon, lat, distance, count }, baseUrl) {
  const url = new URL(`${baseUrl}/coords/${lon};${lat}/places_nearby`);
  url.searchParams.set('distance', String(distance));
  url.searchParams.set('count', String(count));
  url.searchParams.append('type[]', 'stop_area');
  url.searchParams.set('disable_geojson', 'true');
  url.searchParams.set('disable_disruption', 'true');
  return url;
}

function createCoordinatesPlaceUrl({ lon, lat }, baseUrl) {
  const url = new URL(`${baseUrl}/coords/${lon};${lat}/places_nearby`);
  url.searchParams.set('distance', '150');
  url.searchParams.set('count', '6');
  url.searchParams.append('type[]', 'address');
  url.searchParams.append('type[]', 'poi');
  url.searchParams.append('type[]', 'stop_area');
  url.searchParams.set('disable_geojson', 'true');
  url.searchParams.set('disable_disruption', 'true');
  return url;
}

function appendArrayParams(url, name, values) {
  values.forEach((value) => {
    url.searchParams.append(`${name}[]`, value);
  });
}

function createPlacesUrl({ query, count }, baseUrl) {
  const url = new URL(`${baseUrl}/places`);
  url.searchParams.set('q', query);
  url.searchParams.set('count', String(count));
  url.searchParams.append('type[]', 'address');
  url.searchParams.append('type[]', 'stop_area');
  url.searchParams.set('disable_geojson', 'true');
  url.searchParams.set('disable_disruption', 'true');
  return url;
}

/**
 * Construit l'URL Navitia d'un calcul d'itinéraire pour un profil donné.
 *
 * Quand `wheelchairAccessible` est actif, le paramètre Navitia
 * `wheelchair=true` est ajouté afin de demander des parcours en transports
 * compatibles avec un accès PMR.
 *
 * @param {object} params Paramètres de requête Navitia.
 * @param {string} params.from Identifiant ou coordonnées du départ.
 * @param {string} params.to Identifiant ou coordonnées de l'arrivée.
 * @param {string} params.directPath Stratégie Navitia de trajet direct.
 * @param {string[]} [params.directPathModes=[]] Modes autorisés en trajet direct.
 * @param {string[]} [params.firstSectionModes=['walking']] Modes de rabattement.
 * @param {string[]} [params.lastSectionModes=['walking']] Modes de fin de parcours.
 * @param {number} params.count Nombre d'itinéraires demandés.
 * @param {boolean} [params.wheelchairAccessible=false] Demande les itinéraires accessibles PMR.
 * @param {string} baseUrl Base URL Navitia IDF Mobilités.
 * @returns {URL} URL Navitia prête à appeler.
 */
function createJourneyUrl(
  {
    from,
    to,
    directPath,
    directPathModes = [],
    firstSectionModes = ['walking'],
    lastSectionModes = ['walking'],
    count,
    wheelchairAccessible = false,
  },
  baseUrl
) {
  const url = new URL(`${baseUrl}/journeys`);
  url.searchParams.set('from', from);
  url.searchParams.set('to', to);
  url.searchParams.set('count', String(count));
  url.searchParams.set('language', 'fr-FR');
  url.searchParams.set('datetime_represents', 'departure');
  url.searchParams.set('data_freshness', 'realtime');
  url.searchParams.set('direct_path', directPath);
  url.searchParams.set('min_nb_journeys', String(count));
  appendArrayParams(url, 'first_section_mode', firstSectionModes);
  appendArrayParams(url, 'last_section_mode', lastSectionModes);

  if (wheelchairAccessible) {
    url.searchParams.set('wheelchair', 'true');
  }

  if (directPathModes.length > 0) {
    appendArrayParams(url, 'direct_path_mode', directPathModes);
  }

  return url;
}

function toCoordinateParam(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  const lon = Number(coordinates[0]);
  const lat = Number(coordinates[1]);

  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    return null;
  }

  return `${lon};${lat}`;
}

function toCoordinatePair(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  const lon = Number(coordinates[0]);
  const lat = Number(coordinates[1]);

  if (
    !isFiniteCoordinate(lon, -180, 180) ||
    !isFiniteCoordinate(lat, -90, 90)
  ) {
    return null;
  }

  return [lon, lat];
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function getStraightLineDistanceMeters(fromCoordinates, toCoordinates) {
  const [fromLon, fromLat] = fromCoordinates;
  const [toLon, toLat] = toCoordinates;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLon = toRadians(toLon - fromLon);
  const lat1 = toRadians(fromLat);
  const lat2 = toRadians(toLat);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

function getPathDistanceMeters(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  return coordinates
    .slice(1)
    .reduce(
      (totalDistance, coordinate, index) =>
        totalDistance +
        getStraightLineDistanceMeters(coordinates[index], coordinate),
      0
    );
}

function createDirectFallbackJourney({
  profile,
  fromCoordinates,
  toCoordinates,
  route = null,
}) {
  const speed =
    profile === 'bike'
      ? BIKE_SPEED_METERS_PER_SECOND
      : WALKING_SPEED_METERS_PER_SECOND;
  const geometry = route?.geometry || [fromCoordinates, toCoordinates];
  const distance =
    route?.distance ||
    getPathDistanceMeters(geometry) ||
    getStraightLineDistanceMeters(fromCoordinates, toCoordinates);
  const duration = Math.max(60, Math.round(distance / speed));
  const mode = profile === 'bike' ? 'bike' : 'walking';
  const label = profile === 'bike' ? 'Velo' : 'Marche';
  const color = profile === 'bike' ? '#14b8a6' : '#64748b';
  const section = {
    id: `${profile}-direct-fallback-section`,
    type: 'street_network',
    mode,
    label,
    duration,
    from: null,
    to: null,
    departureDateTime: null,
    arrivalDateTime: null,
    color,
    textColor: '#ffffff',
    line: null,
    distanceKm: distance / 1000,
    geometry,
  };

  return {
    id: `${profile}-direct-fallback`,
    profile,
    duration,
    walkingDuration: profile === 'walking' ? duration : 0,
    bikeDuration: profile === 'bike' ? duration : 0,
    nbTransfers: 0,
    departureDateTime: null,
    arrivalDateTime: null,
    sections: [section],
    geometry,
    isStraightLineFallback: !route,
  };
}

function createRoutingUrl(
  { profile, fromCoordinates, toCoordinates },
  baseUrl
) {
  const routingProfile = profile === 'bike' ? 'bike' : 'foot';
  const url = new URL(
    `${baseUrl}/route/v1/${routingProfile}/${fromCoordinates.join(',')};${toCoordinates.join(',')}`
  );
  url.searchParams.set('overview', 'full');
  url.searchParams.set('geometries', 'geojson');
  url.searchParams.set('steps', 'false');
  url.searchParams.set('alternatives', 'false');
  return url;
}

async function fetchStreetRoute(
  { profile, fromCoordinates, toCoordinates },
  { fetchImpl, signal, routingBaseUrl }
) {
  const url = createRoutingUrl(
    { profile, fromCoordinates, toCoordinates },
    routingBaseUrl
  );

  try {
    const response = await fetchImpl(url, {
      signal,
      headers: {
        accept: 'application/json',
      },
    });
    const data = await response.json().catch(() => ({}));
    const route = data.routes?.[0];
    const coordinates = (route?.geometry?.coordinates || []).filter(
      (coordinate) => Array.isArray(coordinate) && coordinate.length >= 2
    );

    if (!response.ok || coordinates.length < 2) {
      return null;
    }

    return {
      distance: Number.isFinite(Number(route.distance))
        ? Number(route.distance)
        : null,
      geometry: simplifyGeometry(coordinates),
    };
  } catch {
    return null;
  }
}

async function requestJson(url, { fetchImpl, signal }) {
  let response;

  try {
    response = await fetchImpl(url, {
      signal,
      headers: {
        accept: 'application/json',
      },
    });
  } catch (fetchError) {
    fetchError.status = fetchError.name === 'AbortError' ? 504 : 502;
    fetchError.message =
      fetchError.name === 'AbortError'
        ? 'Délai dépassé pour le service vélo.'
        : 'Service de données vélo inaccessible.';
    throw fetchError;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error('Service de données vélo inaccessible.');
    error.status = response.status;
    throw error;
  }

  return data;
}

async function requestIdfm(url, { apiKey, fetchImpl, signal }) {
  let response;

  try {
    response = await fetchImpl(url, {
      signal,
      headers: {
        accept: 'application/json',
        apikey: apiKey,
      },
    });
  } catch (fetchError) {
    fetchError.status = fetchError.name === 'AbortError' ? 504 : 502;
    fetchError.message =
      fetchError.name === 'AbortError'
        ? "Délai dépassé pour l'API Ile-de-France Mobilités."
        : 'API Ile-de-France Mobilités inaccessible.';
    throw fetchError;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data.message || data.error || 'Erreur API Ile-de-France Mobilités.'
    );
    error.status = response.status;
    throw error;
  }

  return data;
}

function normalizePlaceName(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function isPlatformChangeSection(section) {
  const fromName = normalizePlaceName(section.from?.name);
  const toName = normalizePlaceName(section.to?.name);

  return (
    section.mode === 'walking' &&
    Boolean(fromName) &&
    Boolean(toName) &&
    fromName === toName
  );
}

function removeCitySuffix(value) {
  return toOptionalText(value)?.replace(/\s+\([^)]*\)\s*$/, '') || null;
}

function getSectionMode(section) {
  if (section.type === 'waiting') {
    return 'waiting';
  }

  if (section.type === 'transfer' || isPlatformChangeSection(section)) {
    return 'platform_change';
  }

  if (section.type === 'public_transport') {
    return (
      section.display_informations?.commercial_mode ||
      section.display_informations?.physical_mode ||
      'Transport'
    );
  }

  return section.mode || section.type || 'section';
}

function getSectionLabel(section) {
  if (section.type === 'waiting') {
    return 'Attente';
  }

  if (section.type === 'transfer' || isPlatformChangeSection(section)) {
    return 'Changement de quai';
  }

  if (section.type === 'public_transport') {
    return (
      removeCitySuffix(section.display_informations?.direction) || 'Transport'
    );
  }

  if (section.mode === 'walking') {
    return 'Marche';
  }

  if (section.mode === 'bike') {
    return 'Vélo';
  }

  return section.type || 'Trajet';
}

function toBikeSection(section) {
  return {
    ...section,
    mode: 'bike',
    label: 'Vélo',
    duration: Math.max(1, Math.round((section.duration || 0) * 0.36)),
    color: '#14b8a6',
    textColor: '#ffffff',
  };
}

function getSectionColor(section) {
  if (section.display_informations?.color) {
    return `#${section.display_informations.color.replace(/^#/, '')}`;
  }

  if (section.mode === 'walking') {
    return '#64748b';
  }

  if (section.mode === 'bike') {
    return '#14b8a6';
  }

  return '#2563eb';
}

function getSectionTextColor(section) {
  if (section.display_informations?.text_color) {
    return `#${section.display_informations.text_color.replace(/^#/, '')}`;
  }

  return '#ffffff';
}

function getSectionLine(section) {
  if (section.type !== 'public_transport') {
    return null;
  }

  return {
    id: section.display_informations?.uris?.line || null,
    code:
      section.display_informations?.code || section.display_informations?.label,
    label: section.display_informations?.label || null,
    name: section.display_informations?.name || null,
    direction: section.display_informations?.direction || null,
    commercialMode: section.display_informations?.commercial_mode || null,
    physicalMode: section.display_informations?.physical_mode || null,
  };
}

function getSectionGeometry(section) {
  const coordinates = (section.geojson?.coordinates || []).filter(
    (coordinate) => Array.isArray(coordinate) && coordinate.length >= 2
  );

  return coordinates.length > 1 ? simplifyGeometry(coordinates, 120) : null;
}

function getSectionDistanceKm(section, geometry) {
  const lengthMeters = Number(section.length);

  if (Number.isFinite(lengthMeters) && lengthMeters >= 0) {
    return lengthMeters / 1000;
  }

  const geometryDistance = getPathDistanceMeters(geometry);

  return geometryDistance ? geometryDistance / 1000 : 0;
}

function getSectionStopCount(section) {
  if (!Array.isArray(section.stop_date_times)) {
    return null;
  }

  return Math.max(0, section.stop_date_times.length - 1);
}

function getSectionStops(section) {
  if (!Array.isArray(section.stop_date_times)) {
    return [];
  }

  return section.stop_date_times
    .map((stopDateTime) =>
      removeCitySuffix(
        stopDateTime.stop_point?.name ||
          stopDateTime.stop_point?.label ||
          stopDateTime.stop_point?.id
      )
    )
    .filter(Boolean);
}

function normalizeSection(section) {
  const geometry = getSectionGeometry(section);

  return {
    id: section.id,
    type: section.type,
    mode: getSectionMode(section),
    label: getSectionLabel(section),
    duration: section.duration || 0,
    from: removeCitySuffix(section.from?.name),
    to: removeCitySuffix(section.to?.name),
    departureDateTime: section.departure_date_time || null,
    arrivalDateTime: section.arrival_date_time || null,
    color: getSectionColor(section),
    textColor: getSectionTextColor(section),
    line: getSectionLine(section),
    distanceKm: getSectionDistanceKm(section, geometry),
    stopCount: getSectionStopCount(section),
    stops: getSectionStops(section),
    geometry,
  };
}

function simplifyGeometry(coordinates, maxPoints = 240) {
  if (coordinates.length <= maxPoints) {
    return coordinates;
  }

  const step = Math.ceil(coordinates.length / maxPoints);
  const simplifiedCoordinates = coordinates.filter(
    (coordinate, index) => index % step === 0
  );
  const lastCoordinate = coordinates[coordinates.length - 1];

  if (
    simplifiedCoordinates[simplifiedCoordinates.length - 1] !== lastCoordinate
  ) {
    simplifiedCoordinates.push(lastCoordinate);
  }

  return simplifiedCoordinates;
}

function getVelibStationId(station) {
  return String(station?.station_id ?? station?.stationId ?? '').trim();
}

function getAvailableBikeCount(status = {}) {
  return Number(status.num_bikes_available ?? status.numBikesAvailable ?? 0);
}

function getAvailableDockCount(status = {}) {
  return Number(status.num_docks_available ?? status.numDocksAvailable ?? 0);
}

function getTypedBikeCount(status = {}, type) {
  const bikeTypes = status.num_bikes_available_types;

  if (!Array.isArray(bikeTypes)) {
    return 0;
  }

  return bikeTypes.reduce(
    (total, entry) => total + Number(entry[type] || 0),
    0
  );
}

function normalizeBikeStation(info, status, originCoordinates) {
  const lon = Number(info.lon);
  const lat = Number(info.lat);

  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    return null;
  }

  const coordinates = [lon, lat];

  return {
    id: `velib:${getVelibStationId(info)}`,
    stationId: getVelibStationId(info),
    name: toOptionalText(info.name) || 'Station Vélib',
    label: toOptionalText(info.name) || 'Station Vélib',
    type: 'bike',
    distance: Math.round(
      getStraightLineDistanceMeters(originCoordinates, coordinates)
    ),
    coordinates,
    city: null,
    lines: [],
    capacity: Number(info.capacity || 0),
    availableBikes: getAvailableBikeCount(status),
    availableDocks: getAvailableDockCount(status),
    mechanicalBikes: getTypedBikeCount(status, 'mechanical'),
    electricBikes: getTypedBikeCount(status, 'ebike'),
  };
}

async function fetchVelibStations({ fetchImpl, signal, velibBaseUrl }) {
  const [information, status] = await Promise.all([
    requestJson(`${velibBaseUrl}/station_information.json`, {
      fetchImpl,
      signal,
    }),
    requestJson(`${velibBaseUrl}/station_status.json`, {
      fetchImpl,
      signal,
    }),
  ]);
  const statusesById = new Map(
    (status.data?.stations || []).map((stationStatus) => [
      getVelibStationId(stationStatus),
      stationStatus,
    ])
  );

  return (information.data?.stations || [])
    .map((stationInfo) => ({
      info: stationInfo,
      status: statusesById.get(getVelibStationId(stationInfo)) || {},
    }))
    .filter(({ status: stationStatus }) => {
      const isInstalled = Number(stationStatus.is_installed ?? 1) === 1;
      const isRenting = Number(stationStatus.is_renting ?? 1) === 1;
      const isReturning = Number(stationStatus.is_returning ?? 1) === 1;

      return isInstalled && (isRenting || isReturning);
    });
}

function createStreetSection({
  id,
  profile,
  label,
  from,
  to,
  fromCoordinates,
  toCoordinates,
  route,
}) {
  const speed =
    profile === 'bike'
      ? BIKE_SPEED_METERS_PER_SECOND
      : WALKING_SPEED_METERS_PER_SECOND;
  const geometry = route?.geometry || [fromCoordinates, toCoordinates];
  const distance =
    route?.distance ||
    getPathDistanceMeters(geometry) ||
    getStraightLineDistanceMeters(fromCoordinates, toCoordinates);

  return {
    id,
    type: 'street_network',
    mode: profile === 'bike' ? 'bike' : 'walking',
    label,
    duration: Math.max(1, Math.round(distance / speed)),
    from,
    to,
    departureDateTime: null,
    arrivalDateTime: null,
    color: profile === 'bike' ? '#14b8a6' : '#64748b',
    textColor: '#ffffff',
    line: null,
    distanceKm: distance / 1000,
    stopCount: null,
    stops: [],
    geometry,
  };
}

function mergeSectionGeometries(sections) {
  return sections.flatMap((section, sectionIndex) => {
    const geometry = section.geometry || [];

    if (sectionIndex === 0) {
      return geometry;
    }

    return geometry.slice(1);
  });
}

function addSectionDateTimes(sections, departureDate = new Date()) {
  let cursorTimestamp = Math.ceil(departureDate.getTime() / 60000) * 60000;

  return sections.map((section) => {
    const departureDateTime = new Date(cursorTimestamp).toISOString();
    cursorTimestamp += Math.max(0, Number(section.duration) || 0) * 1000;

    return {
      ...section,
      departureDateTime,
      arrivalDateTime: new Date(cursorTimestamp).toISOString(),
    };
  });
}

function toBikeStationCoordinates(station) {
  return toCoordinatePair(station?.coordinates);
}

function getBikeStationName(station, fallback) {
  return (
    toOptionalText(station?.name) || toOptionalText(station?.label) || fallback
  );
}

/**
 * Recherche les bornes Vélib proches d'une coordonnée.
 *
 * Les flux GBFS `station_information` et `station_status` sont fusionnés pour
 * exposer à la fois la position, la capacité, les vélos disponibles et les
 * places libres. `availability` filtre les bornes selon l'usage demandé :
 * vélos au départ ou bornettes libres à l'arrivée.
 *
 * @param {object} params Paramètres de recherche.
 * @param {number | string} params.lon Longitude du point de recherche.
 * @param {number | string} params.lat Latitude du point de recherche.
 * @param {number | string} [params.distance=1500] Rayon en mètres, borné entre 100 et 5000.
 * @param {number | string} [params.count=5] Nombre de bornes, borné entre 1 et 20.
 * @param {'bikes' | 'docks'} [params.availability='bikes'] Disponibilité requise.
 * @param {object} [dependencies] Dépendances injectables.
 * @param {Function} [dependencies.fetchImpl] Implémentation compatible fetch.
 * @param {AbortSignal} [dependencies.signal] Signal d'annulation.
 * @returns {Promise<{stations: NormalizedBikeStation[], pagination: null}>}
 * @throws {Error} 400 si les coordonnées sont invalides.
 * @throws {Error} 502/504 si les flux Vélib échouent ou expirent.
 */
export async function fetchBikeStations(
  { lon, lat, distance = 1500, count = 5, availability = 'bikes' },
  { fetchImpl = fetch, signal } = {}
) {
  const originCoordinates = toCoordinatePair([lon, lat]);

  if (!originCoordinates) {
    const error = new Error('Coordonnées invalides.');
    error.status = 400;
    throw error;
  }

  const { velibBaseUrl } = getConfig();
  const safeDistance = toBoundedInteger(distance, {
    fallback: 1500,
    min: 100,
    max: 5000,
  });
  const safeCount = toBoundedInteger(count, {
    fallback: 5,
    min: 1,
    max: 20,
  });
  const stationPairs = await fetchVelibStations({
    fetchImpl,
    signal,
    velibBaseUrl,
  });
  const stations = stationPairs
    .map(({ info, status }) =>
      normalizeBikeStation(info, status, originCoordinates)
    )
    .filter(Boolean)
    .filter((station) =>
      availability === 'docks'
        ? station.availableDocks > 0
        : station.availableBikes > 0
    )
    .filter((station) => station.distance <= safeDistance)
    .sort(
      (firstStation, secondStation) =>
        firstStation.distance - secondStation.distance
    )
    .slice(0, safeCount);

  return {
    stations,
    pagination: null,
  };
}

/**
 * Compose un itinéraire vélo partagé à partir d'une borne de départ choisie.
 *
 * Le trajet généré contient trois sections compatibles avec les feuilles de
 * route existantes : marche jusqu'à la borne choisie, vélo jusqu'à la borne
 * d'arrivée la plus proche avec une place libre, puis marche vers la
 * destination. Les géométries de rue sont demandées à OSRM et retombent sur une
 * ligne directe si le service de routage est indisponible.
 *
 * @param {object} params Paramètres de calcul.
 * @param {number[] | string[]} params.fromCoordinates Coordonnées `[longitude, latitude]` du départ.
 * @param {number[] | string[]} params.toCoordinates Coordonnées `[longitude, latitude]` de l'arrivée.
 * @param {NormalizedBikeStation} params.startStation Borne de départ choisie par l'utilisateur.
 * @param {object} [dependencies] Dépendances injectables.
 * @param {Function} [dependencies.fetchImpl] Implémentation compatible fetch.
 * @param {AbortSignal} [dependencies.signal] Signal d'annulation.
 * @returns {Promise<{journey: NormalizedJourney}>}
 * @throws {Error} 400 si les coordonnées ou la borne sont invalides.
 * @throws {Error} 404 si aucune borne d'arrivée avec place libre n'est trouvée.
 * @throws {Error} 502/504 si les flux Vélib échouent ou expirent.
 */
export async function fetchBikeStationJourney(
  { fromCoordinates, toCoordinates, startStation },
  { fetchImpl = fetch, signal } = {}
) {
  const safeFromCoordinates = toCoordinatePair(fromCoordinates);
  const safeToCoordinates = toCoordinatePair(toCoordinates);
  const startStationCoordinates = toBikeStationCoordinates(startStation);

  if (!safeFromCoordinates || !safeToCoordinates || !startStationCoordinates) {
    const error = new Error('Coordonnées invalides.');
    error.status = 400;
    throw error;
  }

  const endStationsResult = await fetchBikeStations(
    {
      lon: safeToCoordinates[0],
      lat: safeToCoordinates[1],
      distance: 3000,
      count: 1,
      availability: 'docks',
    },
    { fetchImpl, signal }
  );
  const endStation = endStationsResult.stations[0];
  const endStationCoordinates = toBikeStationCoordinates(endStation);

  if (!endStation || !endStationCoordinates) {
    const error = new Error(
      "Aucune borne proche de l'arrivée avec une place libre."
    );
    error.status = 404;
    throw error;
  }

  const { routingBaseUrl } = getConfig();
  const [walkToStartRoute, bikeRoute, walkToDestinationRoute] =
    await Promise.all([
      fetchStreetRoute(
        {
          profile: 'walking',
          fromCoordinates: safeFromCoordinates,
          toCoordinates: startStationCoordinates,
        },
        { fetchImpl, signal, routingBaseUrl }
      ),
      fetchStreetRoute(
        {
          profile: 'bike',
          fromCoordinates: startStationCoordinates,
          toCoordinates: endStationCoordinates,
        },
        { fetchImpl, signal, routingBaseUrl }
      ),
      fetchStreetRoute(
        {
          profile: 'walking',
          fromCoordinates: endStationCoordinates,
          toCoordinates: safeToCoordinates,
        },
        { fetchImpl, signal, routingBaseUrl }
      ),
    ]);
  const startStationName = getBikeStationName(startStation, 'Borne de départ');
  const endStationName = getBikeStationName(endStation, "Borne d'arrivée");
  const sections = addSectionDateTimes([
    createStreetSection({
      id: 'bike-station-walk-to-start',
      profile: 'walking',
      label: 'Marche',
      from: 'Départ',
      to: startStationName,
      fromCoordinates: safeFromCoordinates,
      toCoordinates: startStationCoordinates,
      route: walkToStartRoute,
    }),
    createStreetSection({
      id: 'bike-station-ride',
      profile: 'bike',
      label: 'Vélo',
      from: startStationName,
      to: endStationName,
      fromCoordinates: startStationCoordinates,
      toCoordinates: endStationCoordinates,
      route: bikeRoute,
    }),
    createStreetSection({
      id: 'bike-station-walk-to-destination',
      profile: 'walking',
      label: 'Marche',
      from: endStationName,
      to: 'Arrivée',
      fromCoordinates: endStationCoordinates,
      toCoordinates: safeToCoordinates,
      route: walkToDestinationRoute,
    }),
  ]);
  const geometry = mergeSectionGeometries(sections);

  return {
    journey: {
      id: `bike-stations-${startStation.stationId}-${endStation.stationId}`,
      profile: 'bike',
      duration: sections.reduce(
        (total, section) => total + section.duration,
        0
      ),
      walkingDuration: sections
        .filter((section) => section.mode === 'walking')
        .reduce((total, section) => total + section.duration, 0),
      bikeDuration:
        sections.find((section) => section.mode === 'bike')?.duration || 0,
      nbTransfers: 0,
      departureDateTime: sections[0]?.departureDateTime || null,
      arrivalDateTime: sections[sections.length - 1]?.arrivalDateTime || null,
      sections,
      geometry,
      bikeStations: {
        start: startStation,
        end: endStation,
      },
    },
  };
}

function normalizeJourney(journey, profile) {
  const rawSections = journey.sections || [];
  const normalizedSections = rawSections.map(normalizeSection);
  const isBikeFallback =
    profile === 'bike' &&
    normalizedSections.length > 0 &&
    normalizedSections.every((section) => section.mode === 'walking');
  const sections = isBikeFallback
    ? normalizedSections.map(toBikeSection)
    : normalizedSections;
  const coordinates = rawSections
    .flatMap((section) => section.geojson?.coordinates || [])
    .filter(
      (coordinate) => Array.isArray(coordinate) && coordinate.length >= 2
    );

  return {
    id: `${profile}-${journey.tags?.join('-') || journey.duration}`,
    profile,
    duration: isBikeFallback
      ? sections.reduce((total, section) => total + section.duration, 0)
      : journey.duration || 0,
    walkingDuration: journey.walking_duration || 0,
    bikeDuration: isBikeFallback
      ? sections.reduce((total, section) => total + section.duration, 0)
      : journey.bike_duration || 0,
    nbTransfers: journey.nb_transfers || 0,
    departureDateTime: journey.departure_date_time || null,
    arrivalDateTime: journey.arrival_date_time || null,
    sections,
    geometry: coordinates.length > 1 ? simplifyGeometry(coordinates) : null,
  };
}

function normalizeJourneys(data, profile) {
  return (data.journeys || []).map((journey) =>
    normalizeJourney(journey, profile)
  );
}

function getJourneyProfileOrder(journey) {
  return JOURNEY_PROFILE_ORDER[journey.profile] ?? 2;
}

function orderJourneys(journeys) {
  return journeys.sort(
    (firstJourney, secondJourney) =>
      getJourneyProfileOrder(firstJourney) -
      getJourneyProfileOrder(secondJourney)
  );
}

/**
 * Recherche les stations de transport proches d'une coordonnée.
 *
 * Les paramètres `distance` et `count` sont bornés pour éviter les requêtes
 * trop larges vers IDF Mobilités.
 *
 * @param {object} params Paramètres de recherche.
 * @param {number | string} params.lon Longitude du point de recherche.
 * @param {number | string} params.lat Latitude du point de recherche.
 * @param {number | string} [params.distance=900] Rayon en mètres, borné entre 100 et 3000.
 * @param {number | string} [params.count=30] Nombre de stations, borné entre 1 et 80.
 * @param {object} [dependencies] Dépendances injectables.
 * @param {Function} [dependencies.fetchImpl] Implémentation compatible fetch.
 * @param {AbortSignal} [dependencies.signal] Signal d'annulation.
 * @returns {Promise<{stations: NormalizedPlace[], pagination: object | null}>}
 * @throws {Error} 400 si les coordonnées sont invalides.
 * @throws {Error} 503 si `IDFM_API_KEY` est absent.
 * @throws {Error} 502/504 si l'API IDF Mobilités échoue ou expire.
 */
export async function fetchNearbyStations(
  { lon, lat, distance = 900, count = 30 },
  { fetchImpl = fetch, signal } = {}
) {
  if (
    !isFiniteCoordinate(lon, -180, 180) ||
    !isFiniteCoordinate(lat, -90, 90)
  ) {
    const error = new Error('Coordonnées invalides.');
    error.status = 400;
    throw error;
  }

  const { apiKey, baseUrl } = getConfig();

  if (!apiKey) {
    const error = new Error('Jeton Ile-de-France Mobilités manquant.');
    error.status = 503;
    throw error;
  }

  const safeDistance = toBoundedInteger(distance, {
    fallback: 900,
    min: 100,
    max: 3000,
  });
  const safeCount = toBoundedInteger(count, {
    fallback: 30,
    min: 1,
    max: 80,
  });
  const url = createIdfmUrl(
    {
      lon: Number(lon),
      lat: Number(lat),
      distance: safeDistance,
      count: safeCount,
    },
    baseUrl
  );

  const data = await requestIdfm(url, { apiKey, fetchImpl, signal });

  return {
    stations: normalizePlacesNearby(data),
    pagination: data.pagination || null,
  };
}

/**
 * Récupère les perturbations transports IDF Mobilités applicables maintenant.
 *
 * La route Navitia `traffic_reports` est interrogée avec `since` et `until`
 * positionnés sur l'instant courant. Les disruptions sont ensuite rattachées
 * aux lignes via deux sources : les liens exposés dans `traffic_reports.lines`
 * et les `impacted_objects` portés par chaque disruption. Les bus sont exclus,
 * les doublons par ligne/message sont fusionnés, et les résultats sont triés par
 * gravité puis par mode : interruptions, perturbations, puis métro, RER, ligne
 * rapide et tram.
 *
 * @param {object} [params] Paramètres de recherche.
 * @param {number | string} [params.count=100] Nombre de rapports demandés.
 * @param {object} [dependencies] Dépendances injectables.
 * @param {Function} [dependencies.fetchImpl] Implémentation compatible fetch.
 * @param {AbortSignal} [dependencies.signal] Signal d'annulation.
 * @param {Date} [dependencies.now=new Date()] Instant de référence pour la requête et les filtres.
 * @returns {Promise<{disruptions: NormalizedDisruption[], pagination: object | null}>}
 * @throws {Error} 503 si `IDFM_API_KEY` est absent.
 * @throws {Error} 502/504 si l'API IDF Mobilités échoue ou expire.
 */
export async function fetchDisruptions(
  { count = 100 } = {},
  { fetchImpl = fetch, signal, now = new Date() } = {}
) {
  const { apiKey, baseUrl } = getConfig();

  if (!apiKey) {
    const error = new Error('Jeton Ile-de-France Mobilites manquant.');
    error.status = 503;
    throw error;
  }

  const safeCount = toBoundedInteger(count, {
    fallback: 100,
    min: 1,
    max: 200,
  });
  const url = createTrafficReportsUrl({ count: safeCount, date: now }, baseUrl);
  const data = await requestIdfm(url, { apiKey, fetchImpl, signal });

  return {
    disruptions: normalizeTrafficReports(data, { now }),
    pagination: data.pagination || null,
  };
}

/**
 * Recherche des lieux IDF Mobilités pour l'autocomplétion.
 *
 * Une requête de moins de deux caractères renvoie une liste vide sans appeler
 * l'API distante.
 *
 * @param {object} params Paramètres de recherche.
 * @param {string} params.query Texte saisi par l'utilisateur.
 * @param {number | string} [params.count=8] Nombre de résultats, borné entre 1 et 12.
 * @param {object} [dependencies] Dépendances injectables.
 * @param {Function} [dependencies.fetchImpl] Implémentation compatible fetch.
 * @param {AbortSignal} [dependencies.signal] Signal d'annulation.
 * @returns {Promise<{places: NormalizedPlace[], pagination: object | null}>}
 * @throws {Error} 503 si `IDFM_API_KEY` est absent.
 * @throws {Error} 502/504 si l'API IDF Mobilités échoue ou expire.
 */
export async function searchPlaces(
  { query, count = 8 },
  { fetchImpl = fetch, signal } = {}
) {
  const safeQuery = String(query || '').trim();

  if (safeQuery.length < 2) {
    return {
      places: [],
    };
  }

  const { apiKey, baseUrl } = getConfig();

  if (!apiKey) {
    const error = new Error('Jeton Ile-de-France Mobilités manquant.');
    error.status = 503;
    throw error;
  }

  const safeCount = toBoundedInteger(count, {
    fallback: 8,
    min: 1,
    max: 12,
  });
  const url = createPlacesUrl(
    {
      query: safeQuery,
      count: safeCount,
    },
    baseUrl
  );
  const data = await requestIdfm(url, { apiKey, fetchImpl, signal });

  return {
    places: normalizeSearchPlaces(data),
    pagination: data.pagination || null,
  };
}

/**
 * Résout des coordonnées en un lieu affichable.
 *
 * La priorité est donnée aux adresses pour pouvoir proposer "Ma position"
 * avec une adresse lisible dans l'autocomplétion.
 *
 * @param {object} params Paramètres de résolution.
 * @param {number | string} params.lon Longitude.
 * @param {number | string} params.lat Latitude.
 * @param {object} [dependencies] Dépendances injectables.
 * @param {Function} [dependencies.fetchImpl] Implémentation compatible fetch.
 * @param {AbortSignal} [dependencies.signal] Signal d'annulation.
 * @returns {Promise<{place: NormalizedPlace | null}>}
 * @throws {Error} 400 si les coordonnées sont invalides.
 * @throws {Error} 503 si `IDFM_API_KEY` est absent.
 * @throws {Error} 502/504 si l'API IDF Mobilités échoue ou expire.
 */
export async function fetchPlaceFromCoordinates(
  { lon, lat },
  { fetchImpl = fetch, signal } = {}
) {
  const safeLon = Number(lon);
  const safeLat = Number(lat);

  if (!Number.isFinite(safeLon) || !Number.isFinite(safeLat)) {
    const error = new Error('Coordonnees invalides.');
    error.status = 400;
    throw error;
  }

  const { apiKey, baseUrl } = getConfig();

  if (!apiKey) {
    const error = new Error('Jeton Ile-de-France Mobilités manquant.');
    error.status = 503;
    throw error;
  }

  const url = createCoordinatesPlaceUrl(
    {
      lon: safeLon,
      lat: safeLat,
    },
    baseUrl
  );
  const data = await requestIdfm(url, { apiKey, fetchImpl, signal });

  return normalizeCoordinatesPlace(data);
}

/**
 * Calcule les itinéraires marche, vélo et transports entre deux lieux.
 *
 * Le client interroge IDF Mobilités pour trois profils : marche directe, vélo
 * direct et transports. Si les coordonnées sont fournies et qu'IDF Mobilités ne
 * renvoie pas de trajet direct marche ou vélo, un itinéraire de secours est
 * construit avec OSRM. Si OSRM échoue, le fallback utilise une ligne directe
 * entre les deux coordonnées.
 *
 * @param {object} params Paramètres de calcul.
 * @param {string} params.from Identifiant IDF Mobilités du départ.
 * @param {string} params.to Identifiant IDF Mobilités de l'arrivée.
 * @param {number[] | string[]} [params.fromCoordinates] Coordonnées `[longitude, latitude]` du départ.
 * @param {number[] | string[]} [params.toCoordinates] Coordonnées `[longitude, latitude]` de l'arrivée.
 * @param {boolean} [params.wheelchairAccessible=false] Ajoute `wheelchair=true` aux requêtes Navitia pour demander des transports accessibles PMR.
 * @param {object} [dependencies] Dépendances injectables.
 * @param {Function} [dependencies.fetchImpl] Implémentation compatible fetch.
 * @param {AbortSignal} [dependencies.signal] Signal d'annulation.
 * @returns {Promise<{journeys: NormalizedJourney[]}>}
 * @throws {Error} 400 si le départ ou l'arrivée est invalide.
 * @throws {Error} 503 si `IDFM_API_KEY` est absent.
 * @throws {Error} 404 si aucun itinéraire n'est trouvé.
 * @throws {Error} 502/504 si l'API IDF Mobilités échoue ou expire.
 */
export async function fetchJourneys(
  { from, to, fromCoordinates, toCoordinates, wheelchairAccessible = false },
  { fetchImpl = fetch, signal } = {}
) {
  const safeFrom = String(from || '').trim();
  const safeTo = String(to || '').trim();

  if (!safeFrom || !safeTo || safeFrom === safeTo) {
    const error = new Error('Départ et arrivée invalides.');
    error.status = 400;
    throw error;
  }

  const { apiKey, baseUrl, routingBaseUrl } = getConfig();

  if (!apiKey) {
    const error = new Error('Jeton Ile-de-France Mobilités manquant.');
    error.status = 503;
    throw error;
  }

  const fromCoordinateParam = toCoordinateParam(fromCoordinates);
  const toCoordinateParamValue = toCoordinateParam(toCoordinates);

  const requests = [
    {
      profile: 'walking',
      from: fromCoordinateParam || safeFrom,
      to: toCoordinateParamValue || safeTo,
      directPathModes: ['walking'],
      firstSectionModes: ['walking'],
      lastSectionModes: ['walking'],
      count: 1,
    },
    {
      profile: 'bike',
      from: fromCoordinateParam || safeFrom,
      to: toCoordinateParamValue || safeTo,
      directPathModes: ['bike'],
      firstSectionModes: ['bike'],
      lastSectionModes: ['bike'],
      count: 1,
    },
    {
      profile: 'transit',
      // Les favoris d'adresse ont des ids internes.
      // Les coordonnées gardent la requête transports valide.
      from: fromCoordinateParam || safeFrom,
      to: toCoordinateParamValue || safeTo,
      directPath: 'none',
      firstSectionModes: ['walking'],
      lastSectionModes: ['walking'],
      count: 5,
    },
  ].map((request) => ({
    profile: request.profile,
    url: createJourneyUrl(
      {
        from: request.from,
        to: request.to,
        directPath: request.directPath || 'only',
        directPathModes: request.directPathModes,
        firstSectionModes: request.firstSectionModes,
        lastSectionModes: request.lastSectionModes,
        count: request.count,
        wheelchairAccessible,
      },
      baseUrl
    ),
  }));

  const settledResponses = await Promise.allSettled(
    requests.map((request) =>
      requestIdfm(request.url, { apiKey, fetchImpl, signal }).then((data) => ({
        profile: request.profile,
        data,
      }))
    )
  );
  const journeys = settledResponses.flatMap((response) => {
    if (response.status === 'rejected') {
      return [];
    }

    return normalizeJourneys(response.value.data, response.value.profile);
  });
  const rejectedProfiles = settledResponses
    .filter((response) => response.status === 'rejected')
    .map((response, index) => requests[index].profile);
  const directFallbackCoordinates = {
    fromCoordinates: toCoordinatePair(fromCoordinates),
    toCoordinates: toCoordinatePair(toCoordinates),
  };
  let hasStraightLineFallback = false;

  if (
    directFallbackCoordinates.fromCoordinates &&
    directFallbackCoordinates.toCoordinates
  ) {
    for (const profile of ['walking', 'bike']) {
      if (!journeys.some((journey) => journey.profile === profile)) {
        const route = await fetchStreetRoute(
          {
            profile,
            ...directFallbackCoordinates,
          },
          { fetchImpl, signal, routingBaseUrl }
        );
        hasStraightLineFallback = hasStraightLineFallback || !route;

        journeys.push(
          createDirectFallbackJourney({
            profile,
            ...directFallbackCoordinates,
            route,
          })
        );
      }
    }
  }

  if (journeys.length === 0) {
    const firstError = settledResponses.find(
      (response) => response.status === 'rejected'
    )?.reason;
    const error = new Error(firstError?.message || 'Aucun itinéraire trouvé.');
    error.status = firstError?.status || 404;
    throw error;
  }

  const serviceMessages = [];

  if (rejectedProfiles.includes('transit')) {
    serviceMessages.push(
      'Les itinéraires multimodaux sont temporairement indisponibles.'
    );
  }

  if (hasStraightLineFallback) {
    serviceMessages.push(
      'Le tracé précis à pied ou à vélo est temporairement indisponible : une ligne directe est affichée.'
    );
  }

  return {
    journeys: orderJourneys(journeys),
    serviceMessages,
  };
}

/**
 * Décore une fonction de recherche de stations avec un timeout court.
 *
 * @param {Function} fetchNearbyStationsImpl Fonction compatible avec `fetchNearbyStations`.
 * @returns {Function} Fonction qui annule la recherche après `DEFAULT_TIMEOUT_MS`.
 */
export function createFetchNearbyStationsWithTimeout(fetchNearbyStationsImpl) {
  return async function fetchNearbyStationsWithTimeout(params) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      return await fetchNearbyStationsImpl(params, {
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  };
}

/**
 * Decore une fonction de recherche de perturbations avec un timeout court.
 *
 * @param {Function} fetchDisruptionsImpl Fonction compatible avec `fetchDisruptions`.
 * @returns {Function} Fonction qui annule la recherche apres `DEFAULT_TIMEOUT_MS`.
 */
export function createFetchDisruptionsWithTimeout(fetchDisruptionsImpl) {
  return async function fetchDisruptionsWithTimeout(params) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      return await fetchDisruptionsImpl(params, {
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  };
}

/**
 * Décore une fonction de recherche de bornes vélo avec un timeout court.
 *
 * @param {Function} fetchBikeStationsImpl Fonction compatible avec `fetchBikeStations`.
 * @returns {Function} Fonction qui annule la recherche après `VELIB_TIMEOUT_MS`.
 */
export function createFetchBikeStationsWithTimeout(fetchBikeStationsImpl) {
  return async function fetchBikeStationsWithTimeout(params) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VELIB_TIMEOUT_MS);

    try {
      return await fetchBikeStationsImpl(params, {
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  };
}

/**
 * Décore une fonction de calcul d'itinéraire vélo partagé avec un timeout.
 *
 * @param {Function} fetchBikeStationJourneyImpl Fonction compatible avec `fetchBikeStationJourney`.
 * @returns {Function} Fonction qui annule le calcul après `JOURNEY_TIMEOUT_MS`.
 */
export function createFetchBikeStationJourneyWithTimeout(
  fetchBikeStationJourneyImpl
) {
  return async function fetchBikeStationJourneyWithTimeout(params) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), JOURNEY_TIMEOUT_MS);

    try {
      return await fetchBikeStationJourneyImpl(params, {
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  };
}

/**
 * Décore une fonction de recherche de lieux avec un timeout court.
 *
 * @param {Function} searchPlacesImpl Fonction compatible avec `searchPlaces`.
 * @returns {Function} Fonction qui annule la recherche après `DEFAULT_TIMEOUT_MS`.
 */
export function createSearchPlacesWithTimeout(searchPlacesImpl) {
  return async function searchPlacesWithTimeout(params) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      return await searchPlacesImpl(params, {
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  };
}

/**
 * Décore une résolution de coordonnées avec un timeout court.
 *
 * @param {Function} fetchPlaceFromCoordinatesImpl Fonction compatible avec `fetchPlaceFromCoordinates`.
 * @returns {Function} Fonction qui annule la recherche après `DEFAULT_TIMEOUT_MS`.
 */
export function createFetchPlaceFromCoordinatesWithTimeout(
  fetchPlaceFromCoordinatesImpl
) {
  return async function fetchPlaceFromCoordinatesWithTimeout(params) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      return await fetchPlaceFromCoordinatesImpl(params, {
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  };
}

/**
 * Décore une fonction de calcul d'itinéraires avec un timeout plus long.
 *
 * @param {Function} fetchJourneysImpl Fonction compatible avec `fetchJourneys`.
 * @returns {Function} Fonction qui annule le calcul après `JOURNEY_TIMEOUT_MS`.
 */
export function createFetchJourneysWithTimeout(fetchJourneysImpl) {
  return async function fetchJourneysWithTimeout(params) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), JOURNEY_TIMEOUT_MS);

    try {
      return await fetchJourneysImpl(params, {
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  };
}
