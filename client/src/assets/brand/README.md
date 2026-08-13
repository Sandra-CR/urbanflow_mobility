# Assets De Marque

Les logos UrbanFlow Mobility sont classés par thème :

- `light/` : assets pour le thème clair.
- `dark/` : assets pour le thème sombre.

Chaque dossier contient deux formes :

- `urbanflow-logo-*.svg` : logo complet avec texte.
- `urbanflow-symbol-*.svg` : symbole seul.

Et deux variantes de contraste :

- `primary` : à utiliser sur fond neutre (`--color-card`, `--color-background`).
- `onprimary` : à utiliser sur un fond `--color-primary`.

Dans le code React, ne pas importer ces fichiers directement. Utiliser [UrbanflowBrand.jsx](../../components/UrbanflowBrand/UrbanflowBrand.jsx), qui selectionne la bonne variante selon `kind`, `variant` et `isDarkMode`.
