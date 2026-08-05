"use client";

import type { PlanetPosition } from "@/lib/astro/positions";
import { getZodiacPosition } from "@/lib/astro/zodiac";
import { PLANET_GLYPHS, PLANET_COLORS, ELEMENT_COLORS, SYMBOL_FONT_FAMILY } from "./glyphs";
import { AspectsList } from "./AspectsList";

// No dedicated dashboard card exists for these bodies (unlike the Sun/Moon),
// so this shows the two things the wheel itself already tracks per-planet:
// zodiac position and current aspects - rather than inventing per-body
// content with no equivalent elsewhere in the app.
export function PlanetTooltip({ planet, now }: { planet: PlanetPosition; now: Date }) {
  const { sign, degreeInSign } = getZodiacPosition(planet.eclipticLongitude);
  const color = PLANET_COLORS[planet.body];

  return (
    <div className="w-64 rounded-lg border border-neutral-700 bg-neutral-900/95 p-3 text-sm shadow-xl backdrop-blur">
      <div className="mb-1.5 flex items-center gap-2">
        <span style={{ color, fontFamily: SYMBOL_FONT_FAMILY }} className="text-2xl leading-none">
          {PLANET_GLYPHS[planet.body]}
        </span>
        <span>{planet.body}</span>
        <span className="text-neutral-600">·</span>
        <span style={{ color: ELEMENT_COLORS[sign.element], fontFamily: SYMBOL_FONT_FAMILY }} className="text-lg leading-none">
          {sign.glyph}
        </span>
        <span>
          {sign.name} {Math.floor(degreeInSign)}°
        </span>
      </div>
      {planet.retrograde && <div className="mb-1.5 text-xs text-amber-400">℞ Retrograde</div>}
      <div className="mt-2">
        <AspectsList body={planet.body} now={now} />
      </div>
    </div>
  );
}
