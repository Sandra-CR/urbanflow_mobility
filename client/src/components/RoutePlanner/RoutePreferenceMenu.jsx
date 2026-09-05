import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { BagSimple, Clock, House, Star } from '@phosphor-icons/react';
import {
  deleteFavoritePlace,
  getFavoritePlaces,
  saveFavoritePlace,
} from '../../utils/favoritesApi';
import { deleteRecentPlaceSearch } from '../../utils/recentPlacesDb';
import FavoritePlaceAddForm from './FavoritePlaceAddForm';
import {
  FavoritePlacesPanel,
  RecentPlacesPanel,
} from './RoutePreferencePanels';
import {
  getRecentSuggestions,
  isResolvedRecentPlace,
  isSamePlace,
} from './placeSearchUtils';

const routePreferenceButtons = [
  {
    id: 'clock',
    label: 'Recents',
    Icon: Clock,
  },
  {
    id: 'star',
    label: 'Favoris',
    Icon: Star,
  },
  {
    id: 'house',
    label: 'Domicile',
    Icon: House,
  },
  {
    id: 'bag',
    label: 'Travail',
    Icon: BagSimple,
  },
];

const favoritePreferenceConfig = {
  star: {
    category: 'favorite',
    titleLabel: 'Favoris',
    emptyLabel: 'Aucun favori enregistré',
    loginLabel: 'vos favoris',
    Icon: Star,
    usesCustomName: true,
    submitLabel: 'Ajouter',
  },
  house: {
    category: 'home',
    titleLabel: 'Domicile',
    emptyLabel: 'Aucun domicile enregistré',
    loginLabel: 'votre domicile',
    Icon: House,
    defaultLabel: 'Domicile',
    isSinglePlaceCategory: true,
    usesCustomName: false,
    submitLabel: 'Enregistrer',
  },
  bag: {
    category: 'work',
    titleLabel: 'Travail',
    emptyLabel: 'Aucun lieu de travail enregistré',
    loginLabel: 'votre lieu de travail',
    Icon: BagSimple,
    defaultLabel: 'Travail',
    isSinglePlaceCategory: true,
    usesCustomName: false,
    submitLabel: 'Enregistrer',
  },
};

const emptyFavoritePlacesState = {
  category: null,
  places: [],
  message: '',
};

function createSelectableFavoritePlace(place) {
  const placeLabel = place.placeLabel || place.name || place.label;

  return {
    ...place,
    id: place.stationId || place.id,
    label: placeLabel,
    name: placeLabel,
  };
}

function getFavoritePanelState({ category, currentUser, favoritePlacesState }) {
  if (!category || !currentUser) {
    return {
      places: [],
      message: '',
      isLoading: false,
    };
  }

  const isCurrentCategory = favoritePlacesState.category === category;

  return {
    places: isCurrentCategory ? favoritePlacesState.places : [],
    message: isCurrentCategory ? favoritePlacesState.message : '',
    isLoading: !isCurrentCategory,
  };
}

