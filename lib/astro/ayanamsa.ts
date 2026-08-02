import { normalizeDegrees } from "./math";

// Linear approximation of the Lahiri ayanamsa: anchor value at J2000.0 plus the
// general precession rate. True Lahiri includes small periodic terms, but for
// a qualitative sky view the linear approximation is well within display precision.
const J2000_AYANAMSA_DEG = 23.85306;
const AYANAMSA_RATE_DEG_PER_YEAR = 50.2879 / 3600;

const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
const MS_PER_JULIAN_YEAR = 365.25 * 24 * 3600 * 1000;

export function getLahiriAyanamsa(date: Date): number {
  const years = (date.getTime() - J2000_MS) / MS_PER_JULIAN_YEAR;
  return J2000_AYANAMSA_DEG + AYANAMSA_RATE_DEG_PER_YEAR * years;
}

export function toSidereal(tropicalLongitude: number, date: Date): number {
  return normalizeDegrees(tropicalLongitude - getLahiriAyanamsa(date));
}
