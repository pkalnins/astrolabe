import type { CelestialBody, PlanetPosition } from "@/lib/astro/positions";
import type { MoonPhaseInfo } from "@/lib/astro/moonPhase";
import { declutterAngles, polarToPoint, screenAngle } from "./geometry";
import { PLANET_GLYPHS, PLANET_COLORS, SYMBOL_FONT_FAMILY } from "./glyphs";
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
  /** Backs each marker's hover tooltip. Takes the body since a single ring
      (the trans-Saturnian one) can hold more than one planet. */
  onHover?: (body: CelestialBody, event: React.MouseEvent<SVGGElement> | null) => void;
}

const RETROGRADE_STROKE = "#ef4444";
const GLYPH_COLOR = "#ffffff";
// Extra breathing room beyond the bare minimum needed for two markers not to
// touch, so crowded bodies read as visually distinct rather than merely
// non-overlapping.
const MIN_SEPARATION_BUFFER = 1.4;

function colorFor(planet: PlanetPosition): string {
  return PLANET_COLORS[planet.body];
}

export function PlanetRing({ cx, cy, radius, ascendant, planets, circleRadius, moonPhase, onHover }: PlanetRingProps) {
  // Most rings here only ever hold one or two bodies (the current-sky
  // per-planet spheres), where this is a no-op - it only actually does
  // anything once several bodies share one ring, like Explore Transits
  // mode's consolidated transiting-planets ring, or a tight real conjunction
  // on the 3-body trans-Saturnian ring.
  const rawAngles = planets.map((planet) => screenAngle(planet.eclipticLongitude, ascendant));
  // Degrees of arc needed between two markers at this radius to keep their
  // circles from visually touching - smaller rings need more angular
  // separation for the same physical gap, so this scales with radius rather
  // than being a flat constant shared across every ring PlanetRing draws.
  const minSeparationDeg = ((2 * circleRadius) / (2 * Math.PI * radius)) * 360 * MIN_SEPARATION_BUFFER;
  const angles = declutterAngles(rawAngles, minSeparationDeg);

  return (
    <g>
      {planets.map((planet, i) => {
        const angle = angles[i];
        const point = polarToPoint(cx, cy, radius, angle);
        const badgeColor = colorFor(planet);
        const hoverProps = {
          onMouseEnter: onHover && ((e: React.MouseEvent<SVGGElement>) => onHover(planet.body, e)),
          onMouseLeave: onHover && (() => onHover(planet.body, null)),
          style: onHover ? { cursor: "pointer" } : undefined,
        };

        if (planet.body === "Sun") {
          return (
            <g key={planet.body} {...hoverProps}>
              <circle cx={point.x} cy={point.y} r={circleRadius} fill={badgeColor} />
              {/* Invisible, larger hit area - the visible badge alone is a
                  small target to land a hover on precisely. */}
              <circle cx={point.x} cy={point.y} r={circleRadius + 6} fill="transparent" />
            </g>
          );
        }

        if (planet.body === "Moon" && moonPhase) {
          return (
            <g key={planet.body} {...hoverProps}>
              <MoonPhaseIcon
                x={point.x}
                y={point.y}
                radius={circleRadius}
                illuminatedFraction={moonPhase.illuminatedFraction}
                waxing={moonPhase.angle < 180}
                litColor={badgeColor}
              />
              {/* Invisible, larger hit area - matches the Sun ring's. */}
              <circle cx={point.x} cy={point.y} r={circleRadius + 6} fill="transparent" />
            </g>
          );
        }

        return (
          <g key={planet.body} {...hoverProps}>
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
            {/* Invisible, larger hit area - matches the Sun/Moon rings'. */}
            <circle cx={point.x} cy={point.y} r={circleRadius + 6} fill="transparent" />
          </g>
        );
      })}
    </g>
  );
}
