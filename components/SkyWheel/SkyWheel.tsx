"use client";

import { useMemo } from "react";
import type { CelestialBody, PlanetPosition } from "@/lib/astro/positions";
import { getMoonPhase } from "@/lib/astro/moonPhase";
import { FIXED_STARS, getFixedStarPositions } from "@/lib/astro/fixedStars";
import { toSidereal } from "@/lib/astro/ayanamsa";
import { getZodiacPosition } from "@/lib/astro/zodiac";
import type { ZodiacMode } from "@/lib/hooks/useAstroState";
import { ZodiacRing } from "./ZodiacRing";
import { PlanetRing } from "./PlanetRing";
import { FixedStarsRing } from "./FixedStarsRing";
import { RadialHands } from "./RadialHands";
import { polarToPoint, radialTickPath, screenAngle } from "./geometry";
import { SYMBOL_FONT_FAMILY } from "./glyphs";

export interface SkyWheelProps {
  planets: PlanetPosition[];
  ascendant: number;
  descendant: number;
  midheaven: number;
  mode: ZodiacMode;
  onModeChange: (mode: ZodiacMode) => void;
  now: Date;
  size?: number;
}

function formatDegree(longitude: number): string {
  const { sign, degreeInSign } = getZodiacPosition(longitude);
  return `${sign.glyph} ${Math.floor(degreeInSign)}°`;
}

// Extra margin (beyond the zodiac ring itself) so the fixed-star name labels
// have room without clipping the SVG edge. Labels are center-anchored on
// the label ring, so only half of the widest label ("Deneb Algedi", ~55 SVG
// units wide at fontSize 11) extends past the ring in the worst case (the
// label sitting due left/right of center): ring offset (60) + label ring gap
// (26) + half the longest label (~27), plus about 13% buffer for
// font/rendering variance across platforms.
const EXTRA_MARGIN = 130;
const ZODIAC_OUTER_RADIUS = 218;
const VIEWBOX_W = ZODIAC_OUTER_RADIUS * 2 + EXTRA_MARGIN * 2;
const VIEWBOX_H = ZODIAC_OUTER_RADIUS * 2 + EXTRA_MARGIN * 2;
const CENTER_X = VIEWBOX_W / 2;
const CENTER_Y = VIEWBOX_H / 2;
const ZODIAC_INNER_RADIUS = ZODIAC_OUTER_RADIUS - 46;
// +60 (not closer) so the star ring stays clear of the ASC/DSC label block:
// the wheel's rotation periodically brings a star's screen angle right up
// against 0/180 degrees, where ASC/DSC always sit - too close and the
// labels collide/run together.
const FIXED_STARS_RING_RADIUS = ZODIAC_OUTER_RADIUS + 60;
const EARTH_RADIUS = 20;

// Traditional geocentric ("Ptolemaic") ordering - Moon closest to Earth,
// outward through Saturn, the boundary of naked-eye antiquity. Each of these
// seven gets its own ring so the wheel reads as a stack of "spheres" rather
// than a generic planet track. Uranus/Neptune/Pluto aren't part of that
// ancient model, so they share one additional outer ring instead of each
// getting a "sphere" the geocentric system never accounted for.
const GEOCENTRIC_RING_ORDER = ["Moon", "Mercury", "Venus", "Sun", "Mars", "Jupiter", "Saturn"] as const;
const TRANS_SATURNIAN_BODIES: ReadonlySet<CelestialBody> = new Set(["Uranus", "Neptune", "Pluto"]);

// Evenly spaced from the zodiac ring down to Earth: one ring per classical
// body plus one for the trans-Saturnian group, with a matching gap left
// between the innermost ring (Moon) and Earth itself.
const INNER_RING_GAP = (ZODIAC_INNER_RADIUS - EARTH_RADIUS) / (GEOCENTRIC_RING_ORDER.length + 2);
const TRANS_SATURNIAN_RING_RADIUS = ZODIAC_INNER_RADIUS - INNER_RING_GAP;
const SATURN_RING_RADIUS = TRANS_SATURNIAN_RING_RADIUS - INNER_RING_GAP;
const JUPITER_RING_RADIUS = SATURN_RING_RADIUS - INNER_RING_GAP;
const MARS_RING_RADIUS = JUPITER_RING_RADIUS - INNER_RING_GAP;
const SUN_RING_RADIUS = MARS_RING_RADIUS - INNER_RING_GAP;
const VENUS_RING_RADIUS = SUN_RING_RADIUS - INNER_RING_GAP;
const MERCURY_RING_RADIUS = VENUS_RING_RADIUS - INNER_RING_GAP;
const MOON_RING_RADIUS = MERCURY_RING_RADIUS - INNER_RING_GAP; // == EARTH_RADIUS + INNER_RING_GAP, by construction

