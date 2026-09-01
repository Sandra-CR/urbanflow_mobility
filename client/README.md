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

Les trajets terminés sont stockés dans la même base IndexedDB via `src/utils/completedJourneysDb.js`, dans le store `completed_journeys`. Ils alimentent la page `Mon carbone` sans limite applicative de nombre de trajets enregistrés. Chaque entrée contient :

- `type` : profil ou combinaison de modes du trajet.
- `completedAt` : date ISO de fin du trajet.
- `distanceKm` : distance totale du trajet en kilomètres.
- `carbonFootprint.total_co2e` : consommation CO2 du trajet.
- `carbonFootprint.car_solo_co2e` : consommation CO2 estimée en voiture solo.
- `carbonFootprint.savings_vs_car_solo_co2e` : economie estimée face à la voiture solo.

La page `src/components/CarbonPage/CarbonPage.jsx` lit l'ensemble de ces entrées, compare les totaux et rend les graphiques avec Chart.js :

- comparaison des consommations `Vos trajets` / `En voiture` ;
- ratio de proportion, par exemple `3,2x moins` ;
- moyenne de CO2 consomme par kilomètre ;
- classement horizontal des types de transport préférés.

Si IndexedDB est indisponible ou vide, la page reste accessible et affiche des états vides.

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

## Accessibilité RGAA / WCAG 2.1 AA

Le client vise les bonnes pratiques RGAA et WCAG 2.1 niveau AA. Cette documentation ne vaut pas audit de conformité, mais elle fixe les règles à respecter pour les composants React du projet.

### Structure et navigation

- Garder un seul contenu principal identifié par `#app-content`.
- Conserver le lien d'évitement `Aller au contenu principal` au début de l'application.
- Utiliser les éléments HTML natifs en priorité : `button` pour une action, `a` pour une navigation, `label` pour un champ.
- Ne pas imbriquer de contrôles interactifs entre eux, par exemple un `button` dans un autre `button` ou dans un `label` qui contient déjà une action séparée.
- Utiliser `aria-current="page"` uniquement sur l'entrée de navigation réellement active.
- Désactiver les actions non disponibles avec `disabled` plutôt que de laisser un bouton sans comportement.

### Clavier et focus

- Toutes les actions doivent être utilisables au clavier.
- Ne pas supprimer le focus visible sans le remplacer par une alternative claire.
- Les styles globaux dans `App.css` renforcent `:focus-visible` sur les liens, boutons, champs et contrôles ARIA interactifs.
- Les panneaux, modales et contenus scrollables doivent rester atteignables au clavier sans piège de focus.

### Formulaires

- Chaque champ doit avoir un nom accessible via `label`, `aria-label` ou `aria-labelledby`.
- Le placeholder ne doit jamais être la seule information permettant de comprendre un champ.
- Les messages d'erreur doivent utiliser `role="alert"` lorsqu'ils nécessitent une correction immédiate.
- Les messages de chargement ou de résultat doivent utiliser `role="status"` et, si nécessaire, `aria-live="polite"`.
- Les aides dynamiques, comme les règles de mot de passe, doivent être reliées au champ avec `aria-describedby` lorsqu'elles sont visibles.

### Images, icônes, cartes et graphiques

- Les icônes décoratives doivent rester en `aria-hidden="true"`.
- Les boutons à icône seule doivent porter un `aria-label` explicite.
- Les logos décoratifs peuvent avoir `alt=""`; les logos porteurs d'information doivent avoir un texte alternatif.
- Les graphiques `canvas` doivent avoir `role="img"` et un texte alternatif résumant les valeurs importantes.
- La carte interactive doit être accompagnée de contrôles et états textuels suffisants lorsque l'information ne peut pas être lue directement dans le canvas.

### Couleurs, contraste et thème

- Utiliser les variables CSS de `src/index.css` pour bénéficier des variantes clair/sombre.
- Vérifier les contrastes du texte, des bordures utiles, des états hover/focus/disabled et des informations d'état.
- Ne jamais transmettre une information uniquement par la couleur : ajouter du texte, un libellé ou un motif.
- Les scrollbars et contrôles natifs suivent `color-scheme` selon le thème actif.

### Mouvement et responsive

- Respecter `prefers-reduced-motion: reduce` pour réduire animations et transitions.
- Ne pas imposer une orientation d'écran.
- Éviter le scroll horizontal global en mobile ; les scrolls horizontaux internes doivent être justifiés et contenus.
- Tester les pages en mobile, tablette et desktop, en thème clair et sombre.

### Checklist avant merge

Avant de merger une modification UI :

```bash
npm run lint --prefix client
npm run build --prefix client
```

Puis vérifier manuellement :

- navigation complète au clavier avec `Tab`, `Shift+Tab`, `Enter` et `Espace` ;
- focus visible sur chaque contrôle ;
- intitulés compréhensibles pour les boutons à icône seule ;
- messages d'erreur et de chargement annoncés correctement ;
- contraste lisible en thème clair et sombre ;
- absence de scroll horizontal global sur mobile ;
- lecture cohérente des pages principales avec un lecteur d'écran ou un outil d'audit d'accessibilité.

## Logos et assets de marque

Les images importées sont placées dans `src/assets/brand`.

Les icônes PWA installées sur mobile doivent être placées dans `public`.

Voir `src/assets/brand/README.md` pour les formats recommandés.
