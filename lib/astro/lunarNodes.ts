import * as Astronomy from "astronomy-engine";
import { normalizeDegrees } from "./math";

export interface LunarNodes {
  /** Geocentric apparent tropical ecliptic longitude, of-date, degrees [0, 360). */
  northNodeLongitude: number;
  /** Always exactly 180 degrees from the north node. */
  southNodeLongitude: number;
}

/**
 * The Moon's True Node axis: the two points where its instantaneous orbital
 * plane crosses the ecliptic. Found the same way as the galactic plane's
 * crossing points (see galacticPlane.ts) - take the pole of the relevant
 * plane and step 90 degrees off its ecliptic longitude - but here the
 * "plane" is the Moon's own orbit right now, so its pole (the orbital
 * angular momentum direction, position x velocity) is derived on the fly
 * from the Moon's instantaneous state rather than from a fixed catalog
 * direction.
 *
 * This is the True Node, which oscillates by about 1.5 degrees around the
 * smoother Mean Node with a ~173-day period as the Sun perturbs the Moon's
 * orbit - distinct from (and more precise than) a mean-motion formula.
 * Verified against Astronomy.SearchMoonNode: at the exact moment of a real
 * ascending/descending crossing, this function's corresponding longitude
 * matches the Moon's actual ecliptic longitude at that instant.
 *
 * North (ascending) = pole longitude + 90; south (descending) = pole
 * longitude - 90. This sign isn't arbitrary like the galactic plane's
 * antipodal pair - ascending node longitude = atan2(Lx, -Ly) for orbital
 * angular momentum L in ecliptic Cartesian coordinates, which works out to
 * the pole's own ecliptic longitude plus 90 degrees.
 */
export function getLunarNodes(date: Date): LunarNodes {
  const time = Astronomy.MakeTime(date);
  const state = Astronomy.GeoMoonState(time);
  const normal = new Astronomy.Vector(
    state.y * state.vz - state.z * state.vy,
    state.z * state.vx - state.x * state.vz,
    state.x * state.vy - state.y * state.vx,
    time,
  );
  const poleLongitude = normalizeDegrees(Astronomy.Ecliptic(normal).elon);

  return {
    northNodeLongitude: normalizeDegrees(poleLongitude + 90),
    southNodeLongitude: normalizeDegrees(poleLongitude - 90),
  };
}
