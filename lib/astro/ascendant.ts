import * as Astronomy from "astronomy-engine";
import { normalizeDegrees } from "./math";
import type { GeoLocation } from "./location";

export interface AscendantResult {
  /** Tropical ecliptic longitude of the ascendant (rising sign point), degrees [0, 360). */
  ascendant: number;
  /** Tropical ecliptic longitude of the descendant, degrees [0, 360). */
  descendant: number;
  /**
   * Compass bearing of the ascendant point on the physical horizon, degrees
   * clockwise from true north. Unlike the zodiac longitude, this doesn't
   * change with the tropical/sidereal toggle - it's a fixed direction you
   * could point a compass at.
   */
  ascendantAzimuth: number;
  /** Compass bearing of the descendant point on the physical horizon. */
  descendantAzimuth: number;
}

const SCAN_STEP_DEGREES = 0.1;

// astronomy-engine's .d.ts types this parameter as `string`, but its runtime
// implementation accepts `null` to mean "no refraction correction".
const NO_REFRACTION = null as unknown as string;

/**
 * Altitude of the ecliptic point at longitude `lonDeg` (latitude 0), given a
 * precomputed ECT->HOR rotation matrix.
 */
function altitudeAt(lonDeg: number, time: Astronomy.AstroTime, rotation: Astronomy.RotationMatrix): number {
  const vector = Astronomy.VectorFromSphere(new Astronomy.Spherical(0, lonDeg, 1), time);
  const horVector = Astronomy.RotateVector(rotation, vector);
  // No refraction: the ascendant/descendant are defined by the geometric
  // (great-circle) horizon. Refraction turns the horizon into a small circle,
  // which would make the two ecliptic crossings not quite antipodal.
  return Astronomy.HorizonFromVector(horVector, NO_REFRACTION).lat;
}

function azimuthAt(lonDeg: number, time: Astronomy.AstroTime, rotation: Astronomy.RotationMatrix): number {
  const vector = Astronomy.VectorFromSphere(new Astronomy.Spherical(0, lonDeg, 1), time);
  const horVector = Astronomy.RotateVector(rotation, vector);
  return Astronomy.HorizonFromVector(horVector, "normal").lon;
}

/**
 * Finds where the ecliptic crosses the local horizon: the ascendant (rising,
 * eastern side) and descendant (setting, western side).
 *
 * Computed by rotating the ecliptic plane into horizontal coordinates and
 * scanning for the two altitude=0 crossings, rather than a closed-form
 * trigonometric formula, so it reuses astronomy-engine's own tested rotation
 * matrices instead of a hand-derived (and easy to get sign-wrong) formula.
 */
export function getAscendant(date: Date, location: GeoLocation): AscendantResult {
  const time = Astronomy.MakeTime(date);
  const observer = new Astronomy.Observer(location.latitude, location.longitude, location.elevation ?? 0);

  const rotation = Astronomy.CombineRotation(
    Astronomy.Rotation_ECT_EQD(time),
    Astronomy.Rotation_EQD_HOR(time, observer),
  );

  const crossings: number[] = [];
  let prevLon = 0;
  let prevAlt = altitudeAt(0, time, rotation);

  for (let lon = SCAN_STEP_DEGREES; lon <= 360; lon += SCAN_STEP_DEGREES) {
    const alt = altitudeAt(lon, time, rotation);
    if ((prevAlt <= 0 && alt > 0) || (prevAlt >= 0 && alt < 0)) {
      const t = prevAlt / (prevAlt - alt);
      crossings.push(normalizeDegrees(prevLon + t * (lon - prevLon)));
    }
    prevLon = lon;
    prevAlt = alt;
  }

  if (crossings.length !== 2) {
    throw new Error(
      `Expected exactly 2 ecliptic/horizon crossings, found ${crossings.length}. ` +
        "This can happen at extreme latitudes where the ecliptic doesn't cleanly rise and set.",
    );
  }

  // Ascendant rises on the eastern side of the sky: azimuth in (0, 180),
  // measured clockwise from north. Descendant is the other crossing.
  const [a, b] = crossings;
  const aAzimuth = azimuthAt(a, time, rotation);
  const bAzimuth = azimuthAt(b, time, rotation);
  const isARising = aAzimuth > 0 && aAzimuth < 180;
  const ascendant = isARising ? a : b;
  const descendant = isARising ? b : a;
  const ascendantAzimuth = isARising ? aAzimuth : bAzimuth;
  const descendantAzimuth = isARising ? bAzimuth : aAzimuth;

  return { ascendant, descendant, ascendantAzimuth, descendantAzimuth };
}
