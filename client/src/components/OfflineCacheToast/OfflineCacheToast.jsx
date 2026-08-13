import './OfflineCacheToast.css';

function OfflineCacheToast({ cacheMessage, cacheProgress, isCachingTiles }) {
  if (!cacheProgress && !cacheMessage) {
    return null;
  }

  return (
    <section className="offline-cache-toast" aria-live="polite">
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
    </section>
  );
}

export default OfflineCacheToast;
