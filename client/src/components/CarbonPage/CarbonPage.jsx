import { useEffect, useMemo, useRef, useState } from 'react';
import { ChartBar, Leaf, Moon, Sun, Tree } from '@phosphor-icons/react';
import Chart from 'chart.js/auto';
import { getCompletedJourneys } from '../../utils/completedJourneysDb';
import DecorativePattern from '../DecorativePattern/DecorativePattern';
import LegalFooter from '../LegalFooter/LegalFooter';
import './CarbonPage.css';

function formatCarbonAmount(value) {
  const carbonValue = Number(value);

  if (!Number.isFinite(carbonValue)) {
    return '-';
  }

  if (carbonValue >= 1000) {
    return `${(carbonValue / 1000).toFixed(carbonValue >= 10000 ? 0 : 1)} kg`;
  }

  return `${Math.round(carbonValue)} g`;
}

function formatDistanceKm(value) {
  const distanceKm = Number(value);

  if (!Number.isFinite(distanceKm)) {
    return '-';
  }

  return `${distanceKm.toFixed(distanceKm >= 10 ? 0 : 1)} km`;
}

function formatConsumptionRatio(totalCo2e, carSoloCo2e) {
  const total = Number(totalCo2e);
  const carSolo = Number(carSoloCo2e);

  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(carSolo)) {
    return '-';
  }

  return `${(carSolo / total).toLocaleString('fr-FR', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  })}x moins`;
}

function getTransportTypeLabel(type) {
  const normalizedType = String(type || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (normalizedType.includes('walk') || normalizedType.includes('pied')) {
    return 'A pied';
  }

  if (normalizedType.includes('bike') || normalizedType.includes('velo')) {
    return 'A vélo';
  }

  if (
    normalizedType.includes('transit') ||
    normalizedType.includes('transport') ||
    normalizedType.includes('multimodal')
  ) {
    return 'Multimodal';
  }

  return 'Autre';
}

/**
 * Agrege les trajets termines pour construire les indicateurs du dashboard Mon carbone.
 *
 * @param {import('../../utils/completedJourneysDb').CompletedJourneyRecord[]} journeys
 * @returns {{
 *   totalCo2e: number,
 *   carSoloCo2e: number,
 *   distanceKm: number,
 *   averageCo2ePerKm: number|null,
 *   preferredTypes: Array<{label: string, count: number}>
 * }}
 */
function buildCarbonStats(journeys) {
  const totals = journeys.reduce(
    (currentTotals, journey) => {
      const totalCo2e = Number(journey?.carbonFootprint?.total_co2e);
      const carSoloCo2e = Number(journey?.carbonFootprint?.car_solo_co2e);
      const distanceKm = Number(journey?.distanceKm);

      return {
        totalCo2e:
          currentTotals.totalCo2e +
          (Number.isFinite(totalCo2e) ? totalCo2e : 0),
        carSoloCo2e:
          currentTotals.carSoloCo2e +
          (Number.isFinite(carSoloCo2e) ? carSoloCo2e : 0),
        distanceKm:
          currentTotals.distanceKm +
          (Number.isFinite(distanceKm) && distanceKm > 0 ? distanceKm : 0),
      };
    },
    {
      totalCo2e: 0,
      carSoloCo2e: 0,
      distanceKm: 0,
    }
  );
  const typeCounts = journeys.reduce((counts, journey) => {
    const label = getTransportTypeLabel(journey?.type);

    return {
      ...counts,
      [label]: (counts[label] || 0) + 1,
    };
  }, {});
  const preferredTypes = Object.entries(typeCounts)
    .map(([label, count]) => ({ label, count }))
    .sort((firstType, secondType) => secondType.count - firstType.count);

  return {
    ...totals,
    averageCo2ePerKm:
      totals.distanceKm > 0 ? totals.totalCo2e / totals.distanceKm : null,
    preferredTypes,
  };
}

/**
 * Graphique Chart.js comparant les emissions reelles aux emissions estimees en voiture solo.
 *
 * @param {{totalCo2e: number, carSoloCo2e: number}} props
 * @returns {import('react').JSX.Element}
 */
function CarbonComparisonChart({ totalCo2e, carSoloCo2e }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    const styles = getComputedStyle(document.documentElement);
    const primaryColor = styles.getPropertyValue('--color-primary').trim();
    const labelColor = styles.getPropertyValue('--color-primary').trim();
    const textLightColor = styles.getPropertyValue('--color-text-light').trim();
    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Vos trajets', 'En voiture'],
        datasets: [
          {
            label: 'CO2',
            data: [totalCo2e, carSoloCo2e],
            borderRadius: 8,
            backgroundColor: [
              primaryColor || '#486c3a',
              'rgba(90, 101, 86, 0.34)',
            ],
            borderColor: [primaryColor || '#486c3a', textLightColor],
            borderWidth: 1,
            maxBarThickness: 74,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) => formatCarbonAmount(context.parsed.y),
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: labelColor || '#486c3a',
              font: {
                family: 'Inter, system-ui, sans-serif',
                weight: 700,
              },
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(90, 101, 86, 0.16)',
            },
            ticks: {
              color: textLightColor,
              callback: (value) => formatCarbonAmount(value),
            },
          },
        },
      },
    });

    return () => {
      chart.destroy();
    };
  }, [carSoloCo2e, totalCo2e]);

  return (
    <article className="carbon-comparison-chart">
      <h2>Comparaison des consommations</h2>
      <div className="carbon-comparison-chart__body">
        <div className="carbon-comparison-chart__canvas">
          <canvas ref={canvasRef} aria-label="Comparaison CO2" />
        </div>
        <dl className="carbon-comparison-chart__values">
          <div>
            <dt>Vos trajets</dt>
            <dd>{formatCarbonAmount(totalCo2e)}</dd>
          </div>
          <div>
            <dt>En voiture</dt>
            <dd>{formatCarbonAmount(carSoloCo2e)}</dd>
          </div>
          <div className="carbon-comparison-chart__ratio">
            <dt>En proportion</dt>
            <dd>{formatConsumptionRatio(totalCo2e, carSoloCo2e)}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

/**
 * Graphique Chart.js horizontal des modes de transport les plus utilises.
 *
 * @param {{types: Array<{label: string, count: number}>}} props
 * @returns {import('react').JSX.Element}
 */
function TransportTypesChart({ types }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || types.length === 0) {
      return undefined;
    }

    const styles = getComputedStyle(document.documentElement);
    const primaryColor = styles.getPropertyValue('--color-primary').trim();
    const labelColor = styles.getPropertyValue('--color-primary').trim();
    const textLightColor = styles.getPropertyValue('--color-text-light').trim();
    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: types.map((type) => type.label),
        datasets: [
          {
            label: 'Trajets',
            data: types.map((type) => type.count),
            borderRadius: 8,
            backgroundColor: primaryColor || '#486c3a',
            borderColor: primaryColor || '#486c3a',
            borderWidth: 1,
            maxBarThickness: 28,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const count = context.parsed.x;

                return `${count} trajet${count > 1 ? 's' : ''}`;
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              color: textLightColor,
              precision: 0,
              stepSize: 1,
            },
            grid: {
              color: 'rgba(90, 101, 86, 0.16)',
            },
          },
          y: {
            grid: {
              display: false,
            },
            ticks: {
              color: labelColor || '#486c3a',
              font: {
                family: 'Inter, system-ui, sans-serif',
                weight: 700,
              },
            },
          },
        },
      },
    });

    return () => {
      chart.destroy();
    };
  }, [types]);

  return (
    <article className="carbon-transport-chart">
      <h2>Types de transport préférés</h2>
      <div
        className="carbon-transport-chart__canvas"
        style={{
          '--transport-chart-height': `${Math.max(160, types.length * 58)}px`,
        }}
      >
        <canvas ref={canvasRef} aria-label="Types de trajets preferes" />
      </div>
    </article>
  );
}

