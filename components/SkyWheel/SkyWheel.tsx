"use client";

import { useMemo } from "react";
import type { PlanetPosition } from "@/lib/astro/positions";
import { getMoonPhase } from "@/lib/astro/moonPhase";
import { getRoyalStarPositions } from "@/lib/astro/fixedStars";
import { toSidereal } from "@/lib/astro/ayanamsa";
import { getZodiacPosition } from "@/lib/astro/zodiac";
import type { ZodiacMode } from "@/lib/hooks/useAstroState";
import { ZodiacRing } from "./ZodiacRing";
import { PlanetRing } from "./PlanetRing";
import { RoyalStarsRing } from "./RoyalStarsRing";
import { polarToPoint } from "./geometry";
import { SYMBOL_FONT_FAMILY } from "./glyphs";

export interface SkyWheelProps {
  planets: PlanetPosition[];
  ascendant: number;
  descendant: number;
  mode: ZodiacMode;
  onModeChange: (mode: ZodiacMode) => void;
  now: Date;
  size?: number;
}

function formatDegree(longitude: number): string {
  const { sign, degreeInSign } = getZodiacPosition(longitude);
  return `${sign.glyph} ${Math.floor(degreeInSign)}°`;
}

// Extra margin (beyond the zodiac ring itself) so the royal-star name labels
// (the widest thing that ever renders out there - up to "Fomalhaut", measured
// via getBBox at ~39 SVG units wide) have room without clipping the SVG edge:
// ring offset (60) + label gap/marker offset (11.5) + longest label (~39),
// plus about 13% buffer for font/rendering variance across platforms.
const EXTRA_MARGIN = 125;
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
const ROYAL_STARS_RING_RADIUS = ZODIAC_OUTER_RADIUS + 60;
const EARTH_RADIUS = 20;

// Sun and Moon get their own rings (innermost - closest to Earth for the
// Moon, then the Sun, then the rest of the planets) so they stop colliding
// with whichever planet they happen to be passing through the same sign as.
const PLANETS_RING_RADIUS = ZODIAC_INNER_RADIUS - 38;
const SUN_RING_RADIUS = PLANETS_RING_RADIUS - 38;
const MOON_RING_RADIUS = SUN_RING_RADIUS - 38;

// Same marker size everywhere - Sun/Moon should read as the same size dot/disc
// as the circle markers on the rest of the planets, not bigger or smaller.
const PLANETS_CIRCLE_RADIUS = PLANETS_RING_RADIUS * 0.078;
const LUMINARY_CIRCLE_RADIUS = PLANETS_CIRCLE_RADIUS;

export function SkyWheel({ planets, ascendant, descendant, mode, onModeChange, now, size = 820 }: SkyWheelProps) {
  const ascPoint = polarToPoint(CENTER_X, CENTER_Y, ZODIAC_OUTER_RADIUS + 10, 180);
  const dscPoint = polarToPoint(CENTER_X, CENTER_Y, ZODIAC_OUTER_RADIUS + 10, 0);
  const moonPhase = useMemo(() => getMoonPhase(now), [now]);

  const royalStars = useMemo(() => {
    const tropical = getRoyalStarPositions(now);
    if (mode === "tropical") return tropical;
    return tropical.map((star) => ({ ...star, eclipticLongitude: toSidereal(star.eclipticLongitude, now) }));
  }, [now, mode]);

  const sun = planets.filter((p) => p.body === "Sun");
  const moon = planets.filter((p) => p.body === "Moon");
  const rest = planets.filter((p) => p.body !== "Sun" && p.body !== "Moon");

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
          r={ROYAL_STARS_RING_RADIUS}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.15}
        />
        <RoyalStarsRing cx={CENTER_X} cy={CENTER_Y} radius={ROYAL_STARS_RING_RADIUS} ascendant={ascendant} stars={royalStars} />

        {/* Faint guide circles marking each inner ring's path. */}
        {[PLANETS_RING_RADIUS, SUN_RING_RADIUS, MOON_RING_RADIUS].map((r) => (
          <circle key={r} cx={CENTER_X} cy={CENTER_Y} r={r} fill="none" stroke="currentColor" strokeOpacity={0.15} />
        ))}

        <PlanetRing
          cx={CENTER_X}
          cy={CENTER_Y}
          radius={PLANETS_RING_RADIUS}
          ascendant={ascendant}
          planets={rest}
          circleRadius={PLANETS_CIRCLE_RADIUS}
        />
        <PlanetRing
          cx={CENTER_X}
          cy={CENTER_Y}
          radius={SUN_RING_RADIUS}
          ascendant={ascendant}
          planets={sun}
          circleRadius={LUMINARY_CIRCLE_RADIUS}
        />
        <PlanetRing
          cx={CENTER_X}
          cy={CENTER_Y}
          radius={MOON_RING_RADIUS}
          ascendant={ascendant}
          planets={moon}
          circleRadius={LUMINARY_CIRCLE_RADIUS}
          moonPhase={moonPhase}
        />

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
