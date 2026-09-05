import { useEffect, useMemo, useState } from 'react';
import {
  Bicycle,
  Check,
  Flame,
  Leaf,
  Medal,
  MedalMilitary,
  Moon,
  PersonSimpleWalk,
  Path,
  Sun,
  Train,
  Trophy,
} from '@phosphor-icons/react';
import { getCompletedJourneys } from '../../utils/completedJourneysDb';
import DecorativePattern from '../DecorativePattern/DecorativePattern';
import LegalFooter from '../LegalFooter/LegalFooter';
import { ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_LEVELS } from './achievementsData';
import './AchievementsPage.css';

const CATEGORY_ICONS = {
  bike: Bicycle,
  carbon: Leaf,
  distance: Path,
  journeys: Check,
  streak: Flame,
  transit: Train,
  walking: PersonSimpleWalk,
};

const LEVEL_ICONS = {
  bronze: MedalMilitary,
  silver: Medal,
  gold: Trophy,
};

const ACHIEVEMENT_FILTERS = [
  {
    id: 'all',
    label: 'Tous',
  },
  {
    id: 'unlocked',
    label: 'Débloqués',
  },
  {
    id: 'locked',
    label: 'Verrouillés',
  },
];

const COUNTABLE_UNITS = {
  jours: {
    singular: 'jour',
    plural: 'jours',
  },
  trajets: {
    singular: 'trajet',
    plural: 'trajets',
  },
};

function normalizeTransportType(type) {
  return String(type || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function journeyMatchesMode(journey, modeMatchers) {
  const normalizedType = normalizeTransportType(journey?.type);

  return modeMatchers.some((matcher) => normalizedType.includes(matcher));
}

function getCompletedJourneyDateKey(journey) {
  const completedAt = new Date(journey?.completedAt);

  if (Number.isNaN(completedAt.getTime())) {
    return null;
  }

  return completedAt.toISOString().slice(0, 10);
}

function getDateKeyDayIndex(dateKey) {
  return Date.parse(`${dateKey}T00:00:00.000Z`) / 86400000;
}

function getTodayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getBestStreakDays(journeys) {
  const dayIndexes = [
    ...new Set(
      journeys
        .map(getCompletedJourneyDateKey)
        .filter(Boolean)
        .map(getDateKeyDayIndex)
    ),
  ].sort((firstDay, secondDay) => firstDay - secondDay);

  return dayIndexes.reduce(
    (streak, dayIndex, index) => {
      const isConsecutive = index > 0 && dayIndex === dayIndexes[index - 1] + 1;
      const currentStreak = isConsecutive ? streak.current + 1 : 1;

      return {
        current: currentStreak,
        best: Math.max(streak.best, currentStreak),
      };
    },
    {
      current: 0,
      best: 0,
    }
  ).best;
}

function getCurrentStreakDays(journeys) {
  const completedDayIndexes = new Set(
    journeys
      .map(getCompletedJourneyDateKey)
      .filter(Boolean)
      .map(getDateKeyDayIndex)
  );
  let currentDayIndex = getDateKeyDayIndex(getTodayDateKey());
  let currentStreakDays = 0;

  while (completedDayIndexes.has(currentDayIndex)) {
    currentStreakDays += 1;
    currentDayIndex -= 1;
  }

  return currentStreakDays;
}

function buildAchievementStats(journeys) {
  const journeyStats = journeys.reduce(
    (stats, journey) => {
      const distanceKm = Number(journey?.distanceKm);
      const co2SavedGrams = Number(
        journey?.carbonFootprint?.savings_vs_car_solo_co2e
      );

      return {
        totalTrips: stats.totalTrips + 1,
        walkingTrips:
          stats.walkingTrips +
          (journeyMatchesMode(journey, ['walk', 'pied']) ? 1 : 0),
        bikeTrips:
          stats.bikeTrips +
          (journeyMatchesMode(journey, ['bike', 'velo']) ? 1 : 0),
        transitTrips:
          stats.transitTrips +
          (journeyMatchesMode(journey, [
            'transit',
            'transport',
            'multimodal',
            'train',
            'metro',
            'bus',
            'tram',
          ])
            ? 1
            : 0),
        distanceKm:
          stats.distanceKm +
          (Number.isFinite(distanceKm) && distanceKm > 0 ? distanceKm : 0),
        co2SavedKg:
          stats.co2SavedKg +
          (Number.isFinite(co2SavedGrams) && co2SavedGrams > 0
            ? co2SavedGrams / 1000
            : 0),
      };
    },
    {
      bestStreakDays: 0,
      bikeTrips: 0,
      co2SavedKg: 0,
      currentStreakDays: 0,
      distanceKm: 0,
      totalTrips: 0,
      transitTrips: 0,
      walkingTrips: 0,
    }
  );

  return {
    ...journeyStats,
    bestStreakDays: getBestStreakDays(journeys),
    currentStreakDays: getCurrentStreakDays(journeys),
  };
}

function formatMetricValue(value, unit) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    const fallbackUnit = COUNTABLE_UNITS[unit]?.plural || unit;

    return `0 ${fallbackUnit}`;
  }

  if (unit === 'kg' || unit === 'km') {
    return `${numericValue.toLocaleString('fr-FR', {
      maximumFractionDigits: numericValue >= 10 ? 0 : 1,
    })} ${unit}`;
  }

  const roundedValue = Math.floor(numericValue);
  const unitLabels = COUNTABLE_UNITS[unit];
  const unitLabel =
    roundedValue === 1 && unitLabels
      ? unitLabels.singular
      : unitLabels?.plural || unit;

  return `${roundedValue.toLocaleString('fr-FR')} ${unitLabel}`;
}

