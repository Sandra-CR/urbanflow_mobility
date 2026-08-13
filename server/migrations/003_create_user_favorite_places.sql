-- Migration : Création de la table user_favorite_places
-- Date : 2026-08-13

BEGIN;

-- Activation de PostGIS pour stocker les adresses libres en Point WGS84.
CREATE EXTENSION IF NOT EXISTS postgis;

-- Création de la table
CREATE TABLE IF NOT EXISTS user_favorite_places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(20) NOT NULL CHECK (category IN ('favorite', 'home', 'work')),
    label VARCHAR(100) NOT NULL,
    place_label VARCHAR(150),
    station_id VARCHAR(255),
    geom GEOMETRY(Point, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index de lecture principal pour charger rapidement une catégorie de favoris
-- de l'utilisateur courant.
CREATE INDEX IF NOT EXISTS user_favorite_places_user_category_idx
    ON user_favorite_places (user_id, category);

COMMIT;
