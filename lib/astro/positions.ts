import * as Astronomy from "astronomy-engine";
import { normalizeDegrees, signedDelta } from "./math";

export const BODIES = [
  "Sun",
  "Moon",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto",
] as const;

export type CelestialBody = (typeof BODIES)[number];

export interface PlanetPosition {
  body: CelestialBody;
  /** Geocentric apparent tropical ecliptic longitude, in degrees [0, 360). */
  eclipticLongitude: number;
  /** Signed apparent motion over the last 24 hours, in degrees/day. */
  dailyMotion: number;
  retrograde: boolean;
}

/**
 * Geocentric apparent ecliptic longitude of `body` at `time`.
 * astronomy-engine's own `EclipticLongitude` is heliocentric, so Sun/Moon/planets
 * each need a different geocentric path.
 */
function eclipticLongitudeOf(body: CelestialBody, time: Astronomy.AstroTime): number {
  if (body === "Sun") {
    return Astronomy.SunPosition(time).elon;
  }
  if (body === "Moon") {
    return Astronomy.EclipticGeoMoon(time).lon;
  }
  const vector = Astronomy.GeoVector(body as Astronomy.Body, time, true);
  return Astronomy.Ecliptic(vector).elon;
}

/** Just the longitude, skipping the prior-day sample `getPlanetPosition` uses
 * for daily motion - for callers (e.g. void-of-course search) that evaluate
 * many timestamps and don't need motion/retrograde at each one. */
export function getEclipticLongitude(body: CelestialBody, date: Date): number {
  const time = Astronomy.MakeTime(date);
  return normalizeDegrees(eclipticLongitudeOf(body, time));
}

export function getPlanetPosition(body: CelestialBody, date: Date): PlanetPosition {
  const time = Astronomy.MakeTime(date);
  const priorTime = Astronomy.MakeTime(new Date(date.getTime() - 24 * 3600 * 1000));

  const longitude = normalizeDegrees(eclipticLongitudeOf(body, time));
  const priorLongitude = normalizeDegrees(eclipticLongitudeOf(body, priorTime));
  const dailyMotion = signedDelta(priorLongitude, longitude);

  return {
    body,
    eclipticLongitude: longitude,
    dailyMotion,
    retrograde: dailyMotion < 0,
  };
}

export function getAllPlanetPositions(date: Date): PlanetPosition[] {
  return BODIES.map((body) => getPlanetPosition(body, date));
}
