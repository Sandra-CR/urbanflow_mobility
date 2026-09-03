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
3. `003_create_user_favorite_places.sql` crée les lieux favoris utilisateur.
4. `004_create_user_completed_journeys.sql` crée l'historique carbone synchronisé des trajets terminés.

Avec `psql`, depuis la racine du projet :

```bash
psql "$DATABASE_URL" -f server/migrations/001_create_users.sql
psql "$DATABASE_URL" -f server/migrations/002_create_carbon_factors.sql
psql "$DATABASE_URL" -f server/migrations/003_create_user_favorite_places.sql
psql "$DATABASE_URL" -f server/migrations/004_create_user_completed_journeys.sql
```

La migration `003_create_user_favorite_places.sql` crée `user_favorite_places`, active PostGIS et stocke les catégories `favorite`, `home` et `work` par utilisateur.

Sur Supabase, les mêmes fichiers peuvent être exécutés dans le SQL Editor, dans le même ordre. `DATABASE_URL` doit pointer vers la base PostgreSQL utilisée par le serveur.

### Schéma de données

Tables principales :

- `users` : comptes applicatifs. L’adresse e-mail est unique et le mot de passe est stocké sous forme de hash.
- `carbon_factors` : facteurs d’émission CO2 par mode de transport, utilisés par le calcul carbone.
- `user_favorite_places` : lieux favoris rattachés à un utilisateur. Les catégories fonctionnelles sont `favorite`, `home` et `work`.
- `user_completed_journeys` : trajets terminés rattachés à un utilisateur, avec distance, date de fin et comparaison CO2 face à la voiture solo.

Extensions attendues :

- `pgcrypto` pour générer des UUID avec `gen_random_uuid()`.
- `postgis` pour stocker et manipuler les coordonnées des lieux favoris.

La clé primaire de `user_completed_journeys` est composée de `user_id` et `id`. Le client peut donc synchroniser plusieurs fois le même trajet local sans créer de doublon pour un même utilisateur.

## API HTTP

Le contrat strict de l'API est décrit dans `server/openapi.yaml` au format OpenAPI 3.0. Il couvre :

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `DELETE /api/auth/me`
- `GET /api/carbon/completed-journeys`
- `POST /api/carbon/completed-journeys`
- `GET /api/favorites`
- `POST /api/favorites`
- `GET /api/idfm/disruptions`
- `GET /api/idfm/nearby-stations`
- `GET /api/idfm/bike-stations`
- `GET /api/idfm/places`
- `GET /api/idfm/journeys`
- `POST /api/idfm/bike-station-journey`

`GET /api/idfm/journeys` accepte le paramètre optionnel
`wheelchairAccessible=true`. Quand il est présent, le serveur transmet
`wheelchair=true` à Navitia pour demander des itinéraires en transports
compatibles avec un accès fauteuil roulant.

L'API est exposée sur `http://localhost:3000` par défaut. Les routes d'authentification utilisent un cookie httpOnly nommé `urbanflow_auth`.

Toutes les réponses d'erreur utilisent le format :

```json
{
  "error": "Message lisible par l'interface"
}
```

Certaines validations peuvent ajouter un champ `details`.

### Contrat et évolution

Toute nouvelle route publique doit être ajoutée dans `server/openapi.yaml`, couverte par `npm run openapi:check` et documentée dans ce README si elle introduit un nouveau domaine fonctionnel. Les erreurs doivent rester lisibles par le client et conserver le champ `error`.

Les routes qui dépendent d’un utilisateur connecté doivent utiliser le middleware JWT et ne jamais lire directement un identifiant utilisateur depuis le corps de requête.

## Fonctionnalités clés

### Géolocalisation

Au chargement de la page avec la carte, le client peut demander l'accès à la position de l'appareil.

Si l'utilisateur accepte, la carte se recentre sur sa position. La position est affichée par un point visuel dédié sur la carte. Si l'autorisation arrive après le premier affichage, le recentrage est relancé automatiquement. Si l'accès est refusé ou indisponible, l'application reste utilisable avec le centrage par défaut.

### Favoris utilisateur

Les utilisateurs connectés peuvent enregistrer des lieux favoris dans trois catégories : `favorite`, `home` et `work`.

Les routes `/api/favorites` sont protégées par JWT et renvoient les favoris au même format que les lieux normalisés IDF Mobilités. Le client peut ainsi réutiliser les suggestions du planificateur d'itinéraire sans adaptation spécifique.

Les favoris sont stockés dans `user_favorite_places`, créée par la migration `003_create_user_favorite_places.sql`. Un favori peut référencer une station via `station_id` ou une adresse libre via `geom`.

### Historique Mon carbone

Les routes `/api/carbon/completed-journeys` sont protégées par JWT. Elles permettent à un utilisateur connecté de retrouver son historique `Mon carbone` sur plusieurs sessions ou appareils.

