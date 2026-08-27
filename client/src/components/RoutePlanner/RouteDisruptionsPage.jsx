import { ArrowLeft, Info, X } from '@phosphor-icons/react';
import TransportLineBadge from './TransportLineBadge';
import {
  formatDisruptionGroupTitle,
  getDisruptionGroups,
  getDisruptionLineLabel,
  getDisruptionLineTitle,
  getDisruptionMessages,
} from './routeDisruptionsUtils';
import './RouteDisruptionsPage.css';

function RouteDisruptionBadge({ disruption }) {
  return (
    <span className="route-disruptions__badge">
      <TransportLineBadge line={disruption.line} />
      <span className="route-disruptions__status" aria-hidden="true">
        {disruption.severityRank === 0 ? (
          <X size={10} weight="bold" />
        ) : (
          <Info size={11} weight="bold" />
        )}
      </span>
    </span>
  );
}

function RouteDisruptionCard({ disruption, onSelect }) {
  const messages = getDisruptionMessages(disruption);

  return (
    <button
      className="route-disruptions__card"
      type="button"
      data-severity={
        disruption.severityRank === 0 ? 'interruption' : 'perturbation'
      }
      aria-label={`${getDisruptionLineLabel(disruption)} - ${
        disruption.severityRank === 0 ? 'interruption' : 'perturbation'
      }`}
      title={`${getDisruptionLineLabel(disruption)} - ${disruption.title}`}
      onClick={() => onSelect(disruption)}
    >
      <span className="route-disruptions__card-header">
        <RouteDisruptionBadge disruption={disruption} />
        <strong>{getDisruptionLineTitle(disruption)}</strong>
      </span>
      <span className="route-disruptions__messages">
        {messages.map((message, index) => (
          <span key={`${message}-${index}`}>{message}</span>
        ))}
      </span>
    </button>
  );
}

function RouteDisruptionGroup({
  disruptions,
  titleSingular,
  titlePlural,
  onSelect,
}) {
  if (disruptions.length === 0) {
    return null;
  }

  return (
    <section className="route-disruptions__group">
      <h2>
        {formatDisruptionGroupTitle(
          disruptions.length,
          titleSingular,
          titlePlural
        )}
      </h2>
      <div className="route-disruptions__grid">
        {disruptions.map((disruption, index) => (
          <RouteDisruptionCard
            key={
              disruption.id || disruption.uri || `${disruption.title}-${index}`
            }
            disruption={disruption}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

function RouteDisruptionDetails({ disruption }) {
  if (!disruption) {
    return null;
  }

  const details = disruption.disruptions?.length
    ? disruption.disruptions
    : [disruption];

  return (
    <section className="route-disruptions__details">
      <ol className="route-disruptions__details-list">
        {details.map((detail, index) => (
          <li key={detail.id || detail.uri || `${detail.message}-${index}`}>
            <strong>
              {disruption.severityRank === 0 ? 'Interruption' : 'Perturbation'}
            </strong>
            <p>{detail.message || detail.title || disruption.title}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function RouteDisruptionsPage({
  disruptions,
  selectedDisruption,
  onBack,
  onSelect,
}) {
  const groups = getDisruptionGroups(disruptions);
  const handleBack = selectedDisruption ? () => onSelect(null) : onBack;

  return (
    <div className="route-disruptions" aria-label="Perturbations">
      <header className="route-disruptions__header">
        <button
          className="route-detail__back"
          type="button"
          onClick={handleBack}
        >
          <ArrowLeft size={16} weight="bold" aria-hidden="true" />
          <span>Retour</span>
        </button>
        {selectedDisruption ? (
          <span
            className="route-disruptions__header-badge"
            data-severity={
              selectedDisruption.severityRank === 0
                ? 'interruption'
                : 'perturbation'
            }
          >
            <RouteDisruptionBadge disruption={selectedDisruption} />
          </span>
        ) : null}
      </header>

      {selectedDisruption ? (
        <RouteDisruptionDetails disruption={selectedDisruption} />
      ) : disruptions.length > 0 ? (
        <>
          <RouteDisruptionGroup
            disruptions={groups.interruptions}
            titleSingular="Interruption"
            titlePlural="Interruptions"
            onSelect={onSelect}
          />
          <RouteDisruptionGroup
            disruptions={groups.perturbations}
            titleSingular="perturbation"
            titlePlural="perturbations"
            onSelect={onSelect}
          />
        </>
      ) : (
        <p>Aucune perturbation metro, RER, ligne rapide ou tram.</p>
      )}
    </div>
  );
}
