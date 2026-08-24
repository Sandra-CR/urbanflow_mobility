import {
  Bicycle,
  Bus,
  ChargingStation,
  Footprints,
  Leaf,
  MapPin,
  Park,
  RoadHorizon,
  Scooter,
  Train,
  Tree,
} from '@phosphor-icons/react';
import './DecorativePattern.css';

const PATTERN_ICONS = [
  { Icon: Leaf, top: '8%', left: '7%', size: 26, rotate: -18 },
  { Icon: Bicycle, top: '12%', left: '25%', size: 34, rotate: 12 },
  { Icon: Train, top: '7%', left: '46%', size: 38, rotate: -10 },
  { Icon: Tree, top: '13%', left: '70%', size: 30, rotate: 16 },
  { Icon: Bus, top: '8%', left: '89%', size: 34, rotate: -14 },
  { Icon: Footprints, top: '28%', left: '12%', size: 28, rotate: 18 },
  { Icon: MapPin, top: '31%', left: '34%', size: 26, rotate: -8 },
  { Icon: Leaf, top: '27%', left: '61%', size: 24, rotate: 34 },
  { Icon: Bicycle, top: '33%', left: '83%', size: 36, rotate: -20 },
  { Icon: Train, top: '52%', left: '9%', size: 36, rotate: 9 },
  { Icon: Tree, top: '57%', left: '28%', size: 32, rotate: -12 },
  { Icon: Bus, top: '50%', left: '74%', size: 34, rotate: 12 },
  { Icon: Leaf, top: '70%', left: '17%', size: 24, rotate: -28 },
  { Icon: Footprints, top: '76%', left: '43%', size: 28, rotate: 10 },
  { Icon: Bicycle, top: '72%', left: '64%', size: 34, rotate: -8 },
  { Icon: Train, top: '81%', left: '86%', size: 38, rotate: 16 },
  { Icon: MapPin, top: '90%', left: '31%', size: 26, rotate: 18 },
  { Icon: Tree, top: '91%', left: '57%', size: 30, rotate: -14 },
  { Icon: Scooter, top: '19%', left: '40%', size: 30, rotate: 18 },
  { Icon: Park, top: '20%', left: '55%', size: 30, rotate: -18 },
  { Icon: ChargingStation, top: '22%', left: '94%', size: 28, rotate: 10 },
  { Icon: RoadHorizon, top: '42%', left: '22%', size: 34, rotate: -12 },
  { Icon: Scooter, top: '44%', left: '48%', size: 30, rotate: 14 },
  { Icon: Leaf, top: '43%', left: '93%', size: 24, rotate: -24 },
  { Icon: Park, top: '64%', left: '5%', size: 30, rotate: 16 },
  { Icon: ChargingStation, top: '63%', left: '52%', size: 28, rotate: -8 },
  { Icon: Bus, top: '66%', left: '95%', size: 34, rotate: 18 },
  { Icon: RoadHorizon, top: '84%', left: '73%', size: 34, rotate: -16 },
];

/**
 * Motif decoratif reutilisable pour les fonds de pages.
 *
 * @returns {import('react').JSX.Element} Motif d'icones non interactif.
 */
export default function DecorativePattern() {
  return (
    <div className="decorative-pattern" aria-hidden="true">
      {PATTERN_ICONS.map(({ Icon, top, left, size, rotate }, index) => (
        <Icon
          className="decorative-pattern__icon"
          key={`${top}-${left}-${index}`}
          size={size}
          weight="regular"
          style={{
            '--decorative-pattern-left': left,
            '--decorative-pattern-rotate': `${rotate}deg`,
            '--decorative-pattern-top': top,
          }}
        />
      ))}
    </div>
  );
}
