-- Migration : Création de la table user_completed_journeys
-- Date : 2026-09-03

BEGIN;

-- Historique des trajets terminés synchronisé pour la page Mon carbone.
-- L'identifiant est fourni par le client quand il vient d'IndexedDB, afin de
-- rendre une synchronisation pour un même utilisateur.
CREATE TABLE IF NOT EXISTS user_completed_journeys (
    id VARCHAR(120) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    journey_id VARCHAR(255),
    type VARCHAR(100) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    distance_km NUMERIC(10, 3),
    carbon_total_co2e NUMERIC(12, 3) NOT NULL,
    car_solo_co2e NUMERIC(12, 3) NOT NULL,
    savings_vs_car_solo_co2e NUMERIC(12, 3) NOT NULL,
    carbon_unit VARCHAR(20) NOT NULL DEFAULT 'gCO2e',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS user_completed_journeys_user_completed_at_idx
    ON user_completed_journeys (user_id, completed_at DESC);

COMMIT;
