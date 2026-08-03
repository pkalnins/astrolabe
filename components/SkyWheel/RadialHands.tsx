import type { PlanetPosition } from "@/lib/astro/positions";
import { PLANET_COLORS } from "./glyphs";
import { polarToPoint, screenAngle } from "./geometry";

export interface RadialHandsProps {
  cx: number;
  cy: number;
  /** Radius of the tip circle - the inner edge of the zodiac ring. */
  radius: number;
  ascendant: number;
  planets: PlanetPosition[];
}

const HAND_STROKE_WIDTH = 1;
const HAND_STROKE_OPACITY = 0.5;
const TIP_CIRCLE_RADIUS = 4;

/**
 * A thin "clock hand" from Earth (center) out to the zodiac ring for each
 * given planet - just the Sun and Moon, currently - with a small circle
 * where it meets the ring.
 */
export function RadialHands({ cx, cy, radius, ascendant, planets }: RadialHandsProps) {
  return (
    <g>
      {planets.map((planet) => {
        const angle = screenAngle(planet.eclipticLongitude, ascendant);
        const tip = polarToPoint(cx, cy, radius, angle);
        const color = PLANET_COLORS[planet.body];

        return (
          <g key={planet.body}>
            <line x1={cx} y1={cy} x2={tip.x} y2={tip.y} stroke={color} strokeWidth={HAND_STROKE_WIDTH} strokeOpacity={HAND_STROKE_OPACITY} />
            <circle cx={tip.x} cy={tip.y} r={TIP_CIRCLE_RADIUS} fill={color} />
          </g>
        );
      })}
    </g>
  );
}
