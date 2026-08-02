import { normalizeDegrees } from "./math";

export type Element = "fire" | "earth" | "air" | "water";

export interface ZodiacSign {
  name: string;
  glyph: string;
  element: Element;
  /** Tropical ecliptic longitude where this sign begins, degrees [0, 330] step 30. */
  startLongitude: number;
}

export const ZODIAC_SIGNS: readonly ZodiacSign[] = [
  { name: "Aries", glyph: "♈", element: "fire", startLongitude: 0 },
  { name: "Taurus", glyph: "♉", element: "earth", startLongitude: 30 },
  { name: "Gemini", glyph: "♊", element: "air", startLongitude: 60 },
  { name: "Cancer", glyph: "♋", element: "water", startLongitude: 90 },
  { name: "Leo", glyph: "♌", element: "fire", startLongitude: 120 },
  { name: "Virgo", glyph: "♍", element: "earth", startLongitude: 150 },
  { name: "Libra", glyph: "♎", element: "air", startLongitude: 180 },
  { name: "Scorpio", glyph: "♏", element: "water", startLongitude: 210 },
  { name: "Sagittarius", glyph: "♐", element: "fire", startLongitude: 240 },
  { name: "Capricorn", glyph: "♑", element: "earth", startLongitude: 270 },
  { name: "Aquarius", glyph: "♒", element: "air", startLongitude: 300 },
  { name: "Pisces", glyph: "♓", element: "water", startLongitude: 330 },
];

export interface ZodiacPosition {
  sign: ZodiacSign;
  /** Degrees into the sign, [0, 30). */
  degreeInSign: number;
  /** Decan within the sign: 1 (0-10deg), 2 (10-20deg), or 3 (20-30deg). */
  decan: 1 | 2 | 3;
}

export function getZodiacPosition(longitude: number): ZodiacPosition {
  const lon = normalizeDegrees(longitude);
  const index = Math.floor(lon / 30);
  const sign = ZODIAC_SIGNS[index];
  const degreeInSign = lon - sign.startLongitude;
  const decan = (Math.floor(degreeInSign / 10) + 1) as 1 | 2 | 3;
  return { sign, degreeInSign, decan };
}
