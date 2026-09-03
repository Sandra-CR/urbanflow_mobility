# UrbanFlow Mobility

UrbanFlow Mobility est une application web de mobilité urbaine éco-conçue, pensée pour proposer une expérience rapide, accessible et performante autour des déplacements urbains.

## Architecture

Le projet est organisé en monorepo avec une séparation claire entre le client et le serveur.

- `client` : application frontend React avec Vite, Tailwind CSS, MapLibre et configuration PWA.
- `server` : API backend Node.js avec Express, PostgreSQL/Supabase, auth JWT, historique carbone, proxy IDF Mobilités et flux GBFS Vélib.

### Responsabilités

Le client porte l’expérience utilisateur : carte, planification d’itinéraire, suivi du trajet, préférences de mobilité, installation PWA, cache de tuiles et tableau de bord carbone local. Les composants lourds sont chargés à la demande avec `React.lazy` afin de garder le bundle initial plus léger.

Le serveur centralise les accès externes et les règles métier partagées : authentification, favoris, appels IDF Mobilités, flux Vélib, fallback OSRM et calcul d’empreinte carbone. Le client ne contacte pas directement ces services métier, ce qui évite d’exposer les clés API et garde un format de réponse homogène.

### Flux principal

1. L’utilisateur saisit un départ et une arrivée dans le planificateur.
2. Le client appelle `GET /api/idfm/journeys` avec les lieux sélectionnés et, si nécessaire, l’option d’accessibilité fauteuil roulant.
3. Le serveur interroge IDF Mobilités, ajoute les trajets directs marche/vélo si besoin, calcule les émissions CO2 et renvoie des itinéraires normalisés.
4. Le client affiche les résultats, la carte et les détails du trajet.
5. Lorsqu’un trajet suivi est terminé, son bilan carbone est enregistré localement et synchronisé côté serveur pour les utilisateurs connectés.

## Choix techniques

- React et Vite permettent une PWA rapide à développer, avec un build simple et compatible avec le chargement différé des pages.
- MapLibre fournit une carte indépendante d’un fournisseur propriétaire, avec des tuiles Carto mises en cache pour améliorer la résilience hors ligne.
- Express reste volontairement léger : les routes sont séparées par domaine (`auth`, `favorites`, `idfm`) et les dépendances externes sont injectables dans les tests.
- PostgreSQL/Supabase stocke les comptes, les favoris, les facteurs carbone et l’historique des trajets terminés des utilisateurs connectés. IndexedDB conserve une copie locale pour le mode hors ligne.
- OpenAPI décrit le contrat HTTP attendu, tandis que JSDoc documente les modules serveur.

## Mon carbone

La page `Mon carbone` est un tableau de bord qui met en avant les émissions de CO2 de l'utilisateur à partir des trajets terminés localement et, pour les comptes connectés, synchronisés côté serveur.

Quand le suivi d'itinéraire détecte l'arrivée à destination, le client enregistre le type de trajet, la date de fin, la distance parcourue en kilomètres, la consommation CO2 du trajet et la consommation CO2 estimée pour un trajet équivalent en voiture solo. Si l'utilisateur est connecté, ces données sont synchronisées avec le serveur via `POST /api/carbon/completed-journeys`. IndexedDB reste utilisé comme cache local et comme fallback hors ligne. La page utilise ensuite ces données pour comparer la consommation totale réelle à celle de la voiture solo, calculer la moyenne de CO2 par kilomètre et classer les types de transport utilisés.

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
npm run install:all
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

Les services peuvent aussi être lancés séparément :

```bash
npm run dev:client
npm run dev:server
```

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
npm run format:check
npm run check
```

`npm run check` enchaîne le lint serveur/client, les tests serveur, le build client, la génération JSDoc serveur et la vérification du contrat OpenAPI.

Pour travailler plus vite sur un seul périmètre :

```bash
npm run check:client
npm run check:server
npm run lint:client
npm run lint:server
```

## Recette fonctionnelle

Avant une démonstration ou une livraison, vérifier les parcours suivants :

- ouvrir l’application sur `/` et confirmer que la carte, le panneau d’itinéraire et la navigation s’affichent ;
- rechercher un itinéraire avec deux lieux valides, puis consulter la fiche détaillée ;
- activer le mode fauteuil roulant et vérifier que le vélo est désactivé dans les résultats ;
- sélectionner un trajet vélo, refuser d’avoir un vélo personnel, puis choisir une borne Vélib proposée ;
- créer un compte, se reconnecter, ajouter un lieu favori et le supprimer ;
- terminer un trajet suivi lorsque la géolocalisation le permet, puis ouvrir `Mon carbone` ;
- ouvrir une URL inconnue et vérifier la page 404 ;
- tester le thème sombre, l’installation PWA lorsque le navigateur la propose et un rafraîchissement en mode hors ligne.

## Déploiement

Le client peut être déployé comme site statique après `npm run build --prefix client`. Le dossier produit est `client/dist`.

Le serveur doit être déployé comme application Node.js persistante avec les variables d’environnement décrites dans `server/README.md`. En production, définir au minimum `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, `IDFM_API_KEY` et `CLIENT_ORIGIN` avec l’origine publique du client. Les migrations SQL doivent être appliquées avant d’ouvrir l’application aux utilisateurs.

Pour un déploiement séparé client/API, configurer `VITE_API_URL` côté client avec l’URL publique du serveur, puis reconstruire le client.
