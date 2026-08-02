import type { CelestialBody, PlanetPosition } from "@/lib/astro/positions";
import type { MoonPhaseInfo } from "@/lib/astro/moonPhase";
import { polarToPoint, screenAngle } from "./geometry";
import { PLANET_GLYPHS, SYMBOL_FONT_FAMILY } from "./glyphs";
import { isOuterPlanet, OuterPlanetIcon } from "./OuterPlanetIcons";
import { MoonPhaseIcon } from "./MoonPhaseIcon";

export interface PlanetRingProps {
  cx: number;
  cy: number;
  radius: number;
  ascendant: number;
  planets: PlanetPosition[];
  circleRadius: number;
  /** Required to draw the Moon as its current phase rather than a glyph. */
  moonPhase?: MoonPhaseInfo;
}

// Traditional astrological planetary colors.
const PLANET_COLORS: Record<CelestialBody, string> = {
  Sun: "#fbbf24",
  Moon: "#cbd5e1",
  Mars: "#dc2626",
  Mercury: "#10b981",
  Jupiter: "#f97316",
  Venus: "#fb7185",
  Saturn: "#1e40af",
  Uranus: "#22d3ee",
  Neptune: "#8b5cf6",
  Pluto: "#7f1d1d",
};
const RETROGRADE_STROKE = "#ef4444";
const GLYPH_COLOR = "#ffffff";

function colorFor(planet: PlanetPosition): string {
  return PLANET_COLORS[planet.body];
}

export function PlanetRing({ cx, cy, radius, ascendant, planets, circleRadius, moonPhase }: PlanetRingProps) {
  return (
    <g>
      {planets.map((planet) => {
        const angle = screenAngle(planet.eclipticLongitude, ascendant);
        const point = polarToPoint(cx, cy, radius, angle);
        const badgeColor = colorFor(planet);
        if (planet.body === "Sun") {
          return <circle key={planet.body} cx={point.x} cy={point.y} r={circleRadius} fill={badgeColor} />;
        }

        if (planet.body === "Moon" && moonPhase) {
          return (
            <MoonPhaseIcon
              key={planet.body}
              x={point.x}
              y={point.y}
              radius={circleRadius}
              illuminatedFraction={moonPhase.illuminatedFraction}
              waxing={moonPhase.angle < 180}
              litColor={badgeColor}
            />
          );
        }

        return (
          <g key={planet.body}>
            <circle
              cx={point.x}
              cy={point.y}
              r={circleRadius}
              fill={badgeColor}
              stroke={planet.retrograde ? RETROGRADE_STROKE : "none"}
              strokeWidth={2}
            />
            {isOuterPlanet(planet.body) ? (
              <OuterPlanetIcon body={planet.body} x={point.x} y={point.y} scale={circleRadius / 6.7} color={GLYPH_COLOR} />
            ) : (
              <text
                x={point.x}
                y={point.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={circleRadius * 1.3}
                fontFamily={SYMBOL_FONT_FAMILY}
                fill={GLYPH_COLOR}
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
