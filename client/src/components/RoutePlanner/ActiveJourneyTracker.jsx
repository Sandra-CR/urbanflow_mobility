import { useMemo } from 'react';
import {
  CaretLeft,
  CaretRight,
  HourglassMedium,
  PersonSimpleBike,
  PersonSimpleWalk,
  Steps,
} from '@phosphor-icons/react';
import './ActiveJourneyTracker.css';

function isValidCoordinatePair(coordinates) {
  return (
    Array.isArray(coordinates) &&
    coordinates.length >= 2 &&
    Number.isFinite(Number(coordinates[0])) &&
    Number.isFinite(Number(coordinates[1]))
  );
}

function toCoordinatePair(coordinates) {
  if (!isValidCoordinatePair(coordinates)) {
    return null;
  }

  return [Number(coordinates[0]), Number(coordinates[1])];
}

function getPlanarPoint(coordinates, referenceLatitude) {
  const [longitude, latitude] = coordinates;
  const latitudeScale = 111320;
  const longitudeScale =
    111320 * Math.cos((referenceLatitude * Math.PI) / 180);

  return {
    x: longitude * longitudeScale,
    y: latitude * latitudeScale,
  };
}

function getStepTravelProgress(step, userLocation) {
  if (!isValidCoordinatePair(userLocation) || !Array.isArray(step?.geometry)) {
    return null;
  }

  const routeCoordinates = step.geometry
    .map(toCoordinatePair)
    .filter(Boolean);

  if (routeCoordinates.length < 2) {
    return null;
  }

  let totalLength = 0;
  const segmentLengths = [];

  for (let index = 0; index < routeCoordinates.length - 1; index += 1) {
    const start = routeCoordinates[index];
    const end = routeCoordinates[index + 1];
    const referenceLatitude = (start[1] + end[1]) / 2;
    const startPoint = getPlanarPoint(start, referenceLatitude);
    const endPoint = getPlanarPoint(end, referenceLatitude);
    const segmentLength = Math.hypot(
      endPoint.x - startPoint.x,
      endPoint.y - startPoint.y
    );

    segmentLengths.push(segmentLength);
    totalLength += segmentLength;
  }

  if (totalLength === 0) {
    return null;
  }

  let traversedLength = 0;
  let closestProjectionLength = 0;
  let closestDistance = Number.POSITIVE_INFINITY;
  const normalizedUserLocation = toCoordinatePair(userLocation);

  for (let index = 0; index < routeCoordinates.length - 1; index += 1) {
    const start = routeCoordinates[index];
    const end = routeCoordinates[index + 1];
    const referenceLatitude =
      (start[1] + end[1] + normalizedUserLocation[1]) / 3;
    const userPoint = getPlanarPoint(normalizedUserLocation, referenceLatitude);
    const startPoint = getPlanarPoint(start, referenceLatitude);
    const endPoint = getPlanarPoint(end, referenceLatitude);
    const deltaX = endPoint.x - startPoint.x;
    const deltaY = endPoint.y - startPoint.y;
    const segmentLengthSquared = deltaX ** 2 + deltaY ** 2;

    if (segmentLengthSquared === 0) {
      traversedLength += segmentLengths[index];
      continue;
    }

    const projectionRatio = Math.max(
      0,
      Math.min(
        1,
        ((userPoint.x - startPoint.x) * deltaX +
          (userPoint.y - startPoint.y) * deltaY) /
          segmentLengthSquared
      )
    );
    const projectedX = startPoint.x + deltaX * projectionRatio;
    const projectedY = startPoint.y + deltaY * projectionRatio;
    const distanceToSegment = Math.hypot(
      userPoint.x - projectedX,
      userPoint.y - projectedY
    );

    if (distanceToSegment < closestDistance) {
      closestDistance = distanceToSegment;
      closestProjectionLength =
        traversedLength + segmentLengths[index] * projectionRatio;
    }

    traversedLength += segmentLengths[index];
  }

  return Math.max(0, Math.min(1, closestProjectionLength / totalLength));
}

