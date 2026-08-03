import * as Astronomy from "astronomy-engine";
import { normalizeDegrees } from "./math";
import type { GeoLocation } from "./location";

export interface MidheavenResult {
  /** Tropical ecliptic longitude of the Midheaven (MC), degrees [0, 360). */
  midheaven: number;
  /** Tropical ecliptic longitude of the Imum Coeli (IC), degrees [0, 360). */
  imumCoeli: number;
}

/**
 * Finds the Midheaven (MC) and Imum Coeli (IC) - where the local meridian
 * (the great circle through the zenith and both celestial poles) crosses the
 * ecliptic.
 *
 * Unlike the ascendant/descendant, this has a direct closed-form solution
 * with no horizon-crossing scan or azimuth-based disambiguation needed:
 * project the meridian's right ascension (RAMC, from local sidereal time)
 * onto the ecliptic using the standard RA<->longitude relation for a point
 * at ecliptic latitude 0. atan2 naturally resolves to the MC branch rather
 * than the antipodal IC branch, so there's no ambiguous second root to rule
 * out here the way there is for the ascendant.
 */
export function getMidheaven(date: Date, location: GeoLocation): MidheavenResult {
  const time = Astronomy.MakeTime(date);
  const ramcDeg = normalizeDegrees(Astronomy.SiderealTime(time) * 15 + location.longitude);
  const obliquityDeg = Astronomy.e_tilt(time).tobl;

  const ramcRad = ramcDeg * Astronomy.DEG2RAD;
  const obliquityRad = obliquityDeg * Astronomy.DEG2RAD;
  const midheaven = normalizeDegrees(
    Math.atan2(Math.sin(ramcRad), Math.cos(ramcRad) * Math.cos(obliquityRad)) * Astronomy.RAD2DEG,
  );

  return { midheaven, imumCoeli: normalizeDegrees(midheaven + 180) };
}
