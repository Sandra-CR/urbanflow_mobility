import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowsDownUp,
  ArrowLeft,
  Bus,
  CaretDown,
  X,
  HourglassMedium,
  Leaf,
  MapPin,
  // MapTrifold,
  PersonSimpleBike,
  PersonSimpleWalk,
  Steps,
  Subway,
  TrainSimple,
  Tram,
  WheelchairMotion,
  Warning,
} from '@phosphor-icons/react';
import {
  getRecentPlaceSearches,
  saveRecentPlaceSearch,
} from '../../utils/recentPlacesDb';
import RoutePreferenceMenu from './RoutePreferenceMenu';
import {
  getRecentSuggestions,
  isResolvedRecentPlace,
} from './placeSearchUtils';
import { normalizeMode } from '../../utils/text';
import ActiveJourneyTracker from './ActiveJourneyTracker';
import LegalFooter from '../LegalFooter/LegalFooter';
import RouteDisruptionsPage from './RouteDisruptionsPage';
import { getSortedRouteDisruptions } from './routeDisruptionsUtils';
import TransportLineBadge from './TransportLineBadge';
import './RoutePlanner.css';

const ROUTE_SORT_STORAGE_KEY = 'urbanflow-route-sort';
const ROUTE_SORT_MODES = {
  co2: 'co2',
  time: 'time',
};
const ROUTE_ACCESSIBILITY_STORAGE_KEY = 'urbanflow-route-accessibility';
const ROUTE_ACCESSIBILITY_MODES = {
  standard: 'standard',
  wheelchair: 'wheelchair',
};

function scheduleAfterInitialRender(callback, timeout = 1200) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  if ('requestIdleCallback' in window) {
    const idleId = window.requestIdleCallback(callback, { timeout });

    return () => window.cancelIdleCallback(idleId);
  }

  const timeoutId = window.setTimeout(callback, timeout);

  return () => window.clearTimeout(timeoutId);
}

function getInitialRouteSortMode() {
  if (typeof window === 'undefined') {
    return ROUTE_SORT_MODES.co2;
  }

  const cachedSortMode = window.localStorage.getItem(ROUTE_SORT_STORAGE_KEY);

  return Object.values(ROUTE_SORT_MODES).includes(cachedSortMode)
    ? cachedSortMode
    : ROUTE_SORT_MODES.co2;
}

function getInitialRouteAccessibilityMode() {
  if (typeof window === 'undefined') {
    return ROUTE_ACCESSIBILITY_MODES.standard;
  }

  const cachedMode = window.localStorage.getItem(
    ROUTE_ACCESSIBILITY_STORAGE_KEY
  );

  return Object.values(ROUTE_ACCESSIBILITY_MODES).includes(cachedMode)
    ? cachedMode
    : ROUTE_ACCESSIBILITY_MODES.standard;
}

function getPersonalModeIcon(mode = '') {
  const normalizedMode = normalizeMode(mode);

  if (
    normalizedMode.includes('platform_change') ||
    normalizedMode.includes('transfer')
  ) {
    return 'steps';
  }

  if (normalizedMode.includes('waiting')) {
    return 'wait';
  }

  if (normalizedMode.includes('velo') || normalizedMode.includes('bike')) {
    return 'bike';
  }

  return 'walk';
}

function getTransportModePriority(mode = '') {
  const normalizedMode = normalizeMode(mode);

  if (
    normalizedMode.includes('rer') ||
    normalizedMode.includes('rapid') ||
    normalizedMode.includes('train')
  ) {
    return 5;
  }

  if (normalizedMode.includes('metro')) {
    return 4;
  }

  if (normalizedMode.includes('tram')) {
    return 3;
  }

  if (normalizedMode.includes('bus')) {
    return 2;
  }

  return 0;
}

function getLineModeText(line) {
  return [line.commercialMode, line.physicalMode, line.label, line.code]
    .filter(Boolean)
    .join(' ');
}

function getLinePriority(line) {
  const modeText = getLineModeText(line);
  const priority = getTransportModePriority(modeText);
  const code = String(line.code || '')
    .trim()
    .toUpperCase();

  if (priority > 0) {
    return priority;
  }

  if (/^[A-E]$/.test(code)) {
    return 5;
  }

  if (/^\d{1,2}$/.test(code)) {
    return 4;
  }

  if (/^T\d*/.test(code)) {
    return 3;
  }

  return code ? 2 : 0;
}

function getPlaceLines(place) {
  return place.lines || [];
}

function isAddressPlace(place) {
  return place.type === 'address' && getPlaceLines(place).length === 0;
}

function isUserLocationPlace(place) {
  return Boolean(place?.isUserLocation);
}

function areCoordinatesEqual(firstCoordinates, secondCoordinates) {
  if (
    !Array.isArray(firstCoordinates) ||
    !Array.isArray(secondCoordinates) ||
    firstCoordinates.length < 2 ||
    secondCoordinates.length < 2
  ) {
    return false;
  }

  return (
    Number(firstCoordinates[0]) === Number(secondCoordinates[0]) &&
    Number(firstCoordinates[1]) === Number(secondCoordinates[1])
  );
}

function prependUniquePlace(places, preferredPlace, excludedPlace = null) {
  if (!preferredPlace) {
    return places;
  }

  if (
    (excludedPlace?.id && preferredPlace.id === excludedPlace.id) ||
    areCoordinatesEqual(preferredPlace.coordinates, excludedPlace?.coordinates)
  ) {
    return places;
  }

  const filteredPlaces = places.filter((place) => {
    if (place.id && preferredPlace.id) {
      return place.id !== preferredPlace.id;
    }

    return !areCoordinatesEqual(place.coordinates, preferredPlace.coordinates);
  });

  return [preferredPlace, ...filteredPlaces];
}

