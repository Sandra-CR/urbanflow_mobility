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

Les images importées sont placés dans `src/assets/brand`.

Les icônes PWA installées sur mobile doivent être placées dans `public`.

Voir `src/assets/brand/README.md` pour les formats recommandés.
