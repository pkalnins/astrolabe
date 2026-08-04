import * as Astronomy from "astronomy-engine";
import { normalizeDegrees } from "./math";

// IAU 1958 definition of the galactic coordinate system's north pole,
// J2000 equatorial coordinates: RA 12h51m26.28s, Dec +27°07'42.0".
const GALACTIC_NORTH_POLE_RA_HOURS = 192.85948 / 15;
const GALACTIC_NORTH_POLE_DEC_DEG = 27.12825;

export interface GalacticPlaneNode {
  /** Geocentric apparent tropical ecliptic longitude, of-date, degrees [0, 360). */
  eclipticLongitude: number;
}

// Reuses fixedStars.ts's scratch-slot trick (see its SCRATCH_SLOT comment for
// why sequential reuse is safe) but its own slot, so the two never risk
// clobbering each other if a future caller interleaves them.
const SCRATCH_SLOT = Astronomy.Body.Star2;

/**
 * The two points where the galactic plane (the Milky Way's own equator)
 * crosses the ecliptic (the zodiac's plane).
 *
 * Found by treating the galactic north pole as a fixed direction, run
 * through the same of-date geocentric pipeline as real stars in
 * fixedStars.ts, then stepping 90 degrees off its ecliptic longitude in
 * both directions. For any two great circles, the points where one crosses
 * the other's reference plane always sit exactly 90 degrees from that
 * circle's pole's own longitude in that reference frame - regardless of the
 * pole's latitude - since a point at longitude lambda on the reference
 * plane has (unit vector) dot (pole vector) = cos(pole latitude) *
 * cos(lambda - pole longitude), which is zero only at lambda = pole
 * longitude +/- 90.
 */
export function getGalacticPlaneNodes(date: Date): GalacticPlaneNode[] {
  const time = Astronomy.MakeTime(date);
  Astronomy.DefineStar(SCRATCH_SLOT, GALACTIC_NORTH_POLE_RA_HOURS, GALACTIC_NORTH_POLE_DEC_DEG, 1e6);
  const vector = Astronomy.GeoVector(SCRATCH_SLOT, time, true);
  const poleLongitude = normalizeDegrees(Astronomy.Ecliptic(vector).elon);

  return [
    { eclipticLongitude: normalizeDegrees(poleLongitude - 90) },
    { eclipticLongitude: normalizeDegrees(poleLongitude + 90) },
  ];
}
