import * as Astronomy from "astronomy-engine";

const KM_PER_AU = 149_597_870.7;

// Commonly cited modern extremes for lunar perigee/apogee distance.
const MIN_DISTANCE_KM = 356_500;
const MAX_DISTANCE_KM = 406_700;

export type MoonDistanceCategory = "Close" | "Typical" | "Far";

export interface MoonDistanceInfo {
  distanceKm: number;
  /** 0 = closest possible (perigee), 1 = farthest possible (apogee). */
  fraction: number;
  category: MoonDistanceCategory;
}

export function getMoonDistance(date: Date): MoonDistanceInfo {
  const time = Astronomy.MakeTime(date);
  const distanceKm = Astronomy.GeoMoon(time).Length() * KM_PER_AU;
  const fraction = (distanceKm - MIN_DISTANCE_KM) / (MAX_DISTANCE_KM - MIN_DISTANCE_KM);
  const category: MoonDistanceCategory = fraction < 0.25 ? "Close" : fraction > 0.75 ? "Far" : "Typical";
  return { distanceKm, fraction, category };
}
