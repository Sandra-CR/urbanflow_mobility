import { X } from '@phosphor-icons/react';
import './OfflineCacheToast.css';

function OfflineCacheToast({
  cacheMessage,
  cacheProgress,
  isCachingTiles,
  onDismiss,
}) {
  if (!cacheProgress && !cacheMessage) {
    return null;
  }

  return (
    <section className="offline-cache-toast" aria-live="polite">
      <div className="offline-cache-toast__header">
        <div className="offline-cache-toast__content">
          {cacheProgress ? (
            <div className="offline-cache-progress">
              <span
                style={{
                  width: `${cacheProgress.percent}%`,
                }}
              />
            </div>
          ) : null}
          <p>
            {isCachingTiles
              ? `${cacheProgress?.completed || 0}/${cacheProgress?.total || 0} tuiles (${cacheProgress?.percent || 0}%)`
              : cacheMessage}
          </p>
        </div>
        <button
          className="offline-cache-toast__close"
          type="button"
          aria-label="Fermer la notification"
          onClick={onDismiss}
        >
          <X size={16} weight="bold" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

export default OfflineCacheToast;
