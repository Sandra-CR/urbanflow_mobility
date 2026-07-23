# Fonts locales

Pour garder la PWA utilisable hors ligne, les fichiers de police sont placés ici en WOFF2 et chargés depuis `src/index.css`.

Exemple :

```css
@font-face {
  font-family: Inter;
  src: url('/fonts/inter-variable.woff2') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
```

La volonté est d'éviter les outils comme Google Fonts ou tout CDN car ces sources cassent l'expérience hors ligne et ajoutent une dépendance réseau au premier chargement.
