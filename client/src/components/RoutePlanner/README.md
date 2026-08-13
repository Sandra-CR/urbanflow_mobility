# RoutePlanner

`RoutePlanner.jsx` garde la responsabilité du calcul d'itinéraire et des deux
champs départ/arrivée. Les préférences sont isolées dans des composants dédiés
pour éviter de mélanger recherche de route, favoris persistés et rendu des
panneaux.

## Organisation

- `RoutePreferenceMenu.jsx` orchestre les onglets récents, favoris, domicile et
  travail. Les quatre boutons restent toujours visibles.
- `RoutePreferencePanels.jsx` rend les panneaux de liste pour les récents et les
  catégories persistées.
- `RoutePreferencePlaceButton.jsx` rend une ligne sélectionnable avec icône,
  texte secondaire et suppression éventuelle.
- `FavoritePlaceAddForm.jsx` rend le formulaire d'ajout d'un favori/domicile/
  travail en réutilisant le champ de recherche de lieux.
- `placeSearchUtils.js` contient les helpers partagés pour les recherches
  récentes.

## Règles métier

- Un clic sur un bouton ou item de préférence conserve le focus du champ actif.
- Si un champ est focus, un item de préférence remplit ce champ.
- Si aucun champ n'est focus, un item remplit l'arrivée puis focus le départ.
- Pendant une saisie libre, les boutons restent visibles mais les items de
  préférence disparaissent.
- Quand un itinéraire validé est affiché, les items de préférence ne se
  réaffichent pas automatiquement.
- Dans les favoris persistés, `label` est le nom personnalisé et `placeLabel`
  est le vrai arrêt ou la vraie adresse à injecter dans le champ.
