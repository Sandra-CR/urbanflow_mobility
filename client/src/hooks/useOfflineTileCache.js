import { useEffect, useRef } from 'react';
import { preloadMapTiles } from '../utils/offlineMapTiles';

export function useOfflineTileCache(options) {
  const hasStartedTileCacheRef = useRef(false);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof navigator === 'undefined' ||
      hasStartedTileCacheRef.current
    ) {
      return undefined;
    }

    async function cacheTilesForOfflineUse() {
      if (!navigator.onLine) {
        return;
      }

      hasStartedTileCacheRef.current = true;

      try {
        await preloadMapTiles(options);
      } catch {
        hasStartedTileCacheRef.current = false;
      }
    }

    cacheTilesForOfflineUse();
    window.addEventListener('online', cacheTilesForOfflineUse);

    return () => {
      window.removeEventListener('online', cacheTilesForOfflineUse);
    };
  }, [options]);
}