function normalizeMode(mode = '') {
  return String(mode || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function isPlatformChangeSection(section) {
  return normalizeMode(section?.mode) === 'platform_change';
}

function isWaitingSection(section) {
  return normalizeMode(section?.mode).includes('waiting');
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

function JourneyStepBadge({ step }) {
  const isTransport = step?.type === 'public_transport';
  const icon = isTransport ? null : getPersonalModeIcon(step?.mode);
  const lineMode = normalizeMode(step?.line?.commercialMode || step?.mode);
  const label = isTransport
    ? step?.line?.code || step?.line?.label || step?.mode
    : step?.mode === 'bike'
      ? 'Velo'
      : 'Marche';
  const style = {
    '--route-line-color': step?.color || '#64748b',
    '--route-line-text': step?.textColor || '#ffffff',
  };

  return (
    <span
      className="route-line-badge active-journey-tracker__badge"
      data-mode={lineMode}
      data-transport={isTransport}
      style={style}
      title={step?.label}
    >
      {icon === 'bike' ? (
        <PersonSimpleBike size={24} weight="regular" aria-hidden="true" />
      ) : null}
      {icon === 'walk' ? (
        <PersonSimpleWalk size={24} weight="regular" aria-hidden="true" />
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

function getStepLabel(step) {
  if (step?.type === 'public_transport') {
    return step?.label || step?.line?.label || step?.line?.code || 'Transport';
  }

  const mode = normalizeMode(step?.mode);

  if (mode.includes('bike') || mode.includes('velo')) {
    return 'Velo';
  }

  return 'Marche';
}

function getStepDirection(step) {
  return step?.to || step?.from || 'Etape suivante';
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

function getIntermediateStops(step) {
  if (!Array.isArray(step?.stops) || step.stops.length <= 2) {
    return [];
  }

  return step.stops.slice(1, -1);
}

function getStepTimelineStops(step) {
  const stops = [];

  if (step?.from) {
    stops.push({
      id: `from-${step.from}`,
      label: step.from,
      kind: 'start',
    });
  }

  getIntermediateStops(step).forEach((stop, index) => {
    stops.push({
      id: `mid-${stop}-${index}`,
      label: stop,
      kind: 'intermediate',
    });
  });

  if (step?.to) {
    stops.push({
      id: `to-${step.to}`,
      label: step.to,
      kind: 'end',
    });
  }

  return stops;
}

function StepDetails({
  step,
  userLocation,
  shouldShowProgressMarker = false,
}) {
  const startTime = formatJourneyTime(step?.departureDateTime);
  const endTime = formatJourneyTime(step?.arrivalDateTime);
  const timelineStops = getStepTimelineStops(step);
  const hasStops = timelineStops.length > 0;
  const travelProgress = getStepTravelProgress(step, userLocation);
  const timelineStyle = {
    '--active-step-color': step?.color || 'var(--color-primary)',
    '--active-step-progress': travelProgress ?? 0,
  };

  return (
    <div className="active-journey-tracker__details">
      {hasStops ? (
        <div className="active-journey-tracker__timeline">
          {/* {startTime ? (
            <div className="active-journey-tracker__time active-journey-tracker__time--start">
              {startTime}
            </div>
          ) : null} */}

          <ol className="active-journey-tracker__stops" style={timelineStyle}>
            {shouldShowProgressMarker && travelProgress !== null ? (
              <span
                className="active-journey-tracker__progress-marker"
                aria-label="Votre progression sur cette etape"
              />
            ) : null}
            {timelineStops.map((stop, index) => (
              <li
                key={stop.id}
                className="active-journey-tracker__stop"
                data-kind={stop.kind}
                data-last={index === timelineStops.length - 1}
              >
                <div
                  className="active-journey-tracker__stop-rail"
                  aria-hidden="true"
                >
                  <span className="active-journey-tracker__stop-dot" />
                  {index < timelineStops.length - 1 ? (
                    <span className="active-journey-tracker__stop-line" />
                  ) : null}
                </div>
                <div className="active-journey-tracker__stop-copy">
                  <span>{stop.label}</span>
                </div>
              </li>
            ))}
          </ol>

          {/* {endTime ? (
            <div className="active-journey-tracker__time active-journey-tracker__time--end">
              {endTime}
            </div>
          ) : null} */}
        </div>
      ) : null}
    </div>
  );
}

export default function ActiveJourneyTracker({
  journey,
  currentTrackedStepIndex = 0,
  currentStepIndex = 0,
  userLocation = null,
  onStepChange,
}) {
  const steps = useMemo(
    () =>
      (journey?.sections || []).filter(
        (section) =>
          !isPlatformChangeSection(section) && !isWaitingSection(section)
      ),
    [journey]
  );
  if (steps.length === 0) {
    return null;
  }

  const safeStepIndex = Math.min(currentStepIndex, steps.length - 1);
  const activeStep = steps[safeStepIndex];
  const canGoPrevious = safeStepIndex > 0;
  const canGoNext = safeStepIndex < steps.length - 1;

  return (
    <div className="active-journey-tracker" aria-label="Suivi du trajet">
      <section className="active-journey-tracker__card">
        <div className="active-journey-tracker__step">
          <JourneyStepBadge step={activeStep} />
          <div className="active-journey-tracker__copy">
            <strong>{getStepLabel(activeStep)}</strong>
            <span>{getStepDirection(activeStep)}</span>
          </div>
        </div>

        <div className="active-journey-tracker__controls">
          <button
            className="active-journey-tracker__nav"
            type="button"
            onClick={() => onStepChange?.(Math.max(0, safeStepIndex - 1))}
            disabled={!canGoPrevious}
            aria-label="Etape precedente"
          >
            <CaretLeft size={20} weight="bold" aria-hidden="true" />
          </button>

          <div
            className="active-journey-tracker__bullets"
            aria-label={`Etape ${safeStepIndex + 1} sur ${steps.length}`}
          >
            {steps.map((step, index) => (
              <span
                key={step.id || `${step.label || step.mode}-${index}`}
                className="active-journey-tracker__bullet"
                data-active={index === safeStepIndex}
              />
            ))}
          </div>

          <button
            className="active-journey-tracker__nav"
            type="button"
            onClick={() =>
              onStepChange?.(Math.min(steps.length - 1, safeStepIndex + 1))
            }
            disabled={!canGoNext}
            aria-label="Etape suivante"
          >
            <CaretRight size={20} weight="bold" aria-hidden="true" />
          </button>
        </div>

        <StepDetails
          step={activeStep}
          userLocation={userLocation}
          shouldShowProgressMarker={safeStepIndex === currentTrackedStepIndex}
        />
      </section>
    </div>
  );
}
