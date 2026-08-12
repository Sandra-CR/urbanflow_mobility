# UrbanFlow Mobility

UrbanFlow Mobility est une application web de mobilité urbaine éco-conçue, pensée pour proposer une expérience rapide, accessible et performante autour des déplacements urbains.

## Architecture

Le projet est organisé en monorepo avec une séparation claire entre le client et le serveur.

- `client` : application frontend React avec Vite, Tailwind CSS, MapLibre et configuration PWA.
- `server` : API backend Node.js avec Express, PostgreSQL/Supabase, auth JWT et proxy IDF Mobilités.

## Documentation

- `client/README.md` : conventions visuelles, PWA, stockage local, assets et icônes.
- `server/README.md` : configuration backend, migrations PostgreSQL, API HTTP, calcul carbone, fallback OSRM, tests et JSDoc.

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
