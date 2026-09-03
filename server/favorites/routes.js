import express from 'express';
import { query as defaultQuery } from '../db.js';
import { requireAuth } from '../auth/middleware.js';
import { requireCsrfProtection } from '../auth/csrf.js';

const FAVORITE_CATEGORIES = ['favorite', 'home', 'work'];
const FAVORITE_CATEGORY_SET = new Set(FAVORITE_CATEGORIES);

/**
 * Normalise et valide une catégorie de favoris.
 *
 * @param {unknown} value Valeur reçue depuis la requête.
 * @returns {'favorite' | 'home' | 'work' | null} Catégorie valide ou null.
 */
function normalizeCategory(value) {
  const category = String(value || '').trim();
  return FAVORITE_CATEGORY_SET.has(category) ? category : null;
}

/**
 * Lit une coordonnée optionnelle et borne sa valeur.
 *
 * @param {unknown} value Valeur brute.
 * @param {number} min Borne minimale.
 * @param {number} max Borne maximale.
 * @returns {number | null} Coordonnée valide ou null.
 */
function toNullableCoordinate(value, min, max) {
  const coordinate = Number(value);

  if (!Number.isFinite(coordinate) || coordinate < min || coordinate > max) {
    return null;
  }

  return coordinate;
}

/**
 * Convertit une ligne SQL de favori vers le format lieu consommé par le client.
 *
 * `label` reste le nom personnalisé affiché dans les préférences. `placeLabel`
 * garde le vrai libellé de l'arrêt/adresse, utilisé pour remplir les champs de
 * recherche. `stationId` reste séparé pour préserver l'identifiant IDFM des
 * arrêts tout en permettant aux adresses de fonctionner via leurs coordonnées.
 *
 * @param {object} row Ligne `user_favorite_places`.
 * @returns {object} Lieu compatible avec les suggestions RoutePlanner.
 */
function toFavoritePlace(row) {
  const lon = Number(row.lon);
  const lat = Number(row.lat);
  const coordinates =
    Number.isFinite(lon) && Number.isFinite(lat) ? [lon, lat] : null;

  return {
    id: row.station_id || `favorite:${row.id}`,
    stationId: row.station_id || null,
    favoriteId: row.id,
    category: row.category,
    label: row.label,
    name: row.label,
    placeLabel: row.place_label || row.label,
    type: row.station_id ? 'transport' : 'address',
    distance: null,
    coordinates,
    city: null,
    lines: [],
  };
}

/**
 * Crée le routeur Express des favoris utilisateur.
 *
 * Les routes sont toutes protégées par `requireAuth` et renvoient les lieux au
 * même format que l'autocomplétion IDF Mobilités pour simplifier l'UI.
 *
 * @param {object} [options] Dépendances injectables.
 * @param {Function} [options.query] Fonction SQL compatible avec `db.query`.
 * @param {Function} [options.csrfProtection] Middleware de validation CSRF.
 * @returns {object} Routeur Express configuré.
 */
export function createFavoritesRouter({
  query = defaultQuery,
  csrfProtection = requireCsrfProtection,
} = {}) {
  const router = express.Router();

  router.use(requireAuth);

  router.get('/', async (req, res, next) => {
    const category = normalizeCategory(req.query.category);

    if (!category) {
      return res.status(400).json({
        error: 'Categorie de favori invalide.',
      });
    }

    try {
      const result = await query(
        `select id,
                category,
                label,
                place_label,
                station_id,
                ST_X(geom::geometry) as lon,
                ST_Y(geom::geometry) as lat
           from user_favorite_places
          where user_id = $1
            and category = $2
          order by created_at desc, label asc`,
        [req.auth.sub, category]
      );

      return res.json({
        places: result.rows.map(toFavoritePlace),
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/', csrfProtection, async (req, res, next) => {
    const category = normalizeCategory(req.body?.category);
    const label = String(req.body?.label || '')
      .trim()
      .slice(0, 100);
    const placeLabel = String(req.body?.placeLabel || label)
      .trim()
      .slice(0, 150);
    const stationId = req.body?.stationId ? String(req.body.stationId) : null;
    const lon = toNullableCoordinate(req.body?.coordinates?.[0], -180, 180);
    const lat = toNullableCoordinate(req.body?.coordinates?.[1], -90, 90);
    const hasCoordinates = lon !== null && lat !== null;

    if (!category || !label || !placeLabel || (!stationId && !hasCoordinates)) {
      return res.status(400).json({
        error: 'Favori invalide.',
      });
    }

    try {
      if (category === 'home' || category === 'work') {
        await query(
          `delete from user_favorite_places
            where user_id = $1
              and category = $2`,
          [req.auth.sub, category]
        );
      }

      const result = await query(
        `insert into user_favorite_places (user_id, category, label, place_label, station_id, geom)
              values (
                $1,
                $2,
                $3,
                $4,
                $5,
                case
                  when $6::double precision is null or $7::double precision is null
                    then null
                  else ST_SetSRID(ST_MakePoint($6, $7), 4326)
                end
              )
           returning id,
                     category,
                     label,
                     place_label,
                     station_id,
                     ST_X(geom::geometry) as lon,
                     ST_Y(geom::geometry) as lat`,
        [req.auth.sub, category, label, placeLabel, stationId, lon, lat]
      );

      return res.status(201).json({
        place: toFavoritePlace(result.rows[0]),
      });
    } catch (error) {
      return next(error);
    }
  });

  router.delete('/:favoriteId', csrfProtection, async (req, res, next) => {
    const favoriteId = String(req.params.favoriteId || '').trim();

    if (!favoriteId) {
      return res.status(400).json({
        error: 'Favori invalide.',
      });
    }

    try {
      const result = await query(
        `delete from user_favorite_places
          where id = $1
            and user_id = $2`,
        [favoriteId, req.auth.sub]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: 'Favori introuvable.',
        });
      }

      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