/**
 * Page Mon carbone.
 *
 * Affiche un tableau de bord local base sur les trajets termines enregistres
 * dans IndexedDB : comparaison CO2 avec la voiture solo, moyenne par kilometre
 * et classement des types de transport preferes.
 *
 * @param {{isDarkMode: boolean, onLegalLinkClick?: Function, onToggleDarkMode: () => void}} props
 * @returns {import('react').JSX.Element}
 */
export default function CarbonPage({
  isDarkMode,
  onLegalLinkClick,
  onToggleDarkMode,
}) {
  const [completedJourneys, setCompletedJourneys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getCompletedJourneys()
      .then((journeys) => {
        if (isMounted) {
          setCompletedJourneys(journeys);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(
    () => buildCarbonStats(completedJourneys),
    [completedJourneys]
  );
  return (
    <section className="carbon-page" aria-labelledby="carbon-page-title">
      <DecorativePattern />
      <div className="carbon-page__panel">
        <header className="carbon-page__header">
          <div className="carbon-page__header-main">
            <div className="carbon-page__avatar" aria-hidden="true">
              <Tree size={34} weight="regular" />
            </div>
            <div>
              <h1 id="carbon-page-title">Mon carbone</h1>
              <p>
                {isLoading
                  ? 'Chargement...'
                  : `${completedJourneys.length} trajet${
                      completedJourneys.length > 1 ? 's' : ''
                    } enregistré${completedJourneys.length > 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <button
            className="map-icon-button carbon-theme-toggle"
            type="button"
            aria-label={
              isDarkMode ? 'Activer le mode clair' : 'Activer le mode sombre'
            }
            title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
            aria-pressed={isDarkMode}
            onClick={onToggleDarkMode}
          >
            {isDarkMode ? (
              <Sun size={20} weight="bold" aria-hidden="true" />
            ) : (
              <Moon size={20} weight="bold" aria-hidden="true" />
            )}
          </button>
        </header>

        <section className="carbon-section carbon-section--featured">
          <CarbonComparisonChart
            totalCo2e={stats.totalCo2e}
            carSoloCo2e={stats.carSoloCo2e}
          />
        </section>

        <section
          className="carbon-section"
          aria-labelledby="carbon-average-title"
        >
          <div className="carbon-section__header">
            <h2 id="carbon-average-title">Moyenne</h2>
            <span>{formatDistanceKm(stats.distanceKm)} parcourus</span>
          </div>

          <div className="carbon-average">
            <Leaf size={22} weight="regular" aria-hidden="true" />
            <div>
              <span>CO₂ moyen par km</span>
              <strong>
                {stats.averageCo2ePerKm === null
                  ? '-'
                  : formatCarbonAmount(stats.averageCo2ePerKm)}
                /km
              </strong>
            </div>
          </div>
        </section>

        <section
          className="carbon-section"
          aria-labelledby="carbon-types-title"
        >
          {stats.preferredTypes.length > 0 ? (
            <TransportTypesChart types={stats.preferredTypes} />
          ) : (
            <div className="carbon-empty">
              <ChartBar size={26} weight="regular" aria-hidden="true" />
              <p>Aucun trajet termine enregistre pour le moment.</p>
            </div>
          )}
        </section>

      </div>
      <LegalFooter onLegalLinkClick={onLegalLinkClick} />
    </section>
  );
}
