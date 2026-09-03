export function formatBikeCount(count) {
  const safeCount = Number(count);
  const bikeCount = Number.isFinite(safeCount) ? safeCount : 0;

  return `${bikeCount} ${bikeCount === 1 ? 'vÃ©lo' : 'vÃ©los'}`;
}

export function formatDockCount(count) {
  const safeCount = Number(count);
  const dockCount = Number.isFinite(safeCount) ? safeCount : 0;

  return `${dockCount} ${dockCount === 1 ? 'place' : 'places'}`;
}

export function formatStationDistance(distance) {
  const safeDistance = Number(distance);

  if (!Number.isFinite(safeDistance)) {
    return null;
  }

  if (safeDistance < 1000) {
    return `${Math.round(safeDistance)} m`;
  }

  return `${(safeDistance / 1000).toFixed(1)} km`;
}
