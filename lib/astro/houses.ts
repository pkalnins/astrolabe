import * as Astronomy from "astronomy-engine";
import { normalizeDegrees } from "./math";
import { getAscendant } from "./ascendant";
import { getMidheaven } from "./midheaven";
import type { GeoLocation } from "./location";

export interface HouseCusp {
  /** 1-12. */
  house: number;
  /** Ecliptic longitude of the cusp - 0 degrees of its sign, not the exact ascendant degree. */
  longitude: number;
}

export type HouseSystem = "whole-sign" | "placidus";

/**
 * Which house (1-12) a given ecliptic longitude falls in, given a set of
 * cusps from either house system above. Walks each house's span from its own
 * cusp to the next one's (wrapping past 360 degrees as needed, since a house
 * - most often house 12 - can straddle the 0-degree point) and returns the
 * first one the longitude falls inside.
 */
export function getHouseOfLongitude(longitude: number, houses: readonly HouseCusp[]): number {
  for (let i = 0; i < houses.length; i++) {
    const start = houses[i].longitude;
    const end = houses[(i + 1) % houses.length].longitude;
    const span = normalizeDegrees(end - start);
    const offset = normalizeDegrees(longitude - start);
    if (offset < span) return houses[i].house;
  }
  // Unreachable for a well-formed 12-cusp set (the spans above always cover
  // the full circle), but keeps the return type non-optional.
  return houses[houses.length - 1].house;
}

/**
 * Whole Sign houses: house 1 is the entire sign containing the ascendant,
 * and each subsequent house is simply the next sign in zodiacal order. Every
 * cusp lands exactly on a sign boundary (a multiple of 30 degrees) rather
 * than on the ascendant's own exact degree - the ascendant can fall
 * anywhere within the 1st house, not necessarily at its start.
 *
 * The oldest attested house system (used throughout Hellenistic astrology,
 * and still the default in Vedic/Jyotish astrology) - and the simplest,
 * since it needs nothing beyond the ascendant already computed elsewhere.
 */
export function getWholeSignHouses(ascendant: number): HouseCusp[] {
  const ascendantSignStart = Math.floor(normalizeDegrees(ascendant) / 30) * 30;
  return Array.from({ length: 12 }, (_, i) => ({
    house: i + 1,
    longitude: normalizeDegrees(ascendantSignStart + i * 30),
  }));
}

const PLACIDUS_ITERATIONS = 20;

/** Ecliptic longitude (latitude 0) of the point with the given right ascension. */
function eclipticLongitudeFromRA(raDeg: number, obliquityDeg: number): number {
  const raRad = raDeg * Astronomy.DEG2RAD;
  const oblRad = obliquityDeg * Astronomy.DEG2RAD;
  return normalizeDegrees(Math.atan2(Math.sin(raRad), Math.cos(raRad) * Math.cos(oblRad)) * Astronomy.RAD2DEG);
}

function declinationOfEclipticLongitude(longitudeDeg: number, obliquityDeg: number): number {
  const lonRad = longitudeDeg * Astronomy.DEG2RAD;
  const oblRad = obliquityDeg * Astronomy.DEG2RAD;
  return Math.asin(Math.sin(oblRad) * Math.sin(lonRad)) * Astronomy.RAD2DEG;
}

/**
 * Solves for a Placidus intermediate cusp: the ecliptic point sitting
 * `fraction` of the way (by *time*, not angle) along its own diurnal or
 * nocturnal semi-arc, counted from the culmination/anti-culmination toward
 * the horizon. `diurnal` picks which semi-arc - true for cusps 11/12
 * (between MC and ASC, above the horizon), false for 2/3 (between ASC and
 * IC, below it).
 *
 * The equation is implicit (a point's semi-arc depends on its own
 * declination, which depends on its own longitude - the very thing being
 * solved for), so this iterates by fixed-point substitution: guess a
 * longitude, derive its declination and semi-arc, use that to compute the
 * target right ascension, convert back to a longitude, repeat. The
 * ecliptic's declination varies gently with longitude (bounded by the
 * obliquity, ~23.4 degrees), so this converges to sub-arcsecond precision
 * well within the fixed iteration count below.
 */
