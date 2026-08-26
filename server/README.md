# Serveur UrbanFlow Mobility

API backend Node.js avec Express. Le serveur gère l'authentification, les appels IDF Mobilités, les itinéraires normalisés, le calcul carbone et les migrations PostgreSQL.

## Scripts

Depuis `server` :

```bash
npm install
npm run dev
npm run start
npm run test
npm run lint
npm run docs
npm run openapi:check
npm run format:check
```

Depuis la racine, les scripts backend sont aussi appelés par `npm run test`, `npm run docs`, `npm run openapi:check` et `npm run check`.

## Configuration

Le serveur lit ses variables depuis `server/.env`. Copier `server/.env.example` vers `server/.env`, puis remplacer les valeurs sensibles.

| Variable               | Obligatoire            | Valeur par défaut                 | Description                                                                      |
| ---------------------- | ---------------------- | --------------------------------- | -------------------------------------------------------------------------------- |
| `PORT`                 | Non                    | `3000`                            | Port HTTP de l'API Express.                                                      |
| `NODE_ENV`             | Non                    | `development`                     | Active les cookies `secure` en `production`.                                     |
| `CLIENT_ORIGIN`        | Non                    | Tous les origins locaux           | Origins autorisés par CORS, séparés par des virgules.                            |
| `DATABASE_URL`         | Oui pour auth/DB       | Aucune                            | URL PostgreSQL Supabase utilisée par l'authentification et les facteurs carbone. |
| `RUN_DB_TESTS`         | Non                    | `false`                           | Mettre `true` pour lancer le test d'intégration PostgreSQL.                      |
| `JWT_SECRET`           | Oui pour auth          | Aucune                            | Secret de signature JWT. Utiliser une valeur longue et aléatoire.                |
| `JWT_EXPIRES_IN`       | Non                    | `7d`                              | Durée de validité des sessions JWT.                                              |
| `IDFM_API_KEY`         | Oui pour IDF Mobilités | Aucune                            | Clé API PRIM Ile-de-France Mobilités.                                            |
| `IDFM_API_BASE_URL`    | Non                    | API Navitia IDFM production       | Base URL de l'API IDF Mobilités.                                                 |
| `ROUTING_API_BASE_URL` | Non                    | `https://router.project-osrm.org` | Base URL OSRM pour les trajets directs marche/vélo de secours.                   |
| `VELIB_API_BASE_URL`   | Non                    | Flux GBFS Vélib Métropole         | Base URL des flux `station_information` et `station_status` Vélib.               |

## Migrations PostgreSQL

Les migrations SQL sont dans `server/migrations` et doivent être appliquées dans l'ordre numérique :

1. `001_create_users.sql` crée la table `users`, son index email et active l'extension PostgreSQL `pgcrypto` nécessaire à `gen_random_uuid()`.
2. `002_create_carbon_factors.sql` crée la table `carbon_factors` et insère les facteurs carbone de référence.

Avec `psql`, depuis la racine du projet :

```bash
psql "$DATABASE_URL" -f server/migrations/001_create_users.sql
psql "$DATABASE_URL" -f server/migrations/002_create_carbon_factors.sql
psql "$DATABASE_URL" -f server/migrations/003_create_user_favorite_places.sql
```

La migration `003_create_user_favorite_places.sql` crée `user_favorite_places`, active PostGIS et stocke les catégories `favorite`, `home` et `work` par utilisateur.

Sur Supabase, les mêmes fichiers peuvent être exécutés dans le SQL Editor, dans le même ordre. `DATABASE_URL` doit pointer vers la base PostgreSQL utilisée par le serveur.

## API HTTP

Le contrat strict de l'API est décrit dans `server/openapi.yaml` au format OpenAPI 3.0. Il couvre :

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `DELETE /api/auth/me`
- `GET /api/favorites`
- `POST /api/favorites`
- `GET /api/idfm/nearby-stations`
- `GET /api/idfm/bike-stations`
- `GET /api/idfm/places`
- `GET /api/idfm/journeys`
- `POST /api/idfm/bike-station-journey`