export default function RoutePreferenceMenu({
  activeSuggestions,
  currentUser,
  excludedPlaces = [],
  isContentVisible,
  recentPlaces,
  onRecentPlacesChange,
  PlaceSearchField,
  PlaceSuggestions,
  preferredPlace,
  onLoginClick,
  onPlaceSelect,
  onPreferenceChange,
  onSearchPlaces,
  areSuggestionStatesEqual,
}) {
  const favoriteNameId = useId();
  const favoriteSearchId = useId();
  const [activePreference, setActivePreference] = useState(
    routePreferenceButtons[0].id
  );
  const [favoritePlacesState, setFavoritePlacesState] = useState(
    emptyFavoritePlacesState
  );
  const [isAddingFavorite, setIsAddingFavorite] = useState(false);
  const [favoriteDraftName, setFavoriteDraftName] = useState('');
  const [favoriteDraftPlace, setFavoriteDraftPlace] = useState(null);
  const [favoriteDraftSyncKey, setFavoriteDraftSyncKey] = useState(0);
  const [favoriteDraftSuggestions, setFavoriteDraftSuggestions] =
    useState(null);
  const [favoriteDraftMessage, setFavoriteDraftMessage] = useState('');
  const [isSavingFavorite, setIsSavingFavorite] = useState(false);

  const activeFavoriteConfig = favoritePreferenceConfig[activePreference];
  const activeFavoriteCategory = activeFavoriteConfig?.category || null;
  const filteredExcludedPlaces = useMemo(
    () => excludedPlaces.filter(Boolean),
    [excludedPlaces]
  );
  const recentPreferencePlaces = useMemo(() => {
    const suggestions = filteredExcludedPlaces.reduce(
      (currentSuggestions, excludedPlace) =>
        currentSuggestions.filter(
          (place) => !isSamePlace(place, excludedPlace)
        ),
      getRecentSuggestions(recentPlaces, null)
    );

    if (!preferredPlace) {
      return suggestions;
    }

    return [
      preferredPlace,
      ...suggestions.filter((place) => !isSamePlace(place, preferredPlace)),
    ];
  }, [filteredExcludedPlaces, preferredPlace, recentPlaces]);
  const {
    places: favoritePlaces,
    message: favoriteMessage,
    isLoading: isLoadingFavorites,
  } = getFavoritePanelState({
    category: activeFavoriteCategory,
    currentUser,
    favoritePlacesState,
  });
  const visibleFavoritePlaces = useMemo(
    () =>
      favoritePlaces.filter(
        (place) =>
          !filteredExcludedPlaces.some((excludedPlace) =>
            isSamePlace(createSelectableFavoritePlace(place), excludedPlace)
          )
      ),
    [favoritePlaces, filteredExcludedPlaces]
  );

  const resetFavoriteDraft = useCallback(() => {
    setIsAddingFavorite(false);
    setFavoriteDraftName('');
    setFavoriteDraftPlace(null);
    setFavoriteDraftSuggestions(null);
    setFavoriteDraftMessage('');
    setIsSavingFavorite(false);
    setFavoriteDraftSyncKey((syncKey) => syncKey + 1);
  }, []);

  const openFavoriteEditor = useCallback(
    (place = null) => {
      resetFavoriteDraft();
      setFavoriteDraftName(
        activeFavoriteConfig?.usesCustomName === false
          ? activeFavoriteConfig.defaultLabel || ''
          : place?.label || ''
      );
      setFavoriteDraftPlace(
        place ? createSelectableFavoritePlace(place) : null
      );
      setIsAddingFavorite(true);
    },
    [activeFavoriteConfig, resetFavoriteDraft]
  );

  const handleFavoriteAddClick = useCallback(() => {
    openFavoriteEditor();
  }, [openFavoriteEditor]);

  const handleFavoriteEditClick = useCallback(
    (place) => {
      openFavoriteEditor(place);
    },
    [openFavoriteEditor]
  );

  const handleFavoriteDraftSuggestionsChange = useCallback(
    (nextSuggestions) => {
      setFavoriteDraftSuggestions((currentSuggestions) => {
        const resolvedSuggestions =
          typeof nextSuggestions === 'function'
            ? nextSuggestions(currentSuggestions)
            : nextSuggestions;

        return areSuggestionStatesEqual(currentSuggestions, resolvedSuggestions)
          ? currentSuggestions
          : resolvedSuggestions;
      });
    },
    [areSuggestionStatesEqual]
  );

  useEffect(() => {
    if (!activeFavoriteConfig || !currentUser) {
      return;
    }

    let isMounted = true;
    const category = activeFavoriteConfig.category;

    getFavoritePlaces(category)
      .then((data) => {
        if (isMounted) {
          setFavoritePlacesState({
            category,
            places: data.places || [],
            message: '',
          });
        }
      })
      .catch((error) => {
        if (isMounted) {
          setFavoritePlacesState({
            category,
            places: [],
            message: error.message,
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeFavoriteConfig, currentUser]);

  async function handleRecentPlaceSelect(place) {
    if (isResolvedRecentPlace(place)) {
      onPlaceSelect(place);
      return;
    }

    try {
      const results = await onSearchPlaces(place.label);
      const resolvedPlace = results[0];

      if (resolvedPlace) {
        onPlaceSelect(resolvedPlace);
      }
    } catch {
      // Un recent non resolu ne bloque pas l'interface.
    }
  }

  async function handleRecentPlaceDelete(place) {
    try {
      await deleteRecentPlaceSearch(place);
      onRecentPlacesChange?.();
      onPreferenceChange?.();
    } catch {
      // La suppression d'un recent reste silencieuse pour ne pas bloquer l'UI.
    }
  }

  function handleFavoritePlaceSelect(place) {
    onPlaceSelect(createSelectableFavoritePlace(place));
  }

  async function handleFavoriteAddSubmit() {
    if (
      !activeFavoriteConfig ||
      (activeFavoriteConfig.usesCustomName !== false &&
        !favoriteDraftName.trim()) ||
      !favoriteDraftPlace
    ) {
      return;
    }

    setIsSavingFavorite(true);
    setFavoriteDraftMessage('');

    try {
      const data = await saveFavoritePlace({
        category: activeFavoriteConfig.category,
        place: {
          ...favoriteDraftPlace,
          label:
            activeFavoriteConfig.usesCustomName === false
              ? activeFavoriteConfig.defaultLabel
              : favoriteDraftName.trim(),
          placeLabel: favoriteDraftPlace.label || favoriteDraftPlace.name,
        },
      });
      const nextPlace = data.place;

      setFavoritePlacesState((currentState) => ({
        category: activeFavoriteConfig.category,
        places: activeFavoriteConfig.isSinglePlaceCategory
          ? [nextPlace]
          : currentState.category === activeFavoriteConfig.category
            ? [
                nextPlace,
                ...currentState.places.filter(
                  (place) =>
                    (place.favoriteId || place.id) !==
                    (nextPlace.favoriteId || nextPlace.id)
                ),
              ]
            : [nextPlace],
        message: '',
      }));
      resetFavoriteDraft();
    } catch (error) {
      setFavoriteDraftMessage(error.message);
    } finally {
      setIsSavingFavorite(false);
    }
  }

  async function handleFavoriteDelete(place) {
    if (!place.favoriteId || !activeFavoriteConfig) {
      return;
    }

    try {
      await deleteFavoritePlace(place.favoriteId);
      setFavoritePlacesState((currentState) => {
        if (currentState.category !== activeFavoriteConfig.category) {
          return currentState;
        }

        return {
          ...currentState,
          places: currentState.places.filter(
            (currentPlace) => currentPlace.favoriteId !== place.favoriteId
          ),
        };
      });
    } catch (error) {
      setFavoritePlacesState((currentState) =>
        currentState.category === activeFavoriteConfig.category
          ? {
              ...currentState,
              message: error.message,
            }
          : currentState
      );
    }
  }

  return (
    <>
      <div className="route-preferences" aria-label="Options d'itineraire">
        {routePreferenceButtons.map(({ id, label, Icon }) => (
          <button
            className="route-preferences__button"
            data-active={activePreference === id}
            key={id}
            type="button"
            aria-label={label}
            aria-pressed={activePreference === id}
            title={label}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setActivePreference(id);
              onPreferenceChange?.();
              resetFavoriteDraft();
            }}
          >
            <Icon size={22} weight="regular" aria-hidden="true" />
          </button>
        ))}
      </div>

      <div className="route-planner__divider" aria-hidden="true" />

      {activeSuggestions ? (
        <PlaceSuggestions suggestions={activeSuggestions} />
      ) : isContentVisible ? (
        <>
          {activePreference === 'clock' ? (
            <RecentPlacesPanel
              places={recentPreferencePlaces}
              onDeletePlace={handleRecentPlaceDelete}
              onPlaceSelect={handleRecentPlaceSelect}
            />
          ) : activeFavoriteConfig && isAddingFavorite ? (
            <FavoritePlaceAddForm
              config={activeFavoriteConfig}
              favoriteName={favoriteDraftName}
              favoritePlace={favoriteDraftPlace}
              favoriteSearchId={favoriteSearchId}
              favoriteSearchSyncKey={favoriteDraftSyncKey}
              favoriteSuggestions={favoriteDraftSuggestions}
              isSavingFavorite={isSavingFavorite}
              message={favoriteDraftMessage}
              nameId={favoriteNameId}
              PlaceSearchField={PlaceSearchField}
              PlaceSuggestions={PlaceSuggestions}
              onFavoriteNameChange={setFavoriteDraftName}
              onFavoritePlaceChange={setFavoriteDraftPlace}
              onSearchPlaces={onSearchPlaces}
              onSuggestionsChange={handleFavoriteDraftSuggestionsChange}
              onSubmit={handleFavoriteAddSubmit}
            />
          ) : activeFavoriteConfig ? (
            <FavoritePlacesPanel
              config={activeFavoriteConfig}
              currentUser={currentUser}
              favoritePlaces={visibleFavoritePlaces}
              favoriteMessage={favoriteMessage}
              isLoadingFavorites={isLoadingFavorites}
              onAddClick={handleFavoriteAddClick}
              onEditPlace={handleFavoriteEditClick}
              onDeletePlace={handleFavoriteDelete}
              onLoginClick={onLoginClick}
              onPlaceSelect={handleFavoritePlaceSelect}
            />
          ) : null}
        </>
      ) : null}
    </>
  );
}