function getPlaceIconType(place) {
  if (isUserLocationPlace(place)) {
    return 'current-location';
  }

  if (isAddressPlace(place)) {
    return 'address';
  }

  const bestLine = getPlaceLines(place).reduce(
    (selectedLine, line) =>
      getLinePriority(line) > getLinePriority(selectedLine || {})
        ? line
        : selectedLine,
    null
  );
  const mode = normalizeMode(getLineModeText(bestLine || {}));
  const priority = getLinePriority(bestLine || {});

  if (
    priority === 5 ||
    mode.includes('rer') ||
    mode.includes('rapid') ||
    mode.includes('train')
  ) {
    return 'train';
  }

  if (priority === 4 || mode.includes('metro')) {
    return 'subway';
  }

  if (priority === 3 || mode.includes('tram')) {
    return 'tram';
  }

  if (priority === 2 || mode.includes('bus')) {
    return 'bus';
  }

  return 'address';
}

function PlaceTypeIcon({ place }) {
  const iconType = getPlaceIconType(place);

  if (iconType === 'current-location') {
    return (
      <span
        className="route-suggestion__current-location-marker"
        aria-hidden="true"
      />
    );
  }

  if (iconType === 'train') {
    return <TrainSimple size={20} weight="regular" aria-hidden="true" />;
  }

  if (iconType === 'subway') {
    return <Subway size={20} weight="regular" aria-hidden="true" />;
  }

  if (iconType === 'tram') {
    return <Tram size={20} weight="regular" aria-hidden="true" />;
  }

  if (iconType === 'bus') {
    return <Bus size={20} weight="regular" aria-hidden="true" />;
  }

  return <MapPin size={20} weight="regular" aria-hidden="true" />;
}

function PlaceSuggestionDetails({ place }) {
  if (isUserLocationPlace(place)) {
    return place.secondaryLabel ? <small>{place.secondaryLabel}</small> : null;
  }

  if (isAddressPlace(place)) {
    return place.city ? <small>{place.city}</small> : null;
  }

  const lines = getPlaceLines(place);

  if (lines.length === 0) {
    return <small>Arrêt</small>;
  }

  const bestPriority = Math.max(...lines.map((line) => getLinePriority(line)));
  const visibleLines = lines.filter(
    (line) => getLinePriority(line) === bestPriority
  );

  return (
    <span className="route-suggestion__lines">
      {visibleLines.slice(0, 8).map((line, index) => (
        <TransportLineBadge
          key={line.id || `${line.code}-${index}`}
          line={line}
        />
      ))}
    </span>
  );
}

function formatDuration(seconds) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  return `${hours} h ${remainingMinutes.toString().padStart(2, '0')}`;
}

