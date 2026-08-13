# UrbanflowBrand

`UrbanflowBrand` centralise l'affichage des logos UrbanFlow Mobility.

## Propriétés

- `kind="logo"` : logo complet avec texte.
- `kind="symbol"` : symbole seul.
- `variant="primary"` : asset coloré pour un fond neutre (`--color-card`, `--color-background`).
- `variant="onPrimary"` : asset contrasté pour un fond `--color-primary`.
- `isDarkMode` : choisit le dossier `assets/brand/dark` au lieu de `assets/brand/light`.

## Exemples

```jsx
<UrbanflowBrand kind="symbol" variant="primary" isDarkMode={isDarkMode} />
<UrbanflowBrand kind="logo" variant="onPrimary" isDarkMode={isDarkMode} alt="" />
```

Ne pas importer directement les SVG de `assets/brand` dans les composants React. Passer par ce composant garde le comportement dark/light cohérent sur tout le site.
