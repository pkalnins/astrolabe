import type { CelestialBody, PlanetPosition } from "@/lib/astro/positions";
import type { LunarNodes } from "@/lib/astro/lunarNodes";
import type { MoonPhaseInfo } from "@/lib/astro/moonPhase";
import { signedDelta } from "@/lib/astro/math";
import { polarToPoint, screenAngle } from "./geometry";
import { PLANET_GLYPHS, PLANET_COLORS, LUNAR_NODE_GLYPHS, SYMBOL_FONT_FAMILY } from "./glyphs";
import { isOuterPlanet, OuterPlanetIcon } from "./OuterPlanetIcons";
import { MoonPhaseIcon } from "./MoonPhaseIcon";

export type NatalHoverTarget = { kind: "planet"; body: CelestialBody } | { kind: "node"; node: "north" | "south" };

export interface NatalRingProps {
  cx: number;
  cy: number;
  radius: number;
  ascendant: number;
  planets: PlanetPosition[];
  lunarNodes: LunarNodes;
  moonPhase: MoonPhaseInfo;
  circleRadius: number;
  onHover?: (target: NatalHoverTarget, event: React.MouseEvent<SVGGElement> | null) => void;
}

// Hollow, outlined against the wheel's own background rather than filled -
// the same treatment the live lunar-node markers already use - so natal
// bodies read as "a fixed point in time" rather than one more solid,
// currently-moving planet sharing this ring.
const MARKER_BG = "#0a0a12";
const NODE_COLOR = "#94a3b8";

// Same idea as SkyWheel's own live Moon/node nudge: this ring can put the
// natal Moon and a natal node at nearly the same angle (common - the two are
// related), which would otherwise stack their markers illegibly.
const NODE_MOON_COLLISION_THRESHOLD_DEG = 25;
const NODE_MOON_NUDGE_DEG = 25;

export function NatalRing({ cx, cy, radius, ascendant, planets, lunarNodes, moonPhase, circleRadius, onHover }: NatalRingProps) {
  const moon = planets.find((p) => p.body === "Moon");

  return (
    <g>
      {planets.map((planet) => {
        const angle = screenAngle(planet.eclipticLongitude, ascendant);
        const point = polarToPoint(cx, cy, radius, angle);
        const color = PLANET_COLORS[planet.body];
        const hoverProps = {
          onMouseEnter: onHover && ((e: React.MouseEvent<SVGGElement>) => onHover({ kind: "planet", body: planet.body }, e)),
          onMouseLeave: onHover && (() => onHover({ kind: "planet", body: planet.body }, null)),
          style: onHover ? ({ cursor: "pointer" } as const) : undefined,
        };

        return (
          <g key={planet.body} {...hoverProps}>
            <circle cx={point.x} cy={point.y} r={circleRadius} fill={MARKER_BG} stroke={color} strokeWidth={1.5} />
            {planet.body === "Moon" ? (
              <MoonPhaseIcon
                x={point.x}
                y={point.y}
                radius={circleRadius * 0.72}
                illuminatedFraction={moonPhase.illuminatedFraction}
                waxing={moonPhase.angle < 180}
                litColor={color}
              />
            ) : isOuterPlanet(planet.body) ? (
              <OuterPlanetIcon body={planet.body} x={point.x} y={point.y} scale={circleRadius / 6.7} color={color} />
            ) : (
              <text
                x={point.x}
                y={point.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={circleRadius * 1.3}
                fontFamily={SYMBOL_FONT_FAMILY}
                fill={color}
              >
                {PLANET_GLYPHS[planet.body]}
              </text>
            )}
            {/* Invisible, larger hit area - matches PlanetRing's. */}
            <circle cx={point.x} cy={point.y} r={circleRadius + 6} fill="transparent" />
          </g>
        );
      })}

      {(
        [
          { node: "north" as const, glyph: LUNAR_NODE_GLYPHS.north, longitude: lunarNodes.northNodeLongitude },
          { node: "south" as const, glyph: LUNAR_NODE_GLYPHS.south, longitude: lunarNodes.southNodeLongitude },
        ] as const
      ).map(({ node, glyph, longitude }) => {
        const deltaFromMoon = moon ? signedDelta(moon.eclipticLongitude, longitude) : NODE_MOON_COLLISION_THRESHOLD_DEG;
        const nudge =
          Math.abs(deltaFromMoon) < NODE_MOON_COLLISION_THRESHOLD_DEG ? Math.sign(deltaFromMoon || 1) * NODE_MOON_NUDGE_DEG : 0;
        const angle = screenAngle(longitude, ascendant) + nudge;
        const point = polarToPoint(cx, cy, radius, angle);
        const hoverProps = {
          onMouseEnter: onHover && ((e: React.MouseEvent<SVGGElement>) => onHover({ kind: "node", node }, e)),
          onMouseLeave: onHover && (() => onHover({ kind: "node", node }, null)),
          style: onHover ? ({ cursor: "pointer" } as const) : undefined,
        };

        return (
          <g key={node} {...hoverProps}>
            <circle cx={point.x} cy={point.y} r={circleRadius * 0.8} fill={MARKER_BG} stroke={NODE_COLOR} strokeWidth={1.5} />
            <text
              x={point.x}
              y={point.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={11}
              fontFamily={SYMBOL_FONT_FAMILY}
              fill={NODE_COLOR}
            >
              {glyph}
            </text>
            <circle cx={point.x} cy={point.y} r={circleRadius * 0.8 + 6} fill="transparent" />
          </g>
        );
      })}
    </g>
  );
}
