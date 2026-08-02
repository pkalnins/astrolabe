import * as Astronomy from "astronomy-engine";
import { normalizeDegrees } from "./math";

export type MoonPhaseName =
  | "New Moon"
  | "Waxing Crescent"
  | "First Quarter"
  | "Waxing Gibbous"
  | "Full Moon"
  | "Waning Gibbous"
  | "Last Quarter"
  | "Waning Crescent";

export interface MoonPhaseInfo {
  /** 0-360: 0 = new moon, 90 = first quarter, 180 = full moon, 270 = last quarter. */
  angle: number;
  /** Illuminated fraction of the visible disc, 0-1. */
  illuminatedFraction: number;
  name: MoonPhaseName;
  /** Emoji glyph for the phase (widely supported, unlike the rarer astrological symbols). */
  glyph: string;
}

const PHASE_NAMES: MoonPhaseName[] = [
  "New Moon",
  "Waxing Crescent",
  "First Quarter",
  "Waxing Gibbous",
  "Full Moon",
  "Waning Gibbous",
  "Last Quarter",
  "Waning Crescent",
];

const PHASE_GLYPHS: Record<MoonPhaseName, string> = {
  "New Moon": "🌑",
  "Waxing Crescent": "🌒",
  "First Quarter": "🌓",
  "Waxing Gibbous": "🌔",
  "Full Moon": "🌕",
  "Waning Gibbous": "🌖",
  "Last Quarter": "🌗",
  "Waning Crescent": "🌘",
};

export function getMoonPhase(date: Date): MoonPhaseInfo {
  const time = Astronomy.MakeTime(date);
  const angle = normalizeDegrees(Astronomy.MoonPhase(time));
  const illuminatedFraction = Astronomy.Illumination(Astronomy.Body.Moon, time).phase_fraction;
  // 8 named phases, each an even 45-degree bucket centered on the named angle.
  const name = PHASE_NAMES[Math.round(angle / 45) % 8];
  return { angle, illuminatedFraction, name, glyph: PHASE_GLYPHS[name] };
}
