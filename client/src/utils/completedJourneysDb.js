const DB_NAME = 'urbanflow_mobility';
const DB_VERSION = 3;
const STORE_NAME = 'completed_journeys';

/**
 * Représentation persistée d'un trajet terminé utilisée par la page Mon carbone.
 *
 * Les valeurs carbone sont stockées en grammes équivalent CO2 afin de pouvoir
 * agréger les trajets sans conversion avant l'affichage du dashboard.
 *
 * @typedef {object} CompletedJourneyRecord
 * @property {string} id Identifiant local unique du trajet enregistré.
 * @property {string|null} journeyId Identifiant de l'itinéraire source quand il existe.
 * @property {string} type Type de trajet ou combinaison de modes détectée.
 * @property {string} completedAt Date ISO de fin du trajet.
 * @property {number|null} distanceKm Distance totale parcourue en kilomètres.
 * @property {object} carbonFootprint Empreinte carbone du trajet.
 * @property {number} carbonFootprint.total_co2e Consommation réelle du trajet.
 * @property {number} carbonFootprint.car_solo_co2e Consommation estimée en voiture solo.
 * @property {number} carbonFootprint.savings_vs_car_solo_co2e Economie estimée face à la voiture solo.
 * @property {string} carbonFootprint.unit Unité source de l'empreinte carbone.
 */

function getJourneyType(journey) {
  if (journey?.profile) {
    return journey.profile;
  }

  const sections = journey?.sections || [];
  const modes = sections.map((section) => section?.mode).filter(Boolean);

  return modes.length > 0 ? modes.join('+') : 'unknown';
}

function getJourneyDistanceKm(journey) {
  const directDistanceKm = Number(journey?.distanceKm);

  if (Number.isFinite(directDistanceKm) && directDistanceKm >= 0) {
    return directDistanceKm;
  }

  const sectionsDistanceKm = (journey?.sections || []).reduce(
    (totalDistanceKm, section) => {
      const sectionDistanceKm = Number(section?.distanceKm);

      return Number.isFinite(sectionDistanceKm) && sectionDistanceKm > 0
        ? totalDistanceKm + sectionDistanceKm
        : totalDistanceKm;
    },
    0
  );

  return sectionsDistanceKm > 0 ? sectionsDistanceKm : null;
}

function openCompletedJourneysDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB indisponible.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains('recent_place_searches')) {
        db.createObjectStore('recent_place_searches', {
          keyPath: 'label',
        });
      }

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
        });

        store.createIndex('completedAt', 'completedAt');
        store.createIndex('type', 'type');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function withCompletedJourneysStore(mode, callback) {
  return openCompletedJourneysDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const result = callback(store);

        transaction.oncomplete = () => {
          db.close();
          resolve(result);
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      })
  );
}

/**
 * Persiste localement un trajet terminé pour alimenter la page Mon carbone.
 *
 * L'enregistrement est ignoré si l'empreinte carbone du trajet ou sa
 * comparaison voiture solo ne sont pas disponibles.
 *
 * @param {object} journey Itinéraire normalisé selectionné par l'utilisateur.
 * @returns {Promise<void>}
 */
export async function saveCompletedJourney(journey) {
  const carbonFootprint = journey?.carbonFootprint;
  const totalCo2e = Number(carbonFootprint?.total_co2e);
  const carSoloCo2e = Number(carbonFootprint?.car_solo_co2e);

  if (!Number.isFinite(totalCo2e) || !Number.isFinite(carSoloCo2e)) {
    return;
  }

  const completedAt = new Date().toISOString();
  const distanceKm = getJourneyDistanceKm(journey);

  const generatedId =
    window.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  await withCompletedJourneysStore('readwrite', (store) => {
    store.put({
      id: generatedId,
      journeyId: journey?.id || null,
      type: getJourneyType(journey),
      completedAt,
      distanceKm,
      carbonFootprint: {
        total_co2e: totalCo2e,
        car_solo_co2e: carSoloCo2e,
        savings_vs_car_solo_co2e: carSoloCo2e - totalCo2e,
        unit: carbonFootprint?.unit || 'gCO2e',
      },
    });
  });
}

/**
 * Lit tous les trajets terminés persistés localement, tries du plus récent au plus ancien.
 *
 * @returns {Promise<CompletedJourneyRecord[]>}
 */
export async function getCompletedJourneys() {
  return withCompletedJourneysStore('readonly', (store) => {
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const journeys = Array.isArray(request.result) ? request.result : [];

        resolve(
          journeys.sort(
            (firstJourney, secondJourney) =>
              new Date(secondJourney.completedAt).getTime() -
              new Date(firstJourney.completedAt).getTime()
          )
        );
      };
      request.onerror = () => reject(request.error);
    });
  }).catch(() => []);
}
