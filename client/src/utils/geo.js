export function isValidCoordinatePair(coordinates) {
  return (
    Array.isArray(coordinates) &&
    coordinates.length >= 2 &&
    Number.isFinite(Number(coordinates[0])) &&
    Number.isFinite(Number(coordinates[1]))
  );
}

export function toCoordinatePair(coordinates) {
  if (!isValidCoordinatePair(coordinates)) {
    return null;
  }

  return [Number(coordinates[0]), Number(coordinates[1])];
}

export function getDistanceBetweenCoordinatesInMeters(
  fromCoordinates,
  toCoordinates
) {
  if (
    !isValidCoordinatePair(fromCoordinates) ||
    !isValidCoordinatePair(toCoordinates)
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const [fromLon, fromLat] = fromCoordinates.map(Number);
  const [toLon, toLat] = toCoordinates.map(Number);
  const earthRadiusMeters = 6371000;
  const latDelta = ((toLat - fromLat) * Math.PI) / 180;
  const lonDelta = ((toLon - fromLon) * Math.PI) / 180;
  const fromLatRadians = (fromLat * Math.PI) / 180;
  const toLatRadians = (toLat * Math.PI) / 180;
  const haversineValue =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(fromLatRadians) *
      Math.cos(toLatRadians) *
      Math.sin(lonDelta / 2) ** 2;

  return (
    2 *
    earthRadiusMeters *
    Math.atan2(Math.sqrt(haversineValue), Math.sqrt(1 - haversineValue))
  );
}

export function getPlanarPoint(coordinates, referenceLatitude) {
  const [longitude, latitude] = coordinates;
  const latitudeScale = 111320;
  const longitudeScale = 111320 * Math.cos((referenceLatitude * Math.PI) / 180);

  return {
    x: longitude * longitudeScale,
    y: latitude * latitudeScale,
  };
}

export function getDistanceFromPointToSegmentInMeters(
  pointCoordinates,
  segmentStartCoordinates,
  segmentEndCoordinates
) {
  if (
    !isValidCoordinatePair(pointCoordinates) ||
    !isValidCoordinatePair(segmentStartCoordinates) ||
    !isValidCoordinatePair(segmentEndCoordinates)
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const [pointLon, pointLat] = pointCoordinates.map(Number);
  const [startLon, startLat] = segmentStartCoordinates.map(Number);
  const [endLon, endLat] = segmentEndCoordinates.map(Number);
  const referenceLatitude = (pointLat + startLat + endLat) / 3;
  const point = getPlanarPoint([pointLon, pointLat], referenceLatitude);
  const start = getPlanarPoint([startLon, startLat], referenceLatitude);
  const end = getPlanarPoint([endLon, endLat], referenceLatitude);
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const segmentLengthSquared = deltaX ** 2 + deltaY ** 2;

  if (segmentLengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const projectionRatio = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) /
        segmentLengthSquared
    )
  );
  const projectedX = start.x + deltaX * projectionRatio;
  const projectedY = start.y + deltaY * projectionRatio;

  return Math.hypot(point.x - projectedX, point.y - projectedY);
}

export function getDistanceToSectionInMeters(userCoordinates, section) {
  const geometry = Array.isArray(section?.geometry) ? section.geometry : [];

  if (geometry.length >= 2) {
    let shortestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < geometry.length - 1; index += 1) {
      const segmentDistance = getDistanceFromPointToSegmentInMeters(
        userCoordinates,
        geometry[index],
        geometry[index + 1]
      );

      if (segmentDistance < shortestDistance) {
        shortestDistance = segmentDistance;
      }
    }

    return shortestDistance;
  }

  if (isValidCoordinatePair(geometry[0])) {
    return getDistanceBetweenCoordinatesInMeters(userCoordinates, geometry[0]);
  }

  return Number.POSITIVE_INFINITY;
}