const RING_RADIUS_BY_BODY: Record<(typeof GEOCENTRIC_RING_ORDER)[number], number> = {
  Moon: MOON_RING_RADIUS,
  Mercury: MERCURY_RING_RADIUS,
  Venus: VENUS_RING_RADIUS,
  Sun: SUN_RING_RADIUS,
  Mars: MARS_RING_RADIUS,
  Jupiter: JUPITER_RING_RADIUS,
  Saturn: SATURN_RING_RADIUS,
};

// Same marker size everywhere, shared across all rings rather than scaled
// off any one ring's radius - small enough that adjacent rings' markers
// don't touch even when two bodies land at the same longitude.
const PLANET_MARKER_RADIUS = 7.5;

export function SkyWheel({ planets, ascendant, descendant, midheaven, mode, onModeChange, now, size = 820 }: SkyWheelProps) {
  const ascPoint = polarToPoint(CENTER_X, CENTER_Y, ZODIAC_OUTER_RADIUS + 10, 180);
  const dscPoint = polarToPoint(CENTER_X, CENTER_Y, ZODIAC_OUTER_RADIUS + 10, 0);
  // Unlike ASC/DSC, MC isn't pinned to a fixed screen angle - its angular
  // distance from the ascendant varies with latitude and time of day. A
  // small tick right on the ring marks its exact degree, so the label
  // itself can sit a bit closer in without losing precision.
  const mcAngle = screenAngle(midheaven, ascendant);
  const mcPoint = polarToPoint(CENTER_X, CENTER_Y, ZODIAC_OUTER_RADIUS + 6, mcAngle);
  const moonPhase = useMemo(() => getMoonPhase(now), [now]);

  const fixedStars = useMemo(() => {
    const tropical = getFixedStarPositions(now, FIXED_STARS);
    if (mode === "tropical") return tropical;
    return tropical.map((star) => ({ ...star, eclipticLongitude: toSidereal(star.eclipticLongitude, now) }));
  }, [now, mode]);

  const sun = planets.filter((p) => p.body === "Sun");
  const moon = planets.filter((p) => p.body === "Moon");
  const transSaturnian = planets.filter((p) => TRANS_SATURNIAN_BODIES.has(p.body));

  return (
    <div
      className="relative w-full text-neutral-200"
      style={{ "--wheel-bg": "#0a0a12", maxWidth: size } as React.CSSProperties}
    >
      <button
        type="button"
        onClick={() => onModeChange(mode === "tropical" ? "sidereal" : "tropical")}
        className="absolute top-0 right-0 z-10 rounded-full border border-neutral-600 px-3 py-1 text-xs uppercase tracking-wide text-neutral-300 hover:bg-neutral-800"
      >
        {mode}
      </button>
      <svg viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`} className="aspect-square w-full">
        {/* The horizon is the horizontal line through Ascendant (left) /
            Descendant (right) once rotated - shown purely via shading rather
            than a drawn line: lighter above (currently visible sky), darker
            below. */}
        <path
          d={`M ${CENTER_X - ZODIAC_OUTER_RADIUS} ${CENTER_Y} A ${ZODIAC_OUTER_RADIUS} ${ZODIAC_OUTER_RADIUS} 0 0 1 ${
            CENTER_X + ZODIAC_OUTER_RADIUS
          } ${CENTER_Y} Z`}
          fill="#93c5fd"
          fillOpacity={0.18}
        />
        <path
          d={`M ${CENTER_X - ZODIAC_OUTER_RADIUS} ${CENTER_Y} A ${ZODIAC_OUTER_RADIUS} ${ZODIAC_OUTER_RADIUS} 0 0 0 ${
            CENTER_X + ZODIAC_OUTER_RADIUS
          } ${CENTER_Y} Z`}
          fill="black"
          fillOpacity={0.35}
        />

        <ZodiacRing
          cx={CENTER_X}
          cy={CENTER_Y}
          innerRadius={ZODIAC_INNER_RADIUS}
          outerRadius={ZODIAC_OUTER_RADIUS}
          ascendant={ascendant}
        />

        <circle
          cx={CENTER_X}
          cy={CENTER_Y}
          r={FIXED_STARS_RING_RADIUS}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.15}
        />
        <FixedStarsRing cx={CENTER_X} cy={CENTER_Y} radius={FIXED_STARS_RING_RADIUS} ascendant={ascendant} stars={fixedStars} />

        {/* Sun/Moon "clock hands" - a thin line from Earth out to the
            zodiac ring, with a small circle where each meets the ring. */}
        <RadialHands cx={CENTER_X} cy={CENTER_Y} radius={ZODIAC_INNER_RADIUS} ascendant={ascendant} planets={[...sun, ...moon]} />

        {/* Faint guide circles marking each inner ring's path. */}
        {[TRANS_SATURNIAN_RING_RADIUS, ...Object.values(RING_RADIUS_BY_BODY)].map((r) => (
          <circle key={r} cx={CENTER_X} cy={CENTER_Y} r={r} fill="none" stroke="currentColor" strokeOpacity={0.15} />
        ))}

        <PlanetRing
          cx={CENTER_X}
          cy={CENTER_Y}
          radius={TRANS_SATURNIAN_RING_RADIUS}
          ascendant={ascendant}
          planets={transSaturnian}
          circleRadius={PLANET_MARKER_RADIUS}
        />
        {GEOCENTRIC_RING_ORDER.map((body) => (
          <PlanetRing
            key={body}
            cx={CENTER_X}
            cy={CENTER_Y}
            radius={RING_RADIUS_BY_BODY[body]}
            ascendant={ascendant}
            planets={planets.filter((p) => p.body === body)}
            circleRadius={PLANET_MARKER_RADIUS}
            moonPhase={body === "Moon" ? moonPhase : undefined}
          />
        ))}

        {/* Small ticks right on the ring marking ASC/DSC's exact degree,
            matching the one added for MC below. */}
        <path d={radialTickPath(CENTER_X, CENTER_Y, ZODIAC_OUTER_RADIUS, ZODIAC_OUTER_RADIUS + 8, 180)} stroke="#fbbf24" strokeWidth={1.5} />
        <path d={radialTickPath(CENTER_X, CENTER_Y, ZODIAC_OUTER_RADIUS, ZODIAC_OUTER_RADIUS + 8, 0)} stroke="#fbbf24" strokeWidth={1.5} />

        {/* Asc/Dsc labels. */}
        <text
          x={ascPoint.x}
          y={ascPoint.y}
          textAnchor="end"
          dominantBaseline="central"
          fontSize={13}
          fontFamily={SYMBOL_FONT_FAMILY}
          fill="#fbbf24"
        >
          <tspan x={ascPoint.x} dy="-2">
            ASC
          </tspan>
          <tspan x={ascPoint.x} dy="15" fontSize={11} fillOpacity={0.8}>
            {formatDegree(ascendant)}
          </tspan>
        </text>
        <text
          x={dscPoint.x}
          y={dscPoint.y}
          textAnchor="start"
          dominantBaseline="central"
          fontSize={13}
          fontFamily={SYMBOL_FONT_FAMILY}
          fill="#fbbf24"
        >
          <tspan x={dscPoint.x} dy="-2">
            DSC
          </tspan>
          <tspan x={dscPoint.x} dy="15" fontSize={11} fillOpacity={0.8}>
            {formatDegree(descendant)}
          </tspan>
        </text>
        {/* Same tick treatment for MC. */}
        <path d={radialTickPath(CENTER_X, CENTER_Y, ZODIAC_OUTER_RADIUS, ZODIAC_OUTER_RADIUS + 8, mcAngle)} stroke="#fbbf24" strokeWidth={1.5} />
        <text
          x={mcPoint.x}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily={SYMBOL_FONT_FAMILY}
          fill="#fbbf24"
        >
          {/* Unlike ASC/DSC (always pinned to the sides, where vertical
              stacking never dips back toward the ring), MC can land
              anywhere around the circle - including due north/south, where
              a fixed "always stack downward" layout would push one line
              back across the ring boundary. Grow both lines away from
              center instead: downward when MC is in the lower half, upward
              when it's in the upper half. */}
          <tspan x={mcPoint.x} y={mcPoint.y + (mcPoint.y < CENTER_Y ? -7 : 7)} fontSize={13}>
            MC
          </tspan>
          <tspan x={mcPoint.x} y={mcPoint.y + (mcPoint.y < CENTER_Y ? -18 : 18)} fontSize={11} fillOpacity={0.8}>
            {formatDegree(midheaven)}
          </tspan>
        </text>

        {/* Earth, at center. */}
        <circle cx={CENTER_X} cy={CENTER_Y} r={EARTH_RADIUS} fill="#1d4ed8" stroke="#93c5fd" strokeWidth={1.5} />
        <path
          d={`M ${CENTER_X - EARTH_RADIUS} ${CENTER_Y} H ${CENTER_X + EARTH_RADIUS} M ${CENTER_X} ${
            CENTER_Y - EARTH_RADIUS
          } V ${CENTER_Y + EARTH_RADIUS}`}
          stroke="#93c5fd"
          strokeOpacity={0.6}
          strokeWidth={0.75}
        />
      </svg>
    </div>
  );
}
