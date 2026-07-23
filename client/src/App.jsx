import { useState } from 'react'
import InteractiveMap from './components/InteractiveMap'
import { preloadMapTiles } from './utils/offlineMapTiles'
import './App.css'

const TEST_CENTER = [2.3522, 48.8566]
const PARIS_OFFLINE_BOUNDS = {
  west: 2.24,
  south: 48.81,
  east: 2.48,
  north: 48.91,
}

const TEST_STATIONS = [
  {
    id: 'republique-bike',
    name: 'Station Republique',
    type: 'bike',
    coordinates: [2.363, 48.867],
  },
  {
    id: 'hotel-ville-bus',
    name: 'Arrêt Hôtel de Ville',
    type: 'bus',
    coordinates: [2.3522, 48.8566],
  },
  {
    id: 'chatelet-tram',
    name: 'Pole Chatelet',
    type: 'tram',
    coordinates: [2.347, 48.8586],
  },
  {
    id: 'bastille-charge',
    name: 'Recharge Bastille',
    type: 'charge',
    coordinates: [2.369, 48.853],
  },
]

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [cacheProgress, setCacheProgress] = useState(null)
  const [isCachingTiles, setIsCachingTiles] = useState(false)
  const [cacheMessage, setCacheMessage] = useState('')

  async function handlePreloadOfflineMap() {
    setIsCachingTiles(true)
    setCacheMessage('')
    setCacheProgress({ completed: 0, total: 0, percent: 0 })

    try {
      const result = await preloadMapTiles({
        bounds: PARIS_OFFLINE_BOUNDS,
        minZoom: 11,
        maxZoom: 15,
        includeDarkMode: true,
        onProgress: setCacheProgress,
      })

      setCacheMessage(`${result.total} tuiles prêtes pour le hors ligne.`)
    } catch (error) {
      setCacheMessage(error.message)
    } finally {
      setIsCachingTiles(false)
    }
  }

  return (
    <main className="map-test-page">
      {(cacheProgress || cacheMessage) && (
        <section className="offline-cache-toast" aria-live="polite">
          {cacheProgress && (
            <div className="offline-cache-progress">
              <span
                style={{
                  width: `${cacheProgress.percent}%`,
                }}
              />
            </div>
          )}
          <p>
            {isCachingTiles
              ? `${cacheProgress?.completed || 0}/${cacheProgress?.total || 0} tuiles (${cacheProgress?.percent || 0}%)`
              : cacheMessage}
          </p>
        </section>
      )}

      <div className="map-actions" aria-label="Commandes de carte">
        <button
          className="map-icon-button"
          type="button"
          aria-label={isDarkMode ? 'Activer le mode clair' : 'Activer le mode sombre'}
          title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
          aria-pressed={isDarkMode}
          onClick={() => setIsDarkMode((currentValue) => !currentValue)}
        >
          {isDarkMode ? <SunIcon /> : <MoonIcon />}
        </button>
        <button
          className="map-icon-button"
          type="button"
          aria-label="Télécharger les tuiles pour le hors ligne"
          title="Télécharger les tuiles"
          disabled={isCachingTiles}
          onClick={handlePreloadOfflineMap}
        >
          <DownloadIcon />
        </button>
      </div>

      <section className="map-shell" aria-label="Carte des stations">
        <InteractiveMap
          center={TEST_CENTER}
          zoom={13}
          isDarkMode={isDarkMode}
          stations={TEST_STATIONS}
        />
      </section>
    </main>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.4 14.5A8.5 8.5 0 0 1 9.5 3.6 8.5 8.5 0 1 0 20.4 14.5Z" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v11" />
      <path d="m7 9 5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  )
}

export default App
