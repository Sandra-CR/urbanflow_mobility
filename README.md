# UrbanFlow Mobility

UrbanFlow Mobility est une application web de mobilité urbaine éco-conçue, pensée pour proposer une expérience rapide, accessible et performante autour des déplacements urbains.

## Architecture

Le projet est organisé en monorepo avec une séparation claire entre le client et le serveur.

- `client` : application frontend React avec Vite, Tailwind CSS et configuration PWA.
- `server` : API backend Node.js avec Express.

## Installation

Depuis la racine du projet :

```bash
npm install
npm install --prefix client
npm install --prefix server
```

## Démarrage simltané

Depuis la racine :

```powershell
npm run dev
```