`GET /api/carbon/completed-journeys` renvoie les trajets terminés du compte, triés du plus récent au plus ancien.

`POST /api/carbon/completed-journeys` enregistre ou met à jour un trajet terminé. Le serveur vérifie la présence d'un identifiant, d'un type, d'une date valide, d'une consommation CO2 réelle et d'une estimation voiture solo. L'économie CO2 est recalculée si le client ne l'envoie pas.

Le client continue d'utiliser IndexedDB comme cache local et comme secours hors ligne. Si le serveur est indisponible, l'application reste utilisable et la page `Mon carbone` affiche les données locales.

### Calcul carbone local

Le calcul carbone utilise d'abord la table PostgreSQL `carbon_factors`. Si la requête SQL échoue, le serveur bascule sur des facteurs locaux définis dans le service carbone pour garder l'itinéraire exploitable.

Quand ce fallback est utilisé, le serveur écrit dans la console :

```text
Calcul carbone local
```

Ce comportement évite qu'une indisponibilité Supabase bloque le calcul d'itinéraire. Si un mode de transport n'a aucun facteur connu, l'itinéraire est quand même renvoyé et `carbonFootprintMessage` signale les modes manquants.

La page client `Mon carbone` s'appuie sur ces valeurs carbone. Le serveur reste responsable du calcul par itinéraire, notamment `total_co2e`, `car_solo_co2e` et `savings_vs_car_solo_co2e`, avant que le client n'enregistre le trajet terminé localement et, si possible, dans `user_completed_journeys`.

### Accessibilité fauteuil roulant

La route `GET /api/idfm/journeys` peut recevoir
`wheelchairAccessible=true`. Ce paramètre est volontairement nommé côté API
UrbanFlow, puis traduit en `wheelchair=true` dans l'appel Navitia.

Cette option limite les propositions de transport public aux parcours annoncés
accessibles par IDF Mobilités. Elle ne modifie pas le calcul carbone. Côté
client, le trajet marche reste sélectionnable et représenté avec l'icône
fauteuil roulant, tandis que le trajet vélo est désactivé dans ce mode.

### Fallback OSRM marche/vélo

La route `GET /api/idfm/journeys` demande des trajets marche, vélo et transports à IDF Mobilités. Si IDF Mobilités ne renvoie pas de trajet direct marche ou vélo, le serveur peut construire un trajet de secours avec OSRM via `ROUTING_API_BASE_URL`.

OSRM sert uniquement à enrichir les trajets directs marche/vélo avec une géométrie de rue et une distance plus réaliste. Si OSRM est indisponible, le serveur revient à une ligne directe entre les coordonnées fournies.

### Perturbations IDF Mobilités

La route `GET /api/idfm/disruptions` expose les perturbations applicables au moment de la requête pour les métros, RER, lignes rapides/Transilien et tramways. Les bus sont exclus.

Le serveur interroge `traffic_reports` côté IDF Mobilités avec `since` et `until` positionnés sur l'instant courant. Les perturbations sont rattachées aux lignes depuis les liens `traffic_reports.lines[].links` et depuis les `impacted_objects` présents sur chaque disruption, car certaines lignes impactées ne sont exposées que par ce second chemin.

Avant réponse au client, les résultats sont normalisés et regroupés par ligne. Les doublons par message sont fusionnés, les messages HTML sont nettoyés, les perturbations non applicables au jour courant sont filtrées, puis le tri place les interruptions avant les perturbations dans l'ordre métro, RER, ligne rapide/Transilien, tram.

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

## Déploiement serveur

Préparer l’environnement de production :

```bash
npm ci --prefix server
npm run lint --prefix server
npm run test --prefix server
```

Variables minimales en production :

- `NODE_ENV=production`
- `PORT`
- `CLIENT_ORIGIN`
- `DATABASE_URL`
- `JWT_SECRET`
- `IDFM_API_KEY`

Appliquer les migrations SQL avant le premier démarrage, puis lancer :

```bash
npm run start --prefix server
```

Le serveur doit être exposé en HTTPS derrière le fournisseur d’hébergement ou un reverse proxy. `CLIENT_ORIGIN` doit contenir l’origine exacte du client public pour que les cookies httpOnly et CORS fonctionnent correctement.

## Observabilité et erreurs

Le middleware d’erreur renvoie un `errorId` lorsque le serveur rencontre une erreur inattendue ou une erreur de base de données. Cet identifiant doit être conservé dans les journaux d’hébergement pour faciliter le diagnostic.

Les erreurs de configuration de base de données courantes sont transformées en réponses lisibles : base inaccessible, identifiants invalides, schéma incomplet, droits insuffisants ou URL invalide.

## Tests base de données

Les tests PostgreSQL d'intégration sont désactivés par défaut. Pour les activer, définir `RUN_DB_TESTS=true` et fournir un `DATABASE_URL` valide.