function formatProgressCounter(value, target, unit) {
  if (unit === 'trajets' || unit === 'jours' || unit === 'km') {
    return `${Math.floor(value).toLocaleString('fr-FR')} / ${Math.floor(
      target
    ).toLocaleString('fr-FR')}`;
  }

  return `${formatMetricValue(value, unit)} / ${formatMetricValue(
    target,
    unit
  )}`;
}

function formatCompletedJourneysCount(count) {
  const label = count === 1 ? 'trajet enregistré' : 'trajets enregistrés';

  return `${count.toLocaleString('fr-FR')} ${label}`;
}

function buildAchievementGroups(stats) {
  return ACHIEVEMENT_CATEGORIES.map((category) => ({
    ...category,
    currentValue: stats[category.metric] || 0,
    Icon: CATEGORY_ICONS[category.id] || Trophy,
    achievements: category.achievements.map((achievement) => {
      const currentValue = stats[category.metric] || 0;
      const progress = Math.min(currentValue / achievement.target, 1);

      return {
        ...achievement,
        currentValue,
        progress,
        unlocked: currentValue >= achievement.target,
      };
    }),
  }));
}

export default function AchievementsPage({
  currentUser = null,
  isDarkMode,
  onLegalLinkClick,
  onToggleDarkMode,
}) {
  const [completedJourneys, setCompletedJourneys] = useState([]);
  const [achievementFilter, setAchievementFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getCompletedJourneys({
      syncRemote: Boolean(currentUser),
    })
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
  }, [currentUser]);

  const stats = useMemo(
    () => buildAchievementStats(completedJourneys),
    [completedJourneys]
  );
  const achievementGroups = useMemo(
    () => buildAchievementGroups(stats),
    [stats]
  );
  const allAchievements = achievementGroups.flatMap((group) =>
    group.achievements.map((achievement) => ({
      ...achievement,
      categoryId: group.id,
      CategoryIcon: group.Icon,
      categoryTitle: group.title,
      unit: group.unit,
    }))
  );
  const unlockedCount = allAchievements.filter(
    (achievement) => achievement.unlocked
  ).length;
  const lockedCount = allAchievements.length - unlockedCount;
  const filteredAchievements = allAchievements.filter((achievement) => {
    if (achievementFilter === 'unlocked') {
      return achievement.unlocked;
    }

    if (achievementFilter === 'locked') {
      return !achievement.unlocked;
    }

    return true;
  });
  const unlockedCountsByLevel = Object.keys(ACHIEVEMENT_LEVELS).map((level) => {
    const Icon = LEVEL_ICONS[level] || Medal;

    return {
      level,
      Icon,
      count: allAchievements.filter(
        (achievement) => achievement.level === level && achievement.unlocked
      ).length,
      total: allAchievements.filter(
        (achievement) => achievement.level === level
      ).length,
    };
  });

  return (
    <section
      className="achievements-page"
      aria-labelledby="achievements-page-title"
    >
      <DecorativePattern coverViewport={false} minHeight={0} />
      <div className="achievements-page__panel">
        <header className="achievements-page__header">
          <div className="achievements-page__header-main">
            <div className="achievements-page__avatar" aria-hidden="true">
              <Trophy size={34} weight="regular" />
            </div>
            <div>
              <h1 id="achievements-page-title">Mes succès</h1>
              <p>
                {isLoading
                  ? 'Chargement...'
                  : `${unlockedCount} succès débloqué${
                      unlockedCount > 1 ? 's' : ''
                    } sur ${allAchievements.length}`}
              </p>
            </div>
          </div>
          <button
            className="map-icon-button achievements-theme-toggle"
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

        <section
          className="achievements-summary"
          aria-labelledby="achievements-summary-title"
        >
          <div>
            <h2 id="achievements-summary-title">Progression</h2>
            <p>{formatCompletedJourneysCount(completedJourneys.length)}</p>
          </div>
          <dl>
            <div>
              <dt>Distance</dt>
              <dd>{formatMetricValue(stats.distanceKm, 'km')}</dd>
            </div>
            <div>
              <dt>CO₂ évité</dt>
              <dd>{formatMetricValue(stats.co2SavedKg, 'kg')}</dd>
            </div>
            <div>
              <dt>Série en cours</dt>
              <dd>{formatMetricValue(stats.currentStreakDays, 'jours')}</dd>
            </div>
          </dl>
        </section>

        <section
          className="achievements-section"
          aria-labelledby="achievements-levels-title"
        >
          <div className="achievements-section__header">
            <h2 id="achievements-levels-title">Succès par niveau</h2>
          </div>
          <dl className="achievements-level-grid">
            {unlockedCountsByLevel.map(({ count, Icon, level, total }) => (
              <div className="achievement-level-card" key={level}>
                <dd>
                  <span data-level={level}>
                    <Icon size={36} weight="regular" aria-hidden="true" />
                  </span>
                  <strong>
                    {count}/{total}
                  </strong>
                </dd>
                <dt>{ACHIEVEMENT_LEVELS[level].label}</dt>
              </div>
            ))}
          </dl>
        </section>

        <section
          className="achievements-section"
          aria-labelledby="achievements-list-title"
        >
          <div className="achievements-section__header">
            <h2 id="achievements-list-title">Tous les succès</h2>
          </div>

          <div
            className="achievements-filter"
            role="group"
            aria-label="Filtrer les succès"
          >
            {ACHIEVEMENT_FILTERS.map((filter) => {
              const count =
                filter.id === 'unlocked'
                  ? unlockedCount
                  : filter.id === 'locked'
                    ? lockedCount
                    : allAchievements.length;

              return (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={achievementFilter === filter.id}
                  onClick={() => setAchievementFilter(filter.id)}
                >
                  <span>{filter.label}</span>
                  <strong>{count}</strong>
                </button>
              );
            })}
          </div>

          <div className="achievement-list">
            {filteredAchievements.map((achievement) => {
              const AchievementIcon = achievement.CategoryIcon || Trophy;

              return (
                <article
                  className="achievement-card"
                  data-unlocked={achievement.unlocked}
                  key={achievement.id}
                >
                  <div
                    className="achievement-card__medal"
                    data-level={achievement.level}
                    aria-hidden="true"
                  >
                    <AchievementIcon size={32} weight="regular" />
                  </div>
                  <div className="achievement-card__body">
                    <div className="achievement-card__title-row">
                      <h4>{achievement.title}</h4>
                      <span data-level={achievement.level}>
                        {ACHIEVEMENT_LEVELS[achievement.level].label}
                      </span>
                    </div>
                    <p>{achievement.description}</p>
                    <div className="achievement-card__progress">
                      <span>
                        {formatProgressCounter(
                          achievement.currentValue,
                          achievement.target,
                          achievement.unit
                        )}
                      </span>
                      <progress value={achievement.progress} max="1">
                        {Math.round(achievement.progress * 100)}%
                      </progress>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
      <LegalFooter onLegalLinkClick={onLegalLinkClick} />
    </section>
  );
}
