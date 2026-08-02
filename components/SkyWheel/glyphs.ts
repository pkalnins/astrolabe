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

// Traditional astrological planetary colors, used both on the wheel and
// anywhere else a planet is referenced (e.g. the Planetary Hour card).
export const PLANET_COLORS: Record<CelestialBody, string> = {
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
