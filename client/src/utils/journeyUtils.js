import { isValidCoordinatePair } from './geo';
import { normalizeMode } from './text';

export function getJourneyStartCoordinates(journey) {
  if (isValidCoordinatePair(journey?.geometry?.[0])) {
    return journey.geometry[0];
  }

  const firstSectionWithGeometry = (journey?.sections || []).find((section) =>
    isValidCoordinatePair(section?.geometry?.[0])
  );

  return firstSectionWithGeometry?.geometry?.[0] || null;
}

export function getJourneyEndCoordinates(journey) {
  if (Array.isArray(journey?.geometry)) {
    const lastJourneyCoordinate = journey.geometry[journey.geometry.length - 1];

    if (isValidCoordinatePair(lastJourneyCoordinate)) {
      return lastJourneyCoordinate;
    }
  }

  const sections = journey?.sections || [];

  for (let index = sections.length - 1; index >= 0; index -= 1) {
    const geometry = sections[index]?.geometry;

    if (Array.isArray(geometry)) {
      const lastSectionCoordinate = geometry[geometry.length - 1];

      if (isValidCoordinatePair(lastSectionCoordinate)) {
        return lastSectionCoordinate;
      }
    }
  }

  return null;
}

export function getTrackableJourneySections(journey) {
  return (journey?.sections || []).filter((section) => {
    const mode = normalizeMode(section?.mode);

    return mode !== 'platform_change' && !mode.includes('waiting');
  });
}
