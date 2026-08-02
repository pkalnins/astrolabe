import * as Astronomy from "astronomy-engine";
import { normalizeDegrees } from "./math";

export interface FixedStarDefinition {
  name: string;
  body: Astronomy.Body;
  /** J2000 right ascension, sidereal hours. */
  ra: number;
  /** J2000 declination, degrees. */
  dec: number;
  distanceLightYears: number;
}

// The four "Royal Stars" of Persian tradition, one of which watches over
// each cardinal direction/season. J2000 catalog coordinates.
export const ROYAL_STARS: readonly FixedStarDefinition[] = [
  { name: "Aldebaran", body: Astronomy.Body.Star1, ra: 4.598678, dec: 16.509167, distanceLightYears: 65 },
  { name: "Regulus", body: Astronomy.Body.Star2, ra: 10.139528, dec: 11.967194, distanceLightYears: 79 },
  { name: "Antares", body: Astronomy.Body.Star3, ra: 16.490128, dec: -26.431994, distanceLightYears: 550 },
  { name: "Fomalhaut", body: Astronomy.Body.Star4, ra: 22.960847, dec: -29.622250, distanceLightYears: 25 },
];

let starsDefined = false;

/** DefineStar's assignments are global/module-level state in astronomy-engine; only needs doing once. */
function ensureRoyalStarsDefined(): void {
  if (starsDefined) return;
  for (const star of ROYAL_STARS) {
    Astronomy.DefineStar(star.body, star.ra, star.dec, star.distanceLightYears);
  }
  starsDefined = true;
}

export interface FixedStarPosition {
  name: string;
  /** Geocentric apparent tropical ecliptic longitude, of-date, degrees [0, 360). */
  eclipticLongitude: number;
  eclipticLatitude: number;
}

export function getRoyalStarPositions(date: Date): FixedStarPosition[] {
  ensureRoyalStarsDefined();
  const time = Astronomy.MakeTime(date);
  return ROYAL_STARS.map((star) => {
    const vector = Astronomy.GeoVector(star.body, time, true);
    const ecliptic = Astronomy.Ecliptic(vector);
    return {
      name: star.name,
      eclipticLongitude: normalizeDegrees(ecliptic.elon),
      eclipticLatitude: ecliptic.elat,
    };
  });
}
