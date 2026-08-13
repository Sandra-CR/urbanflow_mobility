const DB_NAME = 'urbanflow_mobility';
const DB_VERSION = 1;
const STORE_NAME = 'recent_place_searches';
const MAX_RECENT_SEARCHES = 10;

function openRecentPlacesDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB indisponible.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: 'label',
        });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function withRecentPlacesStore(mode, callback) {
  return openRecentPlacesDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const result = callback(store);

        transaction.oncomplete = () => {
          db.close();
          resolve(result);
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      })
  );
}

export async function saveRecentPlaceSearch(place) {
  const label = String(place?.label || '').trim();

  if (!label) {
    return;
  }

  await withRecentPlacesStore('readwrite', (store) => {
    store.put({
      id: place.id || null,
      label,
      type: place.type || 'recent',
      city: place.city || null,
      lines: place.lines || [],
      coordinates: place.coordinates || null,
      searchedAt: Date.now(),
    });
  });
}

export async function getRecentPlaceSearches() {
  return withRecentPlacesStore('readonly', (store) => {
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(
          request.result
            .sort((firstPlace, secondPlace) => {
              return secondPlace.searchedAt - firstPlace.searchedAt;
            })
            .slice(0, MAX_RECENT_SEARCHES)
        );
      };
      request.onerror = () => reject(request.error);
    });
  }).catch(() => []);
}
