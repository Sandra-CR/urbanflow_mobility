# Favoris Utilisateur

Le module `server/favorites` expose les lieux enregistrés par utilisateur connecté.

## Categories

- `favorite` : favoris génériques, affichés par le bouton étoile.
- `home` : domicile, affiché par le bouton maison.
- `work` : lieu de travail, affiché par le bouton sac.

## Routes

Toutes les routes utilisent le cookie JWT `urbanflow_auth` et passent par `requireAuth`.

- `GET /api/favorites?category=favorite|home|work`
- `POST /api/favorites`

Le serveur renvoie les favoris au même format que les lieux normalisés IDF Mobilités (`id`, `label`, `type`, `coordinates`, `lines`). Le client peut donc réutiliser les composants de suggestion du planificateur sans adaptation.

## Stockage

La table `user_favorite_places` est créée par `server/migrations/003_create_user_favorite_places.sql`.

- `station_id` identifie un arrêt ou une station quand disponible.
- `geom` stocke une adresse ou un point libre en `geometry(Point, 4326)`.
- `station_id` et `geom` sont tous les deux optionnels dans le schéma, mais l'API exige au moins un identifiant station ou des coordonnées.
