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
- `RouteDisruptionsPage.jsx` rend la page dédiée aux perturbations, avec la
  séparation interruptions/perturbations, les cards par ligne et le détail.
- `RouteDisruptionsPage.css` contient les styles de la page perturbations.
- `routeDisruptionsUtils.js` regroupe la normalisation, le regroupement par
  ligne, le tri d'affichage et les libellés de perturbations.
- `TransportLineBadge.jsx` centralise le rendu couleur/lettre/numéro des lignes
  de transport utilisé par les suggestions, les trajets et les perturbations.
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
- Les préférences de mobilité `Tri` et `Accès` sont visibles uniquement avec
  des résultats d'itinéraire et partagent les mêmes clés `localStorage` que la
  page `Mon compte`.
- Les résultats gardent toujours l'ordre de groupes `A pied`, puis `A vélo`,
  puis transports. Le tri CO2/temps s'applique à l'intérieur de ces groupes.
- En mode `Accès` PMR, le trajet marche reste disponible avec l'icône
  Phosphor `WheelchairMotion`, tandis que le trajet vélo est désactivé.
- Le bouton perturbations ouvre une page interne qui remplace le contenu
  itinéraire. Un retour depuis le détail revient à la liste des perturbations ;
  un retour depuis la liste revient au planificateur.
- Les perturbations sont affichées en deux groupes, interruptions puis
  perturbations. Chaque ligne est représentée par une card avec badge de ligne,
  titre de mode et messages distincts séparés visuellement.
- Dans les favoris persistés, `label` est le nom personnalisé et `placeLabel`
  est le vrai arrêt ou la vraie adresse à injecter dans le champ.
- Un clic sur une proposition vélo demande si l'utilisateur possède un vélo.
  `Oui` conserve le trajet direct. `Non, voir les bornes` affiche les cinq
  bornes Vélib les plus proches avec vélos disponibles, puis remplace la
  proposition vélo par un trajet composé marche, vélo partagé et marche après
  sélection d'une borne.