function solvePlacidusCusp(ramcDeg: number, fraction: number, diurnal: boolean, latitudeDeg: number, obliquityDeg: number): number {
  const latRad = latitudeDeg * Astronomy.DEG2RAD;
  // Zeroth approximation: assume declination 0 (a 90-degree semi-arc), the
  // same starting point regardless of latitude - iteration corrects it fast.
  let longitude = eclipticLongitudeFromRA(diurnal ? ramcDeg + fraction * 90 : ramcDeg + 180 - fraction * 90, obliquityDeg);

  for (let i = 0; i < PLACIDUS_ITERATIONS; i++) {
    const decRad = declinationOfEclipticLongitude(longitude, obliquityDeg) * Astronomy.DEG2RAD;
    // Diurnal semi-arc: arccos(-tan(lat)tan(dec)). Nocturnal: arccos(+tan(lat)tan(dec))
    // (= 180 - diurnal, for the same declination). Clamped defensively - the
    // real guard against an out-of-domain (circumpolar) argument is the
    // latitude check in getPlacidusHouses, but this keeps a borderline
    // floating-point nudge from producing NaN mid-iteration.
    const cosSemiArc = Math.max(-1, Math.min(1, (diurnal ? -1 : 1) * Math.tan(latRad) * Math.tan(decRad)));
    const semiArcDeg = Math.acos(cosSemiArc) * Astronomy.RAD2DEG;
    const targetRa = diurnal ? ramcDeg + fraction * semiArcDeg : ramcDeg + 180 - fraction * semiArcDeg;
    longitude = eclipticLongitudeFromRA(targetRa, obliquityDeg);
  }

  return longitude;
}

// The real Arctic/Antarctic circle latitude (90 - obliquity): beyond it, the
// most extreme-declination point on the ecliptic (declination = obliquity)
// is circumpolar - its "semi-diurnal arc" equation has no solution, the same
// reason the Sun itself never sets there in summer. Below this latitude,
// every point on the ecliptic still reliably rises and sets.
function placidusMaxAbsLatitude(obliquityDeg: number): number {
  return 90 - obliquityDeg;
}

/**
 * Placidus houses: the intermediate cusps (11, 12, 2, 3) trisect each point's
 * own semi-diurnal/nocturnal arc by time rather than splitting the ecliptic
 * evenly by longitude (Equal) or by sign (Whole Sign) - the most common
 * default in mainstream Western astrology software. Returns null above the
 * Arctic/Antarctic circle, where the underlying arc equation breaks down
 * (see placidusMaxAbsLatitude) - callers should fall back to another system
 * there, the same way real Placidus implementations do.
 */
export function getPlacidusHouses(date: Date, location: GeoLocation): HouseCusp[] | null {
  const time = Astronomy.MakeTime(date);
  const obliquityDeg = Astronomy.e_tilt(time).tobl;
  if (Math.abs(location.latitude) >= placidusMaxAbsLatitude(obliquityDeg)) return null;

  const ramcDeg = normalizeDegrees(Astronomy.SiderealTime(time) * 15 + location.longitude);
  const { ascendant, descendant } = getAscendant(date, location);
  const { midheaven, imumCoeli } = getMidheaven(date, location);

  const cusp11 = solvePlacidusCusp(ramcDeg, 1 / 3, true, location.latitude, obliquityDeg);
  const cusp12 = solvePlacidusCusp(ramcDeg, 2 / 3, true, location.latitude, obliquityDeg);
  const cusp2 = solvePlacidusCusp(ramcDeg, 2 / 3, false, location.latitude, obliquityDeg);
  const cusp3 = solvePlacidusCusp(ramcDeg, 1 / 3, false, location.latitude, obliquityDeg);

  // Houses 5, 6, 8, 9 are exactly antipodal to 11, 12, 2, 3 - true of every
  // quadrant house system, since the whole cusp configuration is symmetric
  // through the Earth's center.
  const longitudeByHouse: Record<number, number> = {
    1: ascendant,
    2: cusp2,
    3: cusp3,
    4: imumCoeli,
    5: normalizeDegrees(cusp11 + 180),
    6: normalizeDegrees(cusp12 + 180),
    7: descendant,
    8: normalizeDegrees(cusp2 + 180),
    9: normalizeDegrees(cusp3 + 180),
    10: midheaven,
    11: cusp11,
    12: cusp12,
  };

  return Array.from({ length: 12 }, (_, i) => ({ house: i + 1, longitude: longitudeByHouse[i + 1] }));
}