L'API est exposée sur `http://localhost:3000` par défaut. Les routes d'authentification utilisent un cookie httpOnly nommé `urbanflow_auth`.

Toutes les réponses d'erreur utilisent le format :

```json
{
  "error": "Message lisible par l'interface"
}
```

Certaines validations peuvent ajouter un champ `details`.

## Fonctionnalités clés

### Géolocalisation

Au chargement de la page avec la carte, le client peut demander l'accès à la position de l'appareil.

Si l'utilisateur accepte, la carte se recentre sur sa position. La position est affichée par un point visuel dédié sur la carte. Si l'autorisation arrive après le premier affichage, le recentrage est relancé automatiquement. Si l'accès est refusé ou indisponible, l'application reste utilisable avec le centrage par défaut.

### Favoris utilisateur

Les utilisateurs connectés peuvent enregistrer des lieux favoris dans trois catégories : `favorite`, `home` et `work`.

Les routes `/api/favorites` sont protégées par JWT et renvoient les favoris au même format que les lieux normalisés IDF Mobilités. Le client peut ainsi réutiliser les suggestions du planificateur d'itinéraire sans adaptation spécifique.

Les favoris sont stockés dans `user_favorite_places`, créée par la migration `003_create_user_favorite_places.sql`. Un favori peut référencer une station via `station_id` ou une adresse libre via `geom`.

### Calcul carbone local

Le calcul carbone utilise d'abord la table PostgreSQL `carbon_factors`. Si la requête SQL échoue, le serveur bascule sur des facteurs locaux définis dans le service carbone pour garder l'itinéraire exploitable.

Quand ce fallback est utilisé, le serveur écrit dans la console :

```text
Calcul carbone local
```

Ce comportement évite qu'une indisponibilité Supabase bloque le calcul d'itinéraire. Si un mode de transport n'a aucun facteur connu, l'itinéraire est quand même renvoyé et `carbonFootprintMessage` signale les modes manquants.

### Fallback OSRM marche/vélo

La route `GET /api/idfm/journeys` demande des trajets marche, vélo et transports à IDF Mobilités. Si IDF Mobilités ne renvoie pas de trajet direct marche ou vélo, le serveur peut construire un trajet de secours avec OSRM via `ROUTING_API_BASE_URL`.

OSRM sert uniquement à enrichir les trajets directs marche/vélo avec une géométrie de rue et une distance plus réaliste. Si OSRM est indisponible, le serveur revient à une ligne directe entre les coordonnées fournies.

### Vélo partagé via bornes Vélib

Quand l'utilisateur choisit un itinéraire à vélo sans avoir de vélo, le client interroge `GET /api/idfm/bike-stations`. Cette route lit les flux publics GBFS Vélib `station_information.json` et `station_status.json`, fusionne les informations statiques et temps réel, puis renvoie les bornes les plus proches avec au moins un vélo disponible.

Après le choix d'une borne de départ, `POST /api/idfm/bike-station-journey` compose un itinéraire en trois sections normalisées :

1. marche du point de départ vers la borne choisie ;
2. vélo jusqu'à la borne d'arrivée la plus proche de la destination avec au moins une place libre ;
3. marche de cette borne jusqu'à la destination.

Ces sections utilisent le même format que les autres feuilles de route. Elles sont donc compatibles avec le rendu de la frise, le suivi de trajet et le calcul carbone. Les géométries de rue viennent d'OSRM quand il répond ; sinon, le segment concerné retombe sur une ligne directe.

## Documentation technique

Le backend utilise JSDoc pour documenter le code JavaScript directement dans les fichiers sources.

Générer la documentation serveur :

```bash
npm run docs
```

La documentation générée est placée dans `server/docs` et n'est pas versionnée.

## Tests base de données

Les tests PostgreSQL d'intégration sont désactivés par défaut. Pour les activer, définir `RUN_DB_TESTS=true` et fournir un `DATABASE_URL` valide.
