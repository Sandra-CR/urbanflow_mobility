-- Migration : Création de la table carbon_factors
-- Date : 2026-08-08

BEGIN;

-- Création de la table
CREATE TABLE IF NOT EXISTS carbon_factors (
    id SERIAL PRIMARY KEY,
    transport_mode VARCHAR(50) UNIQUE NOT NULL,
    co2_per_km NUMERIC(6,2) NOT NULL,
    source VARCHAR(100) DEFAULT 'Base Empreinte ADEME'
);

-- Insertion des données de référence
INSERT INTO carbon_factors (transport_mode, co2_per_km, source) VALUES
('marche', 0.0, 'Base Carbone ADEME v23.0'),
('velo', 0.0, 'Base Carbone ADEME v23.0'),
('velo_elec', 2.5, 'Base Carbone ADEME v23.0'),
('metro', 2.8, 'Base Empreinte ADEME v23.0'),
('rer', 4.1, 'Base Empreinte ADEME v23.0'),
('tramway', 3.5, 'Base Empreinte ADEME v23.0'),
('transilien_train', 5.2, 'Base Empreinte ADEME v23.0'),
('bus', 103.0, 'Base Carbone ADEME v23.0'),
('ter', 29.6, 'Base Carbone ADEME v23.0'),
('tgv', 1.73, 'Base Carbone ADEME v23.0'),
('intercites', 8.98, 'Base Carbone ADEME v23.0'),
('voiture_solo', 218.0, 'Base Carbone ADEME v23.0'),
('covoiturage', 109.0, 'Base Carbone ADEME v23.0');

COMMIT;