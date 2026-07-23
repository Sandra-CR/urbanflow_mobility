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

## Démarrage simultané

Depuis la racine :

```powershell
npm run dev
```

## Documentation technique

Le backend utilise JSDoc pour documenter le code JavaScript directement dans les fichiers sources.

L'objectif est de garder une documentation lisible :

- expliquer le rôle d'une fonction ou d'un module
- préciser les paramètres attendus
- préciser la valeur retournée
- signaler les erreurs possibles avec `@throws`
- éviter de commenter les lignes évidentes

Générer la documentation serveur :

```bash
npm run docs
```

La documentation générée est placée dans `server/docs` et n'est pas versionnée.
