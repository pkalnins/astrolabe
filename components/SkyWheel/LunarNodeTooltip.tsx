"use client";

import { getZodiacPosition } from "@/lib/astro/zodiac";
import { ELEMENT_COLORS, SYMBOL_FONT_FAMILY } from "./glyphs";

// Simpler than the planet tooltips - no dedicated card, no retrograde
// concept, and no aspects computed for the nodes anywhere else in the app -
// so zodiac position is the one piece of real information to show.
export function LunarNodeTooltip({ name, glyph, longitude, color }: { name: string; glyph: string; longitude: number; color: string }) {
  const { sign, degreeInSign } = getZodiacPosition(longitude);

  return (
    <div className="w-64 rounded-lg border border-neutral-700 bg-neutral-900/95 p-3 text-sm shadow-xl backdrop-blur">
      <div className="mb-1.5 flex items-center gap-2">
        <span style={{ color, fontFamily: SYMBOL_FONT_FAMILY }} className="text-lg leading-none">
          {glyph}
        </span>
        <span>{name}</span>
      </div>
      <div className="flex items-center gap-2">
        <span style={{ color: ELEMENT_COLORS[sign.element], fontFamily: SYMBOL_FONT_FAMILY }} className="text-lg leading-none">
          {sign.glyph}
        </span>
        <span>
          {sign.name} {Math.floor(degreeInSign)}°
        </span>
      </div>
    </div>
  );
}
