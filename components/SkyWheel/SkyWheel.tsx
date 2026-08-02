"use client";

import type { PlanetPosition } from "@/lib/astro/positions";
import type { ZodiacMode } from "@/lib/hooks/useAstroState";
import { ZodiacRing } from "./ZodiacRing";
import { PlanetRing } from "./PlanetRing";
import { polarToPoint } from "./geometry";
import { SYMBOL_FONT_FAMILY } from "./glyphs";

export interface SkyWheelProps {
  planets: PlanetPosition[];
  ascendant: number;
  mode: ZodiacMode;
  onModeChange: (mode: ZodiacMode) => void;
  size?: number;
}

// Extra horizontal margin (beyond the circle itself) so the ASC/DSC labels
// at 9/3 o'clock have room to render without clipping against the SVG edge.
const VIEWBOX_W = 530;
const VIEWBOX_H = 460;
const CENTER_X = VIEWBOX_W / 2;
const CENTER_Y = VIEWBOX_H / 2;
const ZODIAC_OUTER_RADIUS = CENTER_Y - 12;
const ZODIAC_INNER_RADIUS = ZODIAC_OUTER_RADIUS - 46;
const EARTH_RADIUS = 20;

// Sun and Moon get their own rings (innermost - closest to Earth for the
// Moon, then the Sun, then the rest of the planets) so they stop colliding
// with whichever planet they happen to be passing through the same sign as.
const PLANETS_RING_RADIUS = ZODIAC_INNER_RADIUS - 38;
const SUN_RING_RADIUS = PLANETS_RING_RADIUS - 38;
const MOON_RING_RADIUS = SUN_RING_RADIUS - 38;

const PLANETS_CIRCLE_RADIUS = PLANETS_RING_RADIUS * 0.078;
const LUMINARY_CIRCLE_RADIUS = 14;

export function SkyWheel({ planets, ascendant, mode, onModeChange, size = 720 }: SkyWheelProps) {
  const ascPoint = polarToPoint(CENTER_X, CENTER_Y, ZODIAC_OUTER_RADIUS + 10, 180);
  const dscPoint = polarToPoint(CENTER_X, CENTER_Y, ZODIAC_OUTER_RADIUS + 10, 0);

  const sun = planets.filter((p) => p.body === "Sun");
  const moon = planets.filter((p) => p.body === "Moon");
  const rest = planets.filter((p) => p.body !== "Sun" && p.body !== "Moon");

  return (
    <div className="relative inline-block text-neutral-200" style={{ "--wheel-bg": "#0a0a12" } as React.CSSProperties}>
      <button
        type="button"
        onClick={() => onModeChange(mode === "tropical" ? "sidereal" : "tropical")}
        className="absolute top-0 right-0 z-10 rounded-full border border-neutral-600 px-3 py-1 text-xs uppercase tracking-wide text-neutral-300 hover:bg-neutral-800"
      >
        {mode}
      </button>
      <svg width={size} height={(size * VIEWBOX_H) / VIEWBOX_W} viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}>
        {/* Above-horizon half (currently visible sky), subtly lightened: the
            horizon is the horizontal line through Ascendant (left) /
            Descendant (right) once rotated. Against an all-black page,
            lightening "visible sky" reads better than trying to darken
            "below horizon" further. */}
        <path
          d={`M ${CENTER_X - ZODIAC_OUTER_RADIUS} ${CENTER_Y} A ${ZODIAC_OUTER_RADIUS} ${ZODIAC_OUTER_RADIUS} 0 0 1 ${
            CENTER_X + ZODIAC_OUTER_RADIUS
          } ${CENTER_Y} Z`}
          fill="#93c5fd"
          fillOpacity={0.07}
        />

        <ZodiacRing
          cx={CENTER_X}
          cy={CENTER_Y}
          innerRadius={ZODIAC_INNER_RADIUS}
          outerRadius={ZODIAC_OUTER_RADIUS}
          ascendant={ascendant}
        />

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
        />

        {/* Horizon line + Asc/Dsc labels. */}
        <line
          x1={CENTER_X - ZODIAC_OUTER_RADIUS}
          y1={CENTER_Y}
          x2={CENTER_X + ZODIAC_OUTER_RADIUS}
          y2={CENTER_Y}
          stroke="#fbbf24"
          strokeOpacity={0.7}
          strokeDasharray="4 3"
        />
        <text
          x={ascPoint.x}
          y={ascPoint.y}
          textAnchor="end"
          dominantBaseline="central"
          fontSize={13}
          fontFamily={SYMBOL_FONT_FAMILY}
          fill="#fbbf24"
        >
          ASC
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
          DSC
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
