import type { CelestialBody } from "@/lib/astro/positions";

export const PLANET_GLYPHS: Record<CelestialBody, string> = {
  Sun: "☉",
  Moon: "☽",
  Mercury: "☿",
  Venus: "♀",
  Mars: "♂",
  Jupiter: "♃",
  Saturn: "♄",
  Uranus: "♅",
  Neptune: "♆",
  Pluto: "♇",
};

// Astrological Unicode symbols (Miscellaneous Symbols block) have spotty
// coverage in generic sans-serif fonts - explicitly prefer fonts known to
// render them correctly rather than relying on default fallback.
export const SYMBOL_FONT_FAMILY = '"Apple Symbols", "Noto Sans Symbols2", "Segoe UI Symbol", sans-serif';

export const ELEMENT_COLORS: Record<"fire" | "earth" | "air" | "water", string> = {
  fire: "#ef4444",
  earth: "#8b5cf6",
  air: "#eab308",
  water: "#3b82f6",
};
