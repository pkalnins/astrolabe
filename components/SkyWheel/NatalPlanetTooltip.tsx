"use client";

import type { PlanetPosition } from "@/lib/astro/positions";
import { getZodiacPosition } from "@/lib/astro/zodiac";
import { PLANET_GLYPHS, PLANET_COLORS, ELEMENT_COLORS, SYMBOL_FONT_FAMILY } from "./glyphs";

// Simpler than PlanetTooltip - no aspects list, since AspectsList computes
// aspects among the *current* transiting planets, not against a natal chart.
export function NatalPlanetTooltip({ planet }: { planet: PlanetPosition }) {
  const { sign, degreeInSign } = getZodiacPosition(planet.eclipticLongitude);
  const color = PLANET_COLORS[planet.body];

  return (
    <div className="w-56 rounded-lg border border-neutral-700 bg-neutral-900/95 p-3 text-sm shadow-xl backdrop-blur">
      <div className="mb-1.5 flex items-center gap-2">
        <span style={{ color, fontFamily: SYMBOL_FONT_FAMILY }} className="text-2xl leading-none">
          {PLANET_GLYPHS[planet.body]}
        </span>
        <span>Natal {planet.body}</span>
      </div>
      <div className="flex items-center gap-2">
        <span style={{ color: ELEMENT_COLORS[sign.element], fontFamily: SYMBOL_FONT_FAMILY }} className="text-lg leading-none">
          {sign.glyph}
        </span>
        <span>
          {sign.name} {Math.floor(degreeInSign)}°
        </span>
      </div>
      {planet.retrograde && <div className="mt-1.5 text-xs text-amber-400">℞ Retrograde at birth</div>}
    </div>
  );
}
