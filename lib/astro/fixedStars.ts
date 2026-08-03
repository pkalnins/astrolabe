import * as Astronomy from "astronomy-engine";
import { normalizeDegrees } from "./math";

export type StarTradition = "royal" | "behenian";

export interface FixedStarDefinition {
  name: string;
  /** J2000 right ascension, sidereal hours. */
  ra: number;
  /** J2000 declination, degrees. */
  dec: number;
  distanceLightYears: number;
  traditions: readonly StarTradition[];
}

// Two overlapping classical star lists:
// - "royal": the four Persian Royal Stars, one per cardinal direction/season.
// - "behenian": the fifteen Behenian fixed stars of medieval/Renaissance
//   astrological magic (as catalogued by Agrippa). Aldebaran, Regulus, and
//   Antares belong to both; Fomalhaut is royal-only and Scheat is
//   behenian-only.
// Ordered by J2000 right ascension (zodiacal order).
export const FIXED_STARS: readonly FixedStarDefinition[] = [
  { name: "Algol", ra: 3.136147, dec: 40.955639, distanceLightYears: 90, traditions: ["behenian"] },
  { name: "Alcyone", ra: 3.791411, dec: 24.105139, distanceLightYears: 440, traditions: ["behenian"] },
  { name: "Aldebaran", ra: 4.598678, dec: 16.509167, distanceLightYears: 65, traditions: ["royal", "behenian"] },
  { name: "Capella", ra: 5.278156, dec: 45.998, distanceLightYears: 43, traditions: ["behenian"] },
  { name: "Sirius", ra: 6.752478, dec: -16.716111, distanceLightYears: 8.6, traditions: ["behenian"] },
  { name: "Procyon", ra: 7.655033, dec: 5.225, distanceLightYears: 11.5, traditions: ["behenian"] },
  { name: "Regulus", ra: 10.139528, dec: 11.967194, distanceLightYears: 79, traditions: ["royal", "behenian"] },
  { name: "Spica", ra: 13.419883, dec: -11.161333, distanceLightYears: 250, traditions: ["behenian"] },
  { name: "Alkaid", ra: 13.792344, dec: 49.313306, distanceLightYears: 101, traditions: ["behenian"] },
  { name: "Arcturus", ra: 14.261019, dec: 19.182417, distanceLightYears: 37, traditions: ["behenian"] },
  { name: "Alphecca", ra: 15.578131, dec: 26.714694, distanceLightYears: 75, traditions: ["behenian"] },
  { name: "Antares", ra: 16.490128, dec: -26.431994, distanceLightYears: 550, traditions: ["royal", "behenian"] },
  { name: "Vega", ra: 18.61565, dec: 38.783694, distanceLightYears: 25, traditions: ["behenian"] },
  { name: "Deneb Algedi", ra: 21.784011, dec: -16.127278, distanceLightYears: 39, traditions: ["behenian"] },
  { name: "Fomalhaut", ra: 22.960847, dec: -29.62225, distanceLightYears: 25, traditions: ["royal"] },
  { name: "Scheat", ra: 23.062906, dec: 28.082778, distanceLightYears: 196, traditions: ["behenian"] },
];

export const ROYAL_STARS: readonly FixedStarDefinition[] = FIXED_STARS.filter((star) =>
  star.traditions.includes("royal"),
);

export const BEHENIAN_STARS: readonly FixedStarDefinition[] = FIXED_STARS.filter((star) =>
  star.traditions.includes("behenian"),
);

export interface FixedStarPosition {
  name: string;
  /** Geocentric apparent tropical ecliptic longitude, of-date, degrees [0, 360). */
  eclipticLongitude: number;
  eclipticLatitude: number;
}

// astronomy-engine exposes only 8 user-defined star slots (Star1..Star8), but
// a slot's definition can be overwritten at any time via DefineStar and takes
// effect immediately on the next lookup. The map/loop below never awaits, so
// nothing can run between a slot's DefineStar and its GeoVector read -
// reusing a single slot sequentially is therefore safe for any number of
// stars, not just 8.
const SCRATCH_SLOT = Astronomy.Body.Star1;

export function getFixedStarPositions(
  date: Date,
  stars: readonly FixedStarDefinition[] = FIXED_STARS,
): FixedStarPosition[] {
  const time = Astronomy.MakeTime(date);
  return stars.map((star) => {
    Astronomy.DefineStar(SCRATCH_SLOT, star.ra, star.dec, star.distanceLightYears);
    const vector = Astronomy.GeoVector(SCRATCH_SLOT, time, true);
    const ecliptic = Astronomy.Ecliptic(vector);
    return {
      name: star.name,
      eclipticLongitude: normalizeDegrees(ecliptic.elon),
      eclipticLatitude: ecliptic.elat,
    };
  });
}

export function getRoyalStarPositions(date: Date): FixedStarPosition[] {
  return getFixedStarPositions(date, ROYAL_STARS);
}

export function getBehenianStarPositions(date: Date): FixedStarPosition[] {
  return getFixedStarPositions(date, BEHENIAN_STARS);
}
