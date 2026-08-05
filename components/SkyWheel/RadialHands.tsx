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
  /** Dashed, for a body shown only because it's in aspect with the
      hovered planet - visually distinct from a "real" (solid) hand. */
  dashed?: boolean;
}

const HAND_STROKE_WIDTH = 1;
const HAND_STROKE_OPACITY = 0.5;
const TIP_CIRCLE_RADIUS = 4;
const DASH_PATTERN = "4 3";

/**
 * A thin "clock hand" from Earth (center) out to the zodiac ring for each
 * given planet - just the Sun and Moon, currently - with a small circle
 * where it meets the ring.
 */
export function RadialHands({ cx, cy, radius, ascendant, planets, dashed = false }: RadialHandsProps) {
  return (
    <g>
      {planets.map((planet) => {
        const angle = screenAngle(planet.eclipticLongitude, ascendant);
        const tip = polarToPoint(cx, cy, radius, angle);
        const color = PLANET_COLORS[planet.body];

        return (
          <g key={planet.body}>
            <line
              x1={cx}
              y1={cy}
              x2={tip.x}
              y2={tip.y}
              stroke={color}
              strokeWidth={HAND_STROKE_WIDTH}
              strokeOpacity={HAND_STROKE_OPACITY}
              strokeDasharray={dashed ? DASH_PATTERN : undefined}
            />
            <circle cx={tip.x} cy={tip.y} r={TIP_CIRCLE_RADIUS} fill={color} fillOpacity={dashed ? 0.6 : 1} />
          </g>
        );
      })}
    </g>
  );
}
