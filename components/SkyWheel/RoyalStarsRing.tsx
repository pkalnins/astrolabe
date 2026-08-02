import type { FixedStarPosition } from "@/lib/astro/fixedStars";
import { polarToPoint, screenAngle } from "./geometry";
import { SYMBOL_FONT_FAMILY } from "./glyphs";

export interface RoyalStarsRingProps {
  cx: number;
  cy: number;
  radius: number;
  ascendant: number;
  stars: FixedStarPosition[];
}

// Each star's actual observed color, documented since antiquity (e.g.
// Antares - "rival of Mars" - is named for its red color).
const STAR_COLORS: Record<string, string> = {
  Aldebaran: "#f5a742", // orange giant
  Regulus: "#bfdbfe", // blue-white star
  Antares: "#f0605a", // red supergiant
  Fomalhaut: "#f8fafc", // white star
};
const DEFAULT_STAR_COLOR = "#fde68a";
const MARKER_RADIUS = 3.5;
const LABEL_GAP = 8;

export function RoyalStarsRing({ cx, cy, radius, ascendant, stars }: RoyalStarsRingProps) {
  return (
    <g>
      {stars.map((star) => {
        const angle = screenAngle(star.eclipticLongitude, ascendant);
        const point = polarToPoint(cx, cy, radius, angle);
        const labelPoint = polarToPoint(cx, cy, radius + LABEL_GAP, angle);
        const onRightHalf = labelPoint.x >= cx;
        const color = STAR_COLORS[star.name] ?? DEFAULT_STAR_COLOR;

        return (
          <g key={star.name}>
            <circle cx={point.x} cy={point.y} r={MARKER_RADIUS} fill={color} />
            <text
              x={labelPoint.x + (onRightHalf ? MARKER_RADIUS : -MARKER_RADIUS)}
              y={labelPoint.y}
              textAnchor={onRightHalf ? "start" : "end"}
              dominantBaseline="central"
              fontSize={11}
              fontFamily={SYMBOL_FONT_FAMILY}
              fill={color}
              fillOpacity={0.9}
            >
              {star.name}
            </text>
          </g>
        );
      })}
    </g>
  );
}
