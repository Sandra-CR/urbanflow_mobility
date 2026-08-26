# Client UrbanFlow Mobility

Application frontend React avec Vite, Tailwind CSS et configuration PWA.

## Scripts

Depuis `client` :

```bash
npm install
npm run dev
npm run build
npm run lint
npm run format:check
```

Sur Windows, si PowerShell bloque `npm.ps1`, utiliser `npm.cmd` :

```powershell
npm.cmd run build
```

## Configuration

Le client lit ses variables depuis `client/.env`. Copier `client/.env.example` vers `client/.env` si l'API ne tourne pas sur `http://localhost:3000`.

| Variable             | Obligatoire | Valeur par défaut       | Description                                      |
| -------------------- | ----------- | ----------------------- | ------------------------------------------------ |
| `VITE_API_URL`       | Non         | `http://localhost:3000` | URL de l'API appelée par le frontend.            |
| `VITE_CARTO_API_KEY` | Oui         | -                       | Cle API CARTO utilisée pour les tuiles de carte. |

## Organisation des composants

Chaque composant partagé vit dans son propre dossier sous `src/components`. Le fichier JSX et son CSS restent côte à côte, par exemple `src/components/RoutePlanner/RoutePlanner.jsx` et `src/components/RoutePlanner/RoutePlanner.css`.

## Thème visuel

Les couleurs, typographies, rayons et ombres partagés sont centralisés dans `src/index.css` sous forme de variables CSS. Les tokens principaux sont exposés dans `tailwind.config.js` pour être réutilisables avec Tailwind.

### Couleurs

Tokens disponibles :

**Variables principales**

- `primary`
- `primary-hover`
- `background`
- `card`
- `text`
- `text-light`
- `secondary`
- `shadow`
- `on-primary`

**Variables d'état**

- `danger`
- `danger-text`
- `danger-bg`
- `danger-border`
- `warning`
- `warning-text`
- `warning-bg`
- `warning-border`
- `success`
- `success-text`
- `success-bg`
- `success-border`

En CSS :

```css
.example {
  background: var(--color-card);
  color: var(--color-text);
}
```

Avec Tailwind :

```jsx
<section className="bg-card text-text">...</section>
```

### Mode sombre

Le thème sombre est activé avec l'attribut `data-theme="dark"` sur un conteneur parent.

```jsx
<main data-theme={isDarkMode ? 'dark' : 'light'}>...</main>
```

Les composants doivent consommer les variables CSS plutôt que définir directement des couleurs hexadécimales.

## Typographies

Classes CSS disponibles :

- `text-h1` : Inter bold, 24 px.
- `text-h2` : Inter semibold, 18 px, line-height 24 px.
- `text-h4` : Inter bold uppercase, 13 px.
- `text-body` : Inter medium, 16 px, line-height 22 px.
- `text-small` : Inter regular, 13 px, line-height 18 px.

Équivalents Tailwind disponibles :

- `text-h1`
- `text-h2`
- `text-h4`
- `text-body`
- `text-small`

Pour garder la PWA utilisable hors ligne, Inter est auto-hébergée dans `public/fonts`. Voir `public/fonts/README.md`.

## PWA et stockage local

Le client utilise `vite-plugin-pwa` pour générer le service worker et le manifest PWA. Le service worker est configuré en `autoUpdate` et activé aussi en développement pour tester les scénarios hors ligne.

Les tuiles Carto sont mises en cache avec une stratégie `CacheFirst` dans le cache `carto-map-tiles`. Le cache runtime garde jusqu'à `600` entrées pendant `30` jours.

Le préchargement automatique des tuiles utilise la Cache API via `src/utils/offlineMapTiles.js`. Il précharge silencieusement les tuiles clair/sombre autour de Paris, du zoom `11` au zoom `15`.

Les recherches récentes du route planner sont stockées dans IndexedDB via `src/utils/recentPlacesDb.js`. La base s'appelle `urbanflow_mobility`, le store `recent_place_searches`, et seules les `10` dernières recherches sont affichées. Si IndexedDB est indisponible, le route planner reste utilisable sans historique.

## Icônes

Les icônes de l'interface doivent venir de `@phosphor-icons/react`.

Exemple :

```jsx
import { DownloadSimple } from '@phosphor-icons/react';

<DownloadSimple size={20} weight="bold" aria-hidden="true" />;
```

Règles d'usage :

- Préférer les composants Phosphor dans la mesure du possible.
- Garder `aria-hidden="true"` pour les icônes purement décoratives ou déjà décrites par le bouton.
- Utiliser `aria-label` sur le bouton ou le contrôle interactif, pas sur l'icône seule.

## Logos et assets de marque

Les images importées sont placées dans `src/assets/brand`.

Les icônes PWA installées sur mobile doivent être placées dans `public`.

Voir `src/assets/brand/README.md` pour les formats recommandés.
