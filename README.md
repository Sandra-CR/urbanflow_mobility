# UrbanFlow Mobility

UrbanFlow Mobility est une application web de mobilité urbaine éco-conçue, pensée pour proposer une expérience rapide, accessible et performante autour des déplacements urbains.

## Architecture

Le projet est organisé en monorepo avec une séparation claire entre le client et le serveur.

- `client` : application frontend React avec Vite, Tailwind CSS, MapLibre et configuration PWA.
- `server` : API backend Node.js avec Express, PostgreSQL/Supabase, auth JWT, proxy IDF Mobilités et flux GBFS Vélib.

## Mon carbone

La page `Mon carbone` est un tableau de bord client qui met en avant les émissions de CO2 de l'utilisateur à partir des trajets terminés localement.

Quand le suivi d'itinéraire détecte l'arrivée à destination, le client enregistre dans IndexedDB le type de trajet, la date de fin, la distance parcourue en kilomètres, la consommation CO2 du trajet et la consommation CO2 estimée pour un trajet équivalent en voiture solo. La page utilise ensuite ces données pour comparer la consommation totale réelle à celle de la voiture solo, calculer la moyenne de CO2 par kilomètre et classer les types de transport utilisés.

## Page introuvable

Le client affiche une page `404` lorsque l'utilisateur ouvre une URL qui ne correspond pas aux chemins connus de l'application. Cette page conserve la navigation UrbanFlow Mobility, centre le message d'erreur sur desktop et occupe tout l'écran utile sur mobile pour garder une expérience cohérente avec le reste de la PWA.

## Documentation

- `client/README.md` : conventions visuelles, PWA, stockage local, assets et icônes.
- `server/README.md` : configuration backend, migrations PostgreSQL, API HTTP, calcul carbone, fallback OSRM, bornes Vélib, tests et JSDoc.

## Accessibilité

Le frontend vise une conformité RGAA alignée sur WCAG 2.1 niveau AA. Les règles de base sont documentées dans `client/README.md` : structure sémantique, navigation clavier, intitulés accessibles, focus visible, alternatives aux contenus visuels, respect de `prefers-reduced-motion` et tests manuels attendus.

## Installation

Depuis la racine du projet :

```bash
npm install
npm install --prefix client
npm install --prefix server
```

Copier les fichiers d'exemple d'environnement avant le premier démarrage :

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Adapter ensuite les valeurs sensibles dans `server/.env`, notamment `DATABASE_URL`, `JWT_SECRET` et `IDFM_API_KEY`.

## Démarrage

Depuis la racine :

```powershell
npm run dev
```

Le client Vite démarre sur `http://localhost:5173` et l'API sur `http://localhost:3000` par défaut.

Sur Windows, si PowerShell bloque `npm.ps1`, utiliser `npm.cmd` :

```powershell
npm.cmd run dev
```

## Vérifications

Depuis la racine :

```bash
npm run lint
npm run test
npm run build
npm run docs
npm run openapi:check
npm run check
```

`npm run check` enchaîne le lint serveur/client, les tests serveur, le build client, la génération JSDoc serveur et la vérification du contrat OpenAPI.
