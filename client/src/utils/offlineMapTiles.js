export const TILE_CACHE_NAME = 'carto-map-tiles';

export const TILE_URLS = {
  light: 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
  dark: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
};

function lngLatToTile(lng, lat, zoom) {
  const latRad = (lat * Math.PI) / 180;
  const scale = 2 ** zoom;

  return {
    x: Math.floor(((lng + 180) / 360) * scale),
    y: Math.floor(
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
        scale
    ),
  };
}

function tileUrl(template, x, y, z) {
  return template
    .replace('{x}', String(x))
    .replace('{y}', String(y))
    .replace('{z}', String(z));
}

function getTileUrlsForBounds({
  bounds,
  minZoom,
  maxZoom,
  includeDarkMode = true,
}) {
  const themes = includeDarkMode ? ['light', 'dark'] : ['light'];
  const urls = [];

  for (const theme of themes) {
    for (let z = minZoom; z <= maxZoom; z += 1) {
      const northWest = lngLatToTile(bounds.west, bounds.north, z);
      const southEast = lngLatToTile(bounds.east, bounds.south, z);

      for (let x = northWest.x; x <= southEast.x; x += 1) {
        for (let y = northWest.y; y <= southEast.y; y += 1) {
          urls.push(tileUrl(TILE_URLS[theme], x, y, z));
        }
      }
    }
  }

  return urls;
}

async function runWithConcurrency(items, concurrency, task) {
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      await task(items[currentIndex]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker)
  );
}

export async function preloadMapTiles({
  bounds,
  minZoom = 11,
  maxZoom = 15,
  includeDarkMode = true,
  onProgress,
}) {
  if (!('caches' in window)) {
    throw new Error('Cache API indisponible dans ce navigateur.');
  }

  const urls = getTileUrlsForBounds({
    bounds,
    minZoom,
    maxZoom,
    includeDarkMode,
  });
  const total = urls.length;

  onProgress?.({
    completed: 0,
    total,
    percent: 0,
  });

  const cache = await caches.open(TILE_CACHE_NAME);
  let completed = 0;

  await runWithConcurrency(urls, 8, async (url) => {
    const cachedResponse = await cache.match(url);

    if (!cachedResponse) {
      const response = await fetch(url, {
        cache: 'reload',
        mode: 'no-cors',
      });
      await cache.put(url, response);
    }

    completed += 1;
    onProgress?.({
      completed,
      total,
      percent: total === 0 ? 100 : Math.round((completed / total) * 100),
    });
  });

  return {
    total,
  };
}
