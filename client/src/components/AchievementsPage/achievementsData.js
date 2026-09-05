export const ACHIEVEMENT_LEVELS = {
  bronze: {
    label: 'Bronze',
  },
  silver: {
    label: 'Argent',
  },
  gold: {
    label: 'Or',
  },
};

export const ACHIEVEMENT_CATEGORIES = [
  {
    id: 'walking',
    title: 'À pied',
    metric: 'walkingTrips',
    unit: 'trajets',
    achievements: [
      {
        id: 'walking-bronze',
        title: 'Premiers pas',
        description: 'Vous avez fait 5 trajets à pied.',
        level: 'bronze',
        target: 5,
      },
      {
        id: 'walking-silver',
        title: 'Marcheur régulier',
        description: 'Vous avez fait 25 trajets à pied.',
        level: 'silver',
        target: 25,
      },
      {
        id: 'walking-gold',
        title: 'Randonneur urbain',
        description: 'Vous avez fait 50 trajets à pied.',
        level: 'gold',
        target: 50,
      },
    ],
  },
  {
    id: 'bike',
    title: 'Vélo',
    metric: 'bikeTrips',
    unit: 'trajets',
    achievements: [
      {
        id: 'bike-bronze',
        title: 'Coup de pédale',
        description: 'Vous avez fait 5 trajets à vélo.',
        level: 'bronze',
        target: 5,
      },
      {
        id: 'bike-silver',
        title: 'Cycliste amateur',
        description: 'Vous avez fait 25 trajets à vélo.',
        level: 'silver',
        target: 25,
      },
      {
        id: 'bike-gold',
        title: 'Roi de la piste',
        description: 'Vous avez fait 50 trajets à vélo.',
        level: 'gold',
        target: 50,
      },
    ],
  },
  {
    id: 'carbon',
    title: 'CO2 économisé',
    metric: 'co2SavedKg',
    unit: 'kg',
    achievements: [
      {
        id: 'carbon-bronze',
        title: 'Impact visible',
        description: 'Vous avez économisé 10 kg de CO2.',
        level: 'bronze',
        target: 10,
      },
      {
        id: 'carbon-silver',
        title: 'Respiration légère',
        description: 'Vous avez économisé 100 kg de CO2.',
        level: 'silver',
        target: 100,
      },
      {
        id: 'carbon-gold',
        title: 'Champion bas carbone',
        description: 'Vous avez économisé 500 kg de CO2.',
        level: 'gold',
        target: 500,
      },
    ],
  },
  {
    id: 'distance',
    title: 'Distance',
    metric: 'distanceKm',
    unit: 'km',
    achievements: [
      {
        id: 'distance-bronze',
        title: 'Touriste',
        description: 'Vous avez parcouru 50 km.',
        level: 'bronze',
        target: 50,
      },
      {
        id: 'distance-silver',
        title: 'Voyageur',
        description: 'Vous avez parcouru 100 km.',
        level: 'silver',
        target: 100,
      },
      {
        id: 'distance-gold',
        title: 'Explorateur',
        description: 'Vous avez parcouru 500 km.',
        level: 'gold',
        target: 500,
      },
    ],
  },
  {
    id: 'transit',
    title: 'Transports',
    metric: 'transitTrips',
    unit: 'trajets',
    achievements: [
      {
        id: 'transit-bronze',
        title: 'Ticket valide',
        description: 'Vous avez fait 25 trajets en transport.',
        level: 'bronze',
        target: 25,
      },
      {
        id: 'transit-silver',
        title: 'Habitué du réseau',
        description: 'Vous avez fait 50 trajets en transport.',
        level: 'silver',
        target: 50,
      },
      {
        id: 'transit-gold',
        title: 'Maître des lignes',
        description: 'Vous avez fait 100 trajets en transport.',
        level: 'gold',
        target: 100,
      },
    ],
  },
  {
    id: 'journeys',
    title: 'Régularité',
    metric: 'totalTrips',
    unit: 'trajets',
    achievements: [
      {
        id: 'journeys-bronze',
        title: 'Déplacements subtiles',
        description: 'Vous avez terminé 25 trajets.',
        level: 'bronze',
        target: 25,
      },
      {
        id: 'journeys-silver',
        title: 'Rythme installé',
        description: 'Vous avez terminé 75 trajets.',
        level: 'silver',
        target: 75,
      },
      {
        id: 'journeys-gold',
        title: 'Mobilité solide',
        description: 'Vous avez terminé 200 trajets.',
        level: 'gold',
        target: 200,
      },
    ],
  },
  {
    id: 'streak',
    title: 'Flamme',
    metric: 'bestStreakDays',
    unit: 'jours',
    achievements: [
      {
        id: 'streak-bronze',
        title: 'Flamme allumée',
        description: "Vous avez terminé au moins un trajet 3 jours d'affilé.",
        level: 'bronze',
        target: 3,
      },
      {
        id: 'streak-silver',
        title: 'Rythme brûlant',
        description: "Vous avez terminé au moins un trajet 7 jours d'affilé.",
        level: 'silver',
        target: 7,
      },
      {
        id: 'streak-gold',
        title: 'Flamme urbaine',
        description: "Vous avez terminé au moins un trajet 14 jours d'affilé.",
        level: 'gold',
        target: 14,
      },
    ],
  },
];
