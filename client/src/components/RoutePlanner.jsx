import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  ArrowsDownUp,
  Bus,
  Leaf,
  MapPin,
  PersonSimpleBike,
  PersonSimpleWalk,
  Subway,
  TrainSimple,
  Tram,
} from '@phosphor-icons/react';
import urbanflowLogo from '../assets/brand/urbanflow-logo.svg';
import './RoutePlanner.css';

function normalizeMode(mode = '') {
  return String(mode || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getPersonalModeIcon(mode = '') {
  const normalizedMode = normalizeMode(mode);

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

function getPlaceIconType(place) {
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

function TransportLineBadge({ line }) {
  const lineMode = normalizeMode(line.commercialMode || line.physicalMode);
  const style = {
    '--route-line-color': line.color || '#64748b',
    '--route-line-text': line.textColor || '#ffffff',
  };
  const label = line.code || line.label || line.commercialMode;

  return (
    <span
      className="route-line-badge"
      data-mode={lineMode}
      data-transport="true"
      style={style}
      title={line.label || label}
    >
      <span>{label}</span>
    </span>
  );
}

function PlaceSuggestionDetails({ place }) {
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

function PlaceSearchField({
  id,
  label,
  placeholder,
  selectedPlace,
  syncKey,
  syncedQuery,
  inputRef,
  onPlaceChange,
  onSearchPlaces,
  onSuggestionsChange,
  onPlaceSelect,
}) {
  const [query, setQuery] = useState(selectedPlace?.label || '');
  const [places, setPlaces] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const latestQueryRef = useRef('');
  const syncedQueryRef = useRef(syncedQuery);

  useEffect(() => {
    syncedQueryRef.current = syncedQuery;
  }, [syncedQuery]);

  useEffect(() => {
    setQuery(syncedQueryRef.current);
    setPlaces([]);
    setIsOpen(false);
    setSearchMessage('');
  }, [syncKey]);

  useEffect(() => {
    const safeQuery = query.trim();
    latestQueryRef.current = safeQuery;

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
  }, [onSearchPlaces, query, selectedPlace]);

  const handleSelect = useCallback(
    (place) => {
      setQuery(place.label);
      setPlaces([]);
      setIsOpen(false);
      setSearchMessage('');
      onPlaceChange(place);
      onPlaceSelect?.(place);
    },
    [onPlaceChange, onPlaceSelect]
  );

  useEffect(() => {
    if (isOpen && (places.length > 0 || searchMessage)) {
      onSuggestionsChange({
        fieldId: id,
        places,
        message: searchMessage,
        onSelect: handleSelect,
      });
      return;
    }

    onSuggestionsChange((currentSuggestions) =>
      currentSuggestions?.fieldId === id ? null : currentSuggestions
    );
  }, [handleSelect, id, isOpen, onSuggestionsChange, places, searchMessage]);

  return (
    <label className="route-field" htmlFor={id}>
      <div className="route-field__input">
        <span className="route-field__tag">{label}</span>
        <input
          id={id}
          ref={inputRef}
          type="search"
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          onBlur={() => {
            window.setTimeout(() => setIsOpen(false), 120);
          }}
          onChange={(event) => {
            const nextQuery = event.target.value;

            setQuery(nextQuery);
            onPlaceChange(null);
            setSearchMessage('');

            if (nextQuery.trim().length < 2) {
              setPlaces([]);
              setSearchMessage('');
            }

            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(places.length > 0 || Boolean(searchMessage))}
        />
        {isSearching ? (
          <span className="route-field__loader" aria-label="Recherche" />
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
    <div className="route-suggestions" role="listbox">
      {suggestions.places.map((place) => (
        <button
          className="route-suggestion"
          key={place.id}
          type="button"
          role="option"
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

function JourneySectionBadge({ section }) {
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
        <PersonSimpleWalk size={24} weight="regular" aria-hidden="true" />
      ) : null}
      {label ? <span>{label}</span> : null}
    </span>
  );
}

function JourneySequence({ sections }) {
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
          <JourneySectionBadge section={section} />
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
  journeys = [],
  selectedJourneyId,
  isLoading,
  message,
  onJourneySelect,
  onPlan,
  onSearchPlaces,
}) {
  const fromId = useId();
  const toId = useId();
  const fromInputRef = useRef(null);
  const toInputRef = useRef(null);
  const latestPlanKeyRef = useRef('');
  const [fromPlace, setFromPlace] = useState(null);
  const [toPlace, setToPlace] = useState(null);
  const [swapVersion, setSwapVersion] = useState(0);
  const [activeSuggestions, setActiveSuggestions] = useState(null);

  function handleSubmit(event) {
    event.preventDefault();
  }

  useEffect(() => {
    fromInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!fromPlace?.id || !toPlace?.id || isLoading) {
      return;
    }

    const planKey = `${fromPlace.id}->${toPlace.id}`;

    if (latestPlanKeyRef.current === planKey) {
      return;
    }

    latestPlanKeyRef.current = planKey;
    onPlan({ from: fromPlace, to: toPlace });
  }, [fromPlace, isLoading, onPlan, toPlace]);

  function handleSwapPlaces() {
    const nextFromPlace = toPlace;
    const nextToPlace = fromPlace;

    setFromPlace(nextFromPlace);
    setToPlace(nextToPlace);
    setSwapVersion((version) => version + 1);
  }

  return (
    <aside className="route-planner" aria-label="Recherche d'itinéraire">
      <form className="route-planner__form" onSubmit={handleSubmit}>
        <div className="route-planner__header">
          <img src={urbanflowLogo} alt="UrbanFlow" />
        </div>

        <div className="route-fields">
          <PlaceSearchField
            id={fromId}
            label="Départ"
            placeholder="Partir de..."
            selectedPlace={fromPlace}
            syncKey={swapVersion}
            syncedQuery={fromPlace?.label || ''}
            inputRef={fromInputRef}
            onPlaceChange={setFromPlace}
            onPlaceSelect={() => {
              window.setTimeout(() => toInputRef.current?.focus(), 0);
            }}
            onSearchPlaces={onSearchPlaces}
            onSuggestionsChange={setActiveSuggestions}
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
            syncKey={swapVersion}
            syncedQuery={toPlace?.label || ''}
            inputRef={toInputRef}
            onPlaceChange={setToPlace}
            onSearchPlaces={onSearchPlaces}
            onSuggestionsChange={setActiveSuggestions}
          />
        </div>
        <div className="route-planner__divider" aria-hidden="true" />
        <PlaceSuggestions suggestions={activeSuggestions} />

        {message ? (
          <div className="route-planner__message" role="status">
            {message}
          </div>
        ) : null}
      </form>

      {journeys.length > 0 ? (
        <div className="route-results" aria-label="Itinéraires proposés">
          {journeys.map((journey, index) => (
            <button
              className="route-result"
              data-active={journey.id === selectedJourneyId}
              data-profile={journey.profile}
              key={`${journey.id}-${index}`}
              type="button"
              onClick={() => onJourneySelect(journey)}
            >
              <span className="route-result__top">
                <JourneySequence sections={journey.sections} />
                <strong>{formatDuration(journey.duration)}</strong>
              </span>
              <span className="route-result__meta">
                <span>{getDominantLabel(journey.profile)}</span>
                <CarbonFootprintBadge
                  carbonFootprint={journey.carbonFootprint}
                />
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </aside>
  );
}