function formatCarbonValue(carbonFootprint) {
  const value = Number(carbonFootprint?.total_co2e);

  if (!Number.isFinite(value)) {
    return null;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}kg`;
  }

  return `${Math.round(value)}g`;
}

function getJourneyCarbonValue(journey) {
  const value = Number(journey?.carbonFootprint?.total_co2e);

  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

function getJourneyDurationValue(journey) {
  const value = Number(journey?.duration);

  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

function getJourneyPinnedSortPriority(journey) {
  if (journey?.profile === 'walking') {
    return 0;
  }

  if (journey?.profile === 'bike') {
    return 1;
  }

  return 2;
}

function isWheelchairDisabledJourneyProfile(profile) {
  return profile === 'bike';
}

function formatCarbonAmount(value) {
  const carbonValue = Number(value);

  if (!Number.isFinite(carbonValue)) {
    return null;
  }

  if (carbonValue >= 1000) {
    return `${(carbonValue / 1000).toFixed(carbonValue >= 10000 ? 0 : 1)}kg`;
  }

  return `${Math.round(carbonValue)}g`;
}

function formatDistance(distanceKm) {
  const distance = Number(distanceKm);

  if (!Number.isFinite(distance) || distance <= 0) {
    return null;
  }

  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }

  return `${distance.toFixed(distance >= 10 ? 0 : 1)} km`;
}

function parseJourneyDateTime(value) {
  if (!value) {
    return null;
  }

  if (/^\d{8}T\d{6}$/.test(value)) {
    return new Date(
      `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}`
    );
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatJourneyTime(value) {
  const date = parseJourneyDateTime(value);

  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function CarbonFootprintBadge({ carbonFootprint }) {
  const label = formatCarbonValue(carbonFootprint);

  if (!label) {
    return null;
  }

  return (
    <span className="route-result__carbon" title="Empreinte carbone">
      <Leaf size={14} weight="regular" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

function CarbonSummary({ carbonFootprint }) {
  const journeyCarbon = formatCarbonAmount(carbonFootprint?.total_co2e);
  const carCarbon = formatCarbonAmount(carbonFootprint?.car_solo_co2e);
  const savings = formatCarbonAmount(carbonFootprint?.savings_vs_car_solo_co2e);

  return (
    <section className="route-detail-carbon" aria-label="Empreinte carbone">
      <div>
        <span className="route-detail-carbon__label">Trajet</span>
        <strong>{journeyCarbon || '–'}</strong>
      </div>
      <div>
        <span className="route-detail-carbon__label">Voiture</span>
        <strong>{carCarbon || '–'}</strong>
      </div>
      <div className="route-detail-carbon__eco">
        <span className="route-detail-carbon__label">Economie</span>
        <strong className="text-primary">{savings || '–'}</strong>
      </div>
      {/* {savings ? (
        <p>{savings} de CO₂ économisés par rapport à la voiture solo.</p>
      ) : null} */}
    </section>
  );
}

function getSectionStopText(section) {
  if (!Number.isFinite(Number(section.stopCount)) || section.stopCount <= 0) {
    return null;
  }

  return `${section.stopCount} arrêt${section.stopCount > 1 ? 's' : ''}`;
}

function getSectionTitle(section) {
  if (section.type === 'public_transport') {
    return section.label || section.line?.label || section.mode || 'Transport';
  }

  return section.label || section.mode || 'Trajet';
}

function isPlatformChangeSection(section) {
  return normalizeMode(section.mode) === 'platform_change';
}

function isPersonalTravelSection(section) {
  const mode = normalizeMode(section.mode);

  return (
    mode === 'walking' ||
    mode === 'walk' ||
    mode === 'bike' ||
    mode.includes('velo')
  );
}

function isSoftTimelineSection(section) {
  const mode = normalizeMode(section.mode);

  return mode === 'waiting' || mode === 'platform_change';
}

function getTimelineColor(section) {
  const mode = normalizeMode(section.mode);

  if (mode === 'waiting' || mode === 'platform_change') {
    return 'var(--color-secondary)';
  }

  return section.color || 'var(--color-primary)';
}

function getIntermediateStops(section) {
  if (!Array.isArray(section.stops) || section.stops.length <= 2) {
    return [];
  }

  return section.stops.slice(1, -1);
}

function SectionStops({ section }) {
  const intermediateStops = getIntermediateStops(section);
  const stopText = getSectionStopText(section);
  const mode = normalizeMode(section.mode);

  if (
    isPlatformChangeSection(section) ||
    mode === 'walking' ||
    mode === 'walk' ||
    (!section.from && !section.to && !stopText)
  ) {
    return null;
  }

  return (
    <div className="route-step-card__stops">
      {section.from ? <span>{section.from}</span> : null}
      {stopText ? (
        <details className="route-step-stops">
          <summary>
            <span>{stopText}</span>
            <CaretDown size={14} weight="regular" aria-hidden="true" />
          </summary>
          {intermediateStops.length > 0 ? (
            <ul>
              {intermediateStops.map((stop, index) => (
                <li key={`${stop}-${index}`}>{stop}</li>
              ))}
            </ul>
          ) : null}
        </details>
      ) : null}
      {section.to ? <span>{section.to}</span> : null}
    </div>
  );
}

function RouteTimelineItem({
  section,
  index,
  previousSection,
  nextSection,
  useWheelchairWalkIcon = false,
}) {
  const startTime = formatJourneyTime(section.departureDateTime);
  const endTime = formatJourneyTime(section.arrivalDateTime);
  const isPlatformChange = isPlatformChangeSection(section);
  const connectsFromPreviousSoftSection =
    isSoftTimelineSection(section) && isSoftTimelineSection(previousSection);
  const connectsToNextSoftSection =
    isSoftTimelineSection(section) && isSoftTimelineSection(nextSection);
  const lineStyle = {
    '--route-step-color': getTimelineColor(section),
  };
  const meta = isPlatformChange
    ? [formatDuration(section.duration || 0)]
    : [
        formatDuration(section.duration || 0),
        isPersonalTravelSection(section)
          ? formatDistance(section.distanceKm)
          : null,
      ].filter(Boolean);

  return (
    <li
      className="route-timeline__item"
      data-mode={normalizeMode(section.mode)}
      data-connect-previous={connectsFromPreviousSoftSection}
      data-connect-next={connectsToNextSoftSection}
      style={lineStyle}
    >
      <div className="route-timeline__rail" aria-hidden="true">
        <span className="route-timeline__time route-timeline__time--start">
          {startTime || (index === 0 ? 'Départ' : '')}
        </span>
        <span className="route-timeline__dot route-timeline__dot--start" />
        <span className="route-timeline__line" />
        {connectsToNextSoftSection ? (
          <span className="route-timeline__dot route-timeline__dot--link" />
        ) : null}
        {!isPlatformChange && endTime ? (
          <>
            <span className="route-timeline__dot route-timeline__dot--end" />
            <span className="route-timeline__time route-timeline__time--end">
              {endTime}
            </span>
          </>
        ) : null}
      </div>
      <div className="route-step-card">
        <div className="route-step-card__header">
          <JourneySectionBadge
            section={section}
            useWheelchairWalkIcon={useWheelchairWalkIcon}
          />
          <div>
            <strong>{getSectionTitle(section)}</strong>
            {meta.length > 0 ? <small>{meta.join(' · ')}</small> : null}
          </div>
        </div>
        <SectionStops section={section} />
      </div>
    </li>
  );
}

function getJourneyDestinationLabel(journey) {
  const sections = journey?.sections || [];

  for (let index = sections.length - 1; index >= 0; index -= 1) {
    const destination = sections[index]?.to;

    if (destination) {
      return destination;
    }
  }

  return journey?.to || journey?.arrival || 'Destination';
}

function RouteDetails({
  journey,
  onBack,
  isJourneyComplete = false,
  useWheelchairWalkIcon = false,
  children = null,
  footer = null,
}) {
  if (!journey) {
    return null;
  }

  const timelineSections = journey.sections.filter(
    (section, index, sections) =>
      !(
        isPlatformChangeSection(section) &&
        (index === 0 || index === sections.length - 1)
      )
  );
  const destinationLabel = isJourneyComplete
    ? getJourneyDestinationLabel(journey)
    : null;

  return (
    <div className="route-detail" aria-label="Fiche de route">
      <header
        className="route-detail__header"
        data-complete={isJourneyComplete}
      >
        {isJourneyComplete ? (
          <>
            <div className="route-detail__complete-title">
              <h1>Vous êtes à destination</h1>
              <p>{destinationLabel}</p>
            </div>
            <button
              className="route-detail__close"
              type="button"
              onClick={onBack}
              aria-label="Fermer le suivi du trajet"
            >
              <X size={18} weight="bold" aria-hidden="true" />
            </button>
          </>
        ) : (
          <>
            <button
              className="route-detail__back"
              type="button"
              onClick={onBack}
            >
              <ArrowLeft size={16} weight="bold" aria-hidden="true" />
              <span>Retour</span>
            </button>
            {/* <JourneySequence sections={journey.sections} /> */}
            <strong>{formatDuration(journey.duration)}</strong>
          </>
        )}
      </header>

      {children ? (
        children
      ) : (
        <>
          <CarbonSummary carbonFootprint={journey.carbonFootprint} />

          <ol className="route-timeline">
            {timelineSections.map((section, index) => (
              <RouteTimelineItem
                key={section.id || `${section.label}-${index}`}
                section={section}
                index={index}
                previousSection={timelineSections[index - 1]}
                nextSection={timelineSections[index + 1]}
                useWheelchairWalkIcon={useWheelchairWalkIcon}
              />
            ))}
          </ol>
        </>
      )}
      {footer}
    </div>
  );
}

function PlaceSearchField({
  id,
  label,
  placeholder,
  selectedPlace,
  excludedRecentPlace,
  syncKey,
  syncedQuery,
  showInlineLabel = true,
  showRecentSearches,
  recentPlaces,
  inputRef,
  onPlaceChange,
  onSearchPlaces,
  onSuggestionsChange,
  onPlaceSelect,
  onRecentPlacesChange,
  onFieldFocus,
  onFieldBlur,
  onQueryChange,
  preferredPlace,
}) {
  const [query, setQuery] = useState(selectedPlace?.label || '');
  const [places, setPlaces] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const latestQueryRef = useRef('');
  const latestRecentSelectionRef = useRef(0);
  const skippedRecentQueryRef = useRef('');
  const syncedQueryRef = useRef(syncedQuery);
  const onQueryChangeRef = useRef(onQueryChange);
  const recentSuggestions = useMemo(
    () => getRecentSuggestions(recentPlaces, excludedRecentPlace),
    [excludedRecentPlace, recentPlaces]
  );

  const clearSuggestions = useCallback(() => {
    onSuggestionsChange((currentSuggestions) =>
      currentSuggestions?.fieldId === id ? null : currentSuggestions
    );
  }, [id, onSuggestionsChange]);

  const closeSuggestions = useCallback(() => {
    setPlaces([]);
    setIsOpen(false);
    setSearchMessage('');
  }, []);

  const saveRecentPlace = useCallback(
    (place) => {
      saveRecentPlaceSearch(place)
        .then(() => onRecentPlacesChange?.())
        .catch(() => {});
    },
    [onRecentPlacesChange]
  );

  useEffect(() => {
    syncedQueryRef.current = syncedQuery;
  }, [syncedQuery]);

  useEffect(() => {
    onQueryChangeRef.current = onQueryChange;
  }, [onQueryChange]);

  useEffect(() => {
    // Seules les actions externes resynchronisent le champ.
    // La référence évite de relancer cet effet pendant la saisie.
    setQuery(syncedQueryRef.current);
    onQueryChangeRef.current?.(syncedQueryRef.current);
    setPlaces([]);
    setIsOpen(false);
    setSearchMessage('');
  }, [syncKey]);

  useEffect(() => {
    const safeQuery = query.trim();
    latestQueryRef.current = safeQuery;

    if (skippedRecentQueryRef.current === safeQuery) {
      return undefined;
    }

    if (safeQuery.length < 2 || selectedPlace?.label === safeQuery) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      setIsSearching(true);
      setSearchMessage('');

      onSearchPlaces(safeQuery)
        .then((results) => {
          if (latestQueryRef.current === safeQuery) {
            setPlaces(results);
            setIsOpen(true);
            setSearchMessage(results.length === 0 ? 'Aucun lieu trouvé.' : '');
          }
        })
        .catch((error) => {
          if (latestQueryRef.current === safeQuery) {
            setPlaces([]);
            setIsOpen(true);
            setSearchMessage(error.message);
          }
        })
        .finally(() => {
          if (latestQueryRef.current === safeQuery) {
            setIsSearching(false);
          }
        });
    }, 240);

    return () => {
      clearTimeout(timeout);
    };
  }, [onSearchPlaces, query, saveRecentPlace, selectedPlace]);

  const handleSelect = useCallback(
    (place) => {
      skippedRecentQueryRef.current = '';
      setQuery(place.label);
      onQueryChange?.(place.label);
      closeSuggestions();
      saveRecentPlace(place);
      onPlaceChange(place);
      onPlaceSelect?.(place);
    },
    [
      closeSuggestions,
      onPlaceChange,
      onPlaceSelect,
      onQueryChange,
      saveRecentPlace,
    ]
  );

  const handleRecentSelect = useCallback(
    (place) => {
      if (isResolvedRecentPlace(place)) {
        handleSelect(place);
        return;
      }

      const recentSelectionKey = latestRecentSelectionRef.current + 1;
      latestRecentSelectionRef.current = recentSelectionKey;
      skippedRecentQueryRef.current = place.label.trim();

      setQuery(place.label);
      onQueryChange?.(place.label);
      closeSuggestions();
      setIsSearching(true);

      onSearchPlaces(place.label)
        .then((results) => {
          if (latestRecentSelectionRef.current !== recentSelectionKey) {
            return;
          }

          const resolvedPlace = results[0];

          if (resolvedPlace) {
            handleSelect(resolvedPlace);
            return;
          }

          onPlaceChange(null);
          setSearchMessage('Lieu recent introuvable.');
        })
        .catch((error) => {
          if (latestRecentSelectionRef.current === recentSelectionKey) {
            onPlaceChange(null);
            setSearchMessage(error.message);
          }
        })
        .finally(() => {
          if (latestRecentSelectionRef.current === recentSelectionKey) {
            setIsSearching(false);
          }
        });
    },
    [
      closeSuggestions,
      handleSelect,
      onPlaceChange,
      onQueryChange,
      onSearchPlaces,
    ]
  );

  const showRecentPlaces = useCallback(() => {
    if (!showRecentSearches || query.trim()) {
      return;
    }

    if (recentSuggestions.length === 0) {
      clearSuggestions();
      return;
    }

    onSuggestionsChange({
      fieldId: id,
      places: recentSuggestions,
      message: '',
      onSelect: handleRecentSelect,
    });
  }, [
    clearSuggestions,
    handleRecentSelect,
    id,
    onSuggestionsChange,
    query,
    recentSuggestions,
    showRecentSearches,
  ]);

  useEffect(() => {
    if (isOpen && showRecentSearches && !query.trim()) {
      return;
    }

    if (isOpen && (places.length > 0 || searchMessage)) {
      onSuggestionsChange({
        fieldId: id,
        places: prependUniquePlace(places, preferredPlace),
        message: searchMessage,
        onSelect: handleSelect,
      });
      return;
    }

    clearSuggestions();
  }, [
    clearSuggestions,
    handleSelect,
    id,
    isOpen,
    onSuggestionsChange,
    places,
    preferredPlace,
    query,
    searchMessage,
    showRecentSearches,
  ]);

  useEffect(() => {
    if (showRecentSearches && isOpen && !query.trim()) {
      showRecentPlaces();
    }
  }, [isOpen, query, showRecentPlaces, showRecentSearches]);

  useEffect(() => {
    if (!showRecentSearches && !query.trim()) {
      clearSuggestions();
    }
  }, [clearSuggestions, query, showRecentSearches]);

  const handleInputChange = useCallback(
    (event) => {
      const nextQuery = event.target.value;
      const nextSafeQuery = nextQuery.trim();

      latestRecentSelectionRef.current += 1;
      skippedRecentQueryRef.current = '';
      setQuery(nextQuery);
      onQueryChange?.(nextQuery);
      onPlaceChange(null);
      setSearchMessage('');

      if (nextSafeQuery.length < 2) {
        setPlaces([]);
      }

      setIsOpen(true);
    },
    [onPlaceChange, onQueryChange]
  );

  const handleFocus = useCallback(() => {
    onFieldFocus?.();

    if (!query.trim() && showRecentSearches) {
      setIsOpen(true);
      return;
    }

    setIsOpen(places.length > 0 || Boolean(searchMessage));
  }, [onFieldFocus, places.length, query, searchMessage, showRecentSearches]);

  return (
    <label className="route-field" htmlFor={id}>
      <div className="route-field__input">
        {showInlineLabel ? (
          <span className="route-field__tag">{label}</span>
        ) : null}
        <input
          id={id}
          ref={inputRef}
          type="search"
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          onBlur={() => {
            window.setTimeout(() => {
              setIsOpen(false);
              onFieldBlur?.();
            }, 120);
          }}
          onChange={handleInputChange}
          onFocus={handleFocus}
          aria-label={showInlineLabel ? undefined : label}
        />
        {isSearching ? (
          <span
            className="route-field__loader"
            role="status"
            aria-label="Recherche en cours"
          />
        ) : null}
      </div>
    </label>
  );
}

function PlaceSuggestions({ suggestions }) {
  if (!suggestions) {
    return null;
  }

  return (
    <div className="route-suggestions">
      {suggestions.places.map((place) => (
        <button
          className="route-suggestion"
          key={place.id}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => suggestions.onSelect(place)}
        >
          <span className="route-suggestion__icon">
            <PlaceTypeIcon place={place} />
          </span>
          <span className="route-suggestion__content">
            <span className="route-suggestion__label">{place.label}</span>
            <PlaceSuggestionDetails place={place} />
          </span>
        </button>
      ))}
      {suggestions.places.length === 0 && suggestions.message ? (
        <div className="route-suggestions__message">{suggestions.message}</div>
      ) : null}
    </div>
  );
}

function areSuggestionStatesEqual(firstSuggestions, secondSuggestions) {
  if (firstSuggestions === secondSuggestions) {
    return true;
  }

  if (!firstSuggestions || !secondSuggestions) {
    return false;
  }

  return (
    firstSuggestions.fieldId === secondSuggestions.fieldId &&
    firstSuggestions.places === secondSuggestions.places &&
    firstSuggestions.message === secondSuggestions.message &&
    firstSuggestions.onSelect === secondSuggestions.onSelect
  );
}

function JourneySectionBadge({ section, useWheelchairWalkIcon = false }) {
  const isTransport = section.type === 'public_transport';
  const icon = isTransport ? null : getPersonalModeIcon(section.mode);
  const lineMode = normalizeMode(section.line?.commercialMode || section.mode);
  const label = isTransport
    ? section.line?.code || section.line?.label || section.mode
    : '';
  const style = {
    '--route-line-color': section.color || '#64748b',
    '--route-line-text': section.textColor || '#ffffff',
  };

  return (
    <span
      className="route-line-badge"
      data-mode={lineMode}
      data-transport={isTransport}
      style={style}
      title={section.label}
    >
      {icon === 'bike' ? (
        <PersonSimpleBike size={24} weight="regular" aria-hidden="true" />
      ) : null}
      {icon === 'walk' ? (
        useWheelchairWalkIcon ? (
          <WheelchairMotion size={24} weight="regular" aria-hidden="true" />
        ) : (
          <PersonSimpleWalk size={24} weight="regular" aria-hidden="true" />
        )
      ) : null}
      {icon === 'steps' ? (
        <Steps size={24} weight="regular" aria-hidden="true" />
      ) : null}
      {icon === 'wait' ? (
        <HourglassMedium size={24} weight="regular" aria-hidden="true" />
      ) : null}
      {label ? <span>{label}</span> : null}
    </span>
  );
}

function JourneySequence({ sections, useWheelchairWalkIcon = false }) {
  const relevantSections = sections
    .filter(
      (section) =>
        section.type === 'public_transport' || section.type === 'street_network'
    )
    .filter((section, index, allSections) => {
      const previousSection = allSections[index - 1];

      return (
        index === 0 ||
        section.line?.code !== previousSection?.line?.code ||
        section.mode !== previousSection?.mode
      );
    })
    .slice(0, 7);

  if (relevantSections.length === 0) {
    return null;
  }

  return (
    <span className="route-sequence">
      {relevantSections.map((section, index) => (
        <span
          className="route-sequence__item"
          key={`${section.id || section.label}-${index}`}
        >
          {index > 0 ? <span className="route-sequence__dot" /> : null}
          <JourneySectionBadge
            section={section}
            useWheelchairWalkIcon={useWheelchairWalkIcon}
          />
        </span>
      ))}
    </span>
  );
}

function getDominantLabel(profile) {
  if (profile === 'walking') {
    return 'A pied';
  }

  if (profile === 'bike') {
    return 'A vélo';
  }

  return 'En transports';
}

export default function RoutePlanner({
  currentUser,
  disruptions = [],
  hasLoadedDisruptions = false,
  journeys = [],
  selectedJourney,
  isRouteDetailsVisible,
  isRouteTrackingActive = false,
  isTrackedJourneyComplete = false,
  currentTrackedStepIndex = 0,
  trackedStepIndex = 0,
  isLoading,
  isLoadingDisruptions = false,
  message,
  userLocation = null,
  userLocationPlace,
  onTrackedStepChange,
  onBackToResults,
  onTrackedJourneyCompleteClose,
  onJourneySelect,
  onDisruptionsOpen,
  onLegalLinkClick,
  onLoginClick,
  onInputsInvalid,
  onPlan,
  onSearchPlaces,
}) {
  const plannerRef = useRef(null);
  const fromId = useId();
  const toId = useId();
  const fromInputRef = useRef(null);
  const toInputRef = useRef(null);
  const latestPlanKeyRef = useRef('');
  const wasLatestInputStateInvalidRef = useRef(false);
  const [fromPlace, setFromPlace] = useState(null);
  const [toPlace, setToPlace] = useState(null);
  const [swapVersion, setSwapVersion] = useState(0);
  const [focusedRouteField, setFocusedRouteField] = useState(null);
  const [routeFieldQueries, setRouteFieldQueries] = useState({
    from: '',
    to: '',
  });
  const [activeSuggestions, setActiveSuggestions] = useState(null);
  const [isDisruptionsOpen, setIsDisruptionsOpen] = useState(false);
  const [selectedDisruption, setSelectedDisruption] = useState(null);
  const [recentPlaces, setRecentPlaces] = useState([]);
  const [routeSortMode, setRouteSortMode] = useState(getInitialRouteSortMode);
  const [routeAccessibilityMode, setRouteAccessibilityMode] = useState(
    getInitialRouteAccessibilityMode
  );
  const isWheelchairAccessibilityEnabled =
    routeAccessibilityMode === ROUTE_ACCESSIBILITY_MODES.wheelchair;
  const hasValidatedRoute = Boolean(fromPlace?.id && toPlace?.id);
  const isUserLocationAlreadySelected =
    (userLocationPlace?.id &&
      (userLocationPlace.id === fromPlace?.id ||
        userLocationPlace.id === toPlace?.id)) ||
    areCoordinatesEqual(
      userLocationPlace?.coordinates,
      fromPlace?.coordinates
    ) ||
    areCoordinatesEqual(userLocationPlace?.coordinates, toPlace?.coordinates);
  const preferencePreferredPlace = !isUserLocationAlreadySelected
    ? userLocationPlace
    : null;
  const destinationSuggestion =
    (focusedRouteField === 'to' || !focusedRouteField) &&
    !isUserLocationAlreadySelected
      ? userLocationPlace
      : null;
  const hasVisibleRouteResults =
    hasValidatedRoute && (isLoading || journeys.length > 0);
  const isFocusedRouteFieldEmpty = focusedRouteField
    ? !routeFieldQueries[focusedRouteField]?.trim()
    : true;
  const shouldShowPreferenceContent =
    isFocusedRouteFieldEmpty && !hasVisibleRouteResults;
  const shouldShowPreferences = !hasValidatedRoute;
  const sortedDisruptions = useMemo(
    () => getSortedRouteDisruptions(journeys, disruptions),
    [disruptions, journeys]
  );
  const sortedJourneys = useMemo(
    () =>
      journeys
        .map((journey, index) => ({ journey, index }))
        .sort((firstItem, secondItem) => {
          const firstPriority = getJourneyPinnedSortPriority(firstItem.journey);
          const secondPriority = getJourneyPinnedSortPriority(
            secondItem.journey
          );

          if (firstPriority !== secondPriority) {
            return firstPriority - secondPriority;
          }

          const firstValue =
            routeSortMode === ROUTE_SORT_MODES.time
              ? getJourneyDurationValue(firstItem.journey)
              : getJourneyCarbonValue(firstItem.journey);
          const secondValue =
            routeSortMode === ROUTE_SORT_MODES.time
              ? getJourneyDurationValue(secondItem.journey)
              : getJourneyCarbonValue(secondItem.journey);

          if (firstValue !== secondValue) {
            return firstValue - secondValue;
          }

          return firstItem.index - secondItem.index;
        })
        .map(({ journey }) => journey),
    [journeys, routeSortMode]
  );
  const handleDisruptionsBack = useCallback(() => {
    setSelectedDisruption(null);
    setIsDisruptionsOpen(false);
  }, []);

  const handleRouteSortChange = useCallback((nextSortMode) => {
    setRouteSortMode(nextSortMode);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ROUTE_SORT_STORAGE_KEY, nextSortMode);
    }
  }, []);

  const handleRouteAccessibilityChange = useCallback((nextMode) => {
    setRouteAccessibilityMode(nextMode);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ROUTE_ACCESSIBILITY_STORAGE_KEY, nextMode);
    }
  }, []);

  function handleSubmit(event) {
    event.preventDefault();
  }

  const refreshRecentPlaces = useCallback(() => {
    getRecentPlaceSearches()
      .then(setRecentPlaces)
      .catch(() => {
        setRecentPlaces([]);
      });
  }, []);

  const handleSuggestionsChange = useCallback((nextSuggestions) => {
    setActiveSuggestions((currentSuggestions) => {
      const resolvedSuggestions =
        typeof nextSuggestions === 'function'
          ? nextSuggestions(currentSuggestions)
          : nextSuggestions;

      return areSuggestionStatesEqual(currentSuggestions, resolvedSuggestions)
        ? currentSuggestions
        : resolvedSuggestions;
    });
  }, []);

  const handleFromPlaceSelect = useCallback(() => {
    window.setTimeout(() => toInputRef.current?.focus(), 0);
  }, []);

  const handleRouteFieldQueryChange = useCallback((field, query) => {
    setRouteFieldQueries((currentQueries) =>
      currentQueries[field] === query
        ? currentQueries
        : {
            ...currentQueries,
            [field]: query,
          }
    );
  }, []);

  const handleFromQueryChange = useCallback(
    (query) => handleRouteFieldQueryChange('from', query),
    [handleRouteFieldQueryChange]
  );

  const handleToQueryChange = useCallback(
    (query) => handleRouteFieldQueryChange('to', query),
    [handleRouteFieldQueryChange]
  );

  const clearFocusedRouteField = useCallback((field) => {
    window.setTimeout(() => {
      const activeElement = document.activeElement;

      if (activeElement === fromInputRef.current) {
        setFocusedRouteField('from');
        return;
      }

      if (activeElement === toInputRef.current) {
        setFocusedRouteField('to');
        return;
      }

      setFocusedRouteField((currentField) =>
        currentField === field ? null : currentField
      );
    }, 0);
  }, []);

  useEffect(() => {
    return scheduleAfterInitialRender(refreshRecentPlaces);
  }, [refreshRecentPlaces]);

  useEffect(() => {
    if (!isRouteDetailsVisible || !selectedJourney) {
      return;
    }

    plannerRef.current?.scrollTo(0, 0);
  }, [isRouteDetailsVisible, selectedJourney]);

  useEffect(() => {
    if (!fromPlace?.id || !toPlace?.id) {
      latestPlanKeyRef.current = '';
      if (!wasLatestInputStateInvalidRef.current) {
        wasLatestInputStateInvalidRef.current = true;
        onInputsInvalid?.();
      }
      return;
    }

    wasLatestInputStateInvalidRef.current = false;

    if (isLoading) {
      return;
    }

    const planKey = `${fromPlace.id}->${toPlace.id}:${routeAccessibilityMode}`;

    if (latestPlanKeyRef.current === planKey) {
      return;
    }

    latestPlanKeyRef.current = planKey;
    onPlan({
      from: fromPlace,
      to: toPlace,
      wheelchairAccessible: isWheelchairAccessibilityEnabled,
    });
  }, [
    fromPlace,
    isWheelchairAccessibilityEnabled,
    isLoading,
    onInputsInvalid,
    onPlan,
    routeAccessibilityMode,
    toPlace,
  ]);

  function handleSwapPlaces() {
    const nextFromPlace = toPlace;
    const nextToPlace = fromPlace;

    setFromPlace(nextFromPlace);
    setToPlace(nextToPlace);
    setSwapVersion((version) => version + 1);
  }

  function setRoutePlace(field, place) {
    if (field === 'from') {
      setFromPlace(place);
    } else {
      setToPlace(place);
    }

    setSwapVersion((version) => version + 1);
  }

  function handlePreferencePlaceSelect(place) {
    // Le clic garde le focus du champ : c'est donc lui qui décide où écrire.
    if (focusedRouteField === 'from') {
      setRoutePlace('from', place);
      return;
    }

    if (focusedRouteField === 'to') {
      setRoutePlace('to', place);
      return;
    }

    if (!fromPlace?.id) {
      setRoutePlace('from', place);
      window.setTimeout(() => toInputRef.current?.focus(), 0);
      return;
    }

    setRoutePlace('to', place);
    window.setTimeout(() => fromInputRef.current?.focus(), 0);
  }

  const destinationActiveSuggestions = useMemo(() => {
    if (!activeSuggestions || !destinationSuggestion) {
      return activeSuggestions;
    }

    return {
      ...activeSuggestions,
      places: prependUniquePlace(
        activeSuggestions.places,
        destinationSuggestion
      ),
    };
  }, [activeSuggestions, destinationSuggestion]);

  if (isRouteDetailsVisible && selectedJourney) {
    return (
      <aside
        ref={plannerRef}
        className="route-planner"
        aria-label="Fiche de route"
      >
        <RouteDetails
          journey={selectedJourney}
          onBack={
            isTrackedJourneyComplete
              ? onTrackedJourneyCompleteClose
              : onBackToResults
          }
          isJourneyComplete={isTrackedJourneyComplete}
          useWheelchairWalkIcon={isWheelchairAccessibilityEnabled}
          footer={
            <LegalFooter
              className="route-planner__legal-footer"
              onLegalLinkClick={onLegalLinkClick}
            />
          }
        >
          {isRouteTrackingActive ? (
            <ActiveJourneyTracker
              journey={selectedJourney}
              isJourneyComplete={isTrackedJourneyComplete}
              currentTrackedStepIndex={currentTrackedStepIndex}
              currentStepIndex={trackedStepIndex}
              useWheelchairWalkIcon={isWheelchairAccessibilityEnabled}
              userLocation={userLocation}
              onStepChange={onTrackedStepChange}
            />
          ) : null}
        </RouteDetails>
      </aside>
    );
  }

  if (isDisruptionsOpen) {
    return (
      <aside
        ref={plannerRef}
        className="route-planner"
        aria-label="Perturbations"
      >
        <RouteDisruptionsPage
          disruptions={sortedDisruptions}
          isLoading={isLoadingDisruptions}
          selectedDisruption={selectedDisruption}
          onBack={handleDisruptionsBack}
          onSelect={setSelectedDisruption}
        />
        <LegalFooter
          className="route-planner__legal-footer"
          onLegalLinkClick={onLegalLinkClick}
        />
      </aside>
    );
  }

  return (
    <aside
      ref={plannerRef}
      className="route-planner"
      aria-label="Recherche d'itinéraire"
    >
      <form className="route-planner__form" onSubmit={handleSubmit}>
        <div className="route-planner__header">
          <h1>
            {/* <MapTrifold size={24} weight="regular" aria-hidden="true" /> */}
            <span>Itinéraires</span>
          </h1>
          <button
            className="route-disruptions-button"
            type="button"
            aria-label={
              hasLoadedDisruptions
                ? `Afficher les perturbations (${sortedDisruptions.length})`
                : 'Afficher les perturbations'
            }
            aria-expanded={isDisruptionsOpen}
            title="Afficher les perturbations"
            onClick={() => {
              onDisruptionsOpen?.();
              setIsDisruptionsOpen(true);
            }}
          >
            <Warning size={22} weight="fill" aria-hidden="true" />
            {hasLoadedDisruptions ? (
              <span>{sortedDisruptions.length}</span>
            ) : null}
          </button>
        </div>

        <div className="route-fields">
          <PlaceSearchField
            id={fromId}
            label="Départ"
            placeholder="Partir de..."
            selectedPlace={fromPlace}
            excludedRecentPlace={toPlace}
            syncKey={swapVersion}
            syncedQuery={fromPlace?.label || ''}
            showRecentSearches={false}
            recentPlaces={recentPlaces}
            inputRef={fromInputRef}
            onPlaceChange={setFromPlace}
            onPlaceSelect={handleFromPlaceSelect}
            onSearchPlaces={onSearchPlaces}
            onSuggestionsChange={handleSuggestionsChange}
            onRecentPlacesChange={refreshRecentPlaces}
            onFieldFocus={() => setFocusedRouteField('from')}
            onFieldBlur={() => clearFocusedRouteField('from')}
            onQueryChange={handleFromQueryChange}
            preferredPlace={null}
          />
          <button
            className="route-fields__swap"
            type="button"
            aria-label="Inverser le départ et l'arrivée"
            onClick={handleSwapPlaces}
          >
            <ArrowsDownUp size={22} weight="regular" aria-hidden="true" />
          </button>
          <PlaceSearchField
            id={toId}
            label="Arrivée"
            placeholder="Aller à..."
            selectedPlace={toPlace}
            excludedRecentPlace={fromPlace}
            syncKey={swapVersion}
            syncedQuery={toPlace?.label || ''}
            showRecentSearches={false}
            recentPlaces={recentPlaces}
            inputRef={toInputRef}
            onPlaceChange={setToPlace}
            onSearchPlaces={onSearchPlaces}
            onSuggestionsChange={handleSuggestionsChange}
            onRecentPlacesChange={refreshRecentPlaces}
            onFieldFocus={() => setFocusedRouteField('to')}
            onFieldBlur={() => clearFocusedRouteField('to')}
            onQueryChange={handleToQueryChange}
            preferredPlace={destinationSuggestion}
          />
        </div>
        {hasVisibleRouteResults ? (
          <div className="route-options" aria-label="Options d'itinéraires">
            <div className="route-option-field">
              <label
                className="route-option-field__label"
                htmlFor="route-sort-select"
              >
                Tri
              </label>
              <select
                id="route-sort-select"
                className="route-option-field__select"
                value={routeSortMode}
                onChange={(event) => handleRouteSortChange(event.target.value)}
              >
                <option value={ROUTE_SORT_MODES.co2}>CO2</option>
                <option value={ROUTE_SORT_MODES.time}>Temps</option>
              </select>
            </div>
            <div className="route-option-field">
              <label
                className="route-option-field__label"
                htmlFor="route-accessibility-select"
              >
                Accès
              </label>
              <select
                id="route-accessibility-select"
                className="route-option-field__select"
                value={routeAccessibilityMode}
                onChange={(event) =>
                  handleRouteAccessibilityChange(event.target.value)
                }
              >
                <option value={ROUTE_ACCESSIBILITY_MODES.standard}>Tous</option>
                <option value={ROUTE_ACCESSIBILITY_MODES.wheelchair}>
                  PMR
                </option>
              </select>
            </div>
          </div>
        ) : null}
        {shouldShowPreferences ? (
          <RoutePreferenceMenu
            activeSuggestions={destinationActiveSuggestions}
            currentUser={currentUser}
            excludedPlaces={[fromPlace, toPlace]}
            isContentVisible={shouldShowPreferenceContent}
            recentPlaces={recentPlaces}
            onRecentPlacesChange={refreshRecentPlaces}
            PlaceSearchField={PlaceSearchField}
            PlaceSuggestions={PlaceSuggestions}
            preferredPlace={preferencePreferredPlace}
            onLoginClick={onLoginClick}
            onPlaceSelect={handlePreferencePlaceSelect}
            onPreferenceChange={() => setActiveSuggestions(null)}
            onSearchPlaces={onSearchPlaces}
            areSuggestionStatesEqual={areSuggestionStatesEqual}
          />
        ) : null}

        {message ? (
          <div
            className="route-planner__message"
            role="status"
            aria-live="polite"
          >
            {message}
          </div>
        ) : null}
      </form>

      {sortedJourneys.length > 0 ? (
        <div
          className="route-results"
          aria-label={`${sortedJourneys.length} itinéraire${
            sortedJourneys.length > 1 ? 's' : ''
          } proposé${sortedJourneys.length > 1 ? 's' : ''}`}
        >
          {sortedJourneys.map((journey, index) => {
            const isAccessibilityDisabled =
              isWheelchairAccessibilityEnabled &&
              isWheelchairDisabledJourneyProfile(journey.profile);
            const journeyLabel = getDominantLabel(journey.profile);

            return (
              <button
                className="route-result"
                data-active={journey === selectedJourney}
                data-accessibility-disabled={isAccessibilityDisabled}
                data-profile={journey.profile}
                key={`${journey.id}-${index}`}
                type="button"
                disabled={isAccessibilityDisabled}
                aria-label={`${journeyLabel}, durée ${formatDuration(
                  journey.duration
                )}${
                  isAccessibilityDisabled
                    ? ', indisponible en mode handicap'
                    : ''
                }`}
                title={
                  isAccessibilityDisabled
                    ? 'Indisponible en mode handicap'
                    : undefined
                }
                onClick={() => onJourneySelect(journey)}
              >
                <span className="route-result__top">
                  <JourneySequence
                    sections={journey.sections}
                    useWheelchairWalkIcon={isWheelchairAccessibilityEnabled}
                  />
                  <strong>{formatDuration(journey.duration)}</strong>
                </span>
                <span className="route-result__meta">
                  <span>{journeyLabel}</span>
                  <CarbonFootprintBadge
                    carbonFootprint={journey.carbonFootprint}
                  />
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
      <LegalFooter
        className="route-planner__legal-footer"
        onLegalLinkClick={onLegalLinkClick}
      />
    </aside>
  );
}
