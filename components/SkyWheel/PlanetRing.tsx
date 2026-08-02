import type { PlanetPosition } from "@/lib/astro/positions";
import { polarToPoint, screenAngle } from "./geometry";
import { PLANET_GLYPHS, SYMBOL_FONT_FAMILY } from "./glyphs";
import { isOuterPlanet, OuterPlanetIcon } from "./OuterPlanetIcons";

export interface PlanetRingProps {
  cx: number;
  cy: number;
  radius: number;
  ascendant: number;
  planets: PlanetPosition[];
  circleRadius: number;
}

const PROGRADE_COLOR = "#60a5fa";
const RETROGRADE_COLOR = "#ef4444";
const SUN_COLOR = "#fbbf24";
const MOON_COLOR = "#cbd5e1";

function colorFor(planet: PlanetPosition): string {
  if (planet.retrograde) return RETROGRADE_COLOR;
  if (planet.body === "Sun") return SUN_COLOR;
  if (planet.body === "Moon") return MOON_COLOR;
  return PROGRADE_COLOR;
}

export function PlanetRing({ cx, cy, radius, ascendant, planets, circleRadius }: PlanetRingProps) {
  return (
    <g>
      {planets.map((planet) => {
        const angle = screenAngle(planet.eclipticLongitude, ascendant);
        const point = polarToPoint(cx, cy, radius, angle);
        const glyphColor = colorFor(planet);
        return (
          <g key={planet.body}>
            <circle
              cx={point.x}
              cy={point.y}
              r={circleRadius}
              fill="var(--wheel-bg, #0a0a12)"
              stroke={glyphColor}
              strokeOpacity={planet.retrograde ? 1 : 0.85}
              strokeWidth={planet.retrograde ? 2 : 1.5}
            />
            {isOuterPlanet(planet.body) ? (
              <OuterPlanetIcon body={planet.body} x={point.x} y={point.y} scale={circleRadius / 5.5} color={glyphColor} />
            ) : (
              <text
                x={point.x}
                y={point.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={circleRadius * 1.3}
                fontFamily={SYMBOL_FONT_FAMILY}
                fill={glyphColor}
              >
                {PLANET_GLYPHS[planet.body]}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}
