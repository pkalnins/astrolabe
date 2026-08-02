import * as Astronomy from "astronomy-engine";
import type { GeoLocation } from "./location";
import type { CelestialBody } from "./positions";

// Chaldean order (by decreasing geocentric orbital period - slowest/farthest
// to fastest/closest), the classical sequence planetary hours cycle through.
export const CHALDEAN_ORDER: readonly CelestialBody[] = ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon"];

// The planet ruling the first hour of each weekday, indexed like Date.getDay() (Sunday=0).
// Note: because 24 hours / 7 planets leaves a remainder of 3, each successive
// day's ruler is exactly 3 steps further around CHALDEAN_ORDER than the
// previous day's - this is the classical origin of the weekday order itself.
export const DAY_RULERS: readonly CelestialBody[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

export interface PlanetaryHourInfo {
  ruler: CelestialBody;
  /** 1-24: 1-12 are the twelve daytime hours, 13-24 the twelve nighttime hours. */
  hourNumber: number;
  isDaytime: boolean;
  start: Date;
  end: Date;
}

function toObserver(location: GeoLocation): Astronomy.Observer {
  return new Astronomy.Observer(location.latitude, location.longitude, location.elevation ?? 0);
}

function hourWithin(
  now: Date,
  segmentStart: Date,
  segmentEnd: Date,
  rulerStartIndex: number,
  hourOffset: 0 | 12,
  isDaytime: boolean,
): PlanetaryHourInfo {
  const hourLengthMs = (segmentEnd.getTime() - segmentStart.getTime()) / 12;
  const index = Math.min(11, Math.max(0, Math.floor((now.getTime() - segmentStart.getTime()) / hourLengthMs)));
  const ruler = CHALDEAN_ORDER[(rulerStartIndex + hourOffset + index) % 7];
  return {
    ruler,
    hourNumber: hourOffset + index + 1,
    isDaytime,
    start: new Date(segmentStart.getTime() + index * hourLengthMs),
    end: new Date(segmentStart.getTime() + (index + 1) * hourLengthMs),
  };
}

/**
 * The classical planetary hour system: each day (sunrise to sunrise) is
 * divided into 12 daytime "hours" (sunrise-sunset) and 12 nighttime hours
 * (sunset-sunrise), each of unequal clock length, cycling through the seven
 * classical planets in Chaldean order starting from that day's ruler.
 *
 * Note: which weekday a sunrise "belongs to" is read via the JS runtime's
 * local timezone, not a timezone looked up from the observer's coordinates
 * (astronomy-engine has no such lookup) - matches this app's general
 * assumption elsewhere that the browser's timezone is the observer's.
 */
export function getPlanetaryHour(date: Date, location: GeoLocation): PlanetaryHourInfo {
  const observer = toObserver(location);
  const time = Astronomy.MakeTime(date);

  const prevSunrise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, time, -2);
  const prevSunset = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, time, -2);
  const nextSunrise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, time, 2);
  const nextSunset = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, time, 2);

  if (!prevSunrise || !prevSunset || !nextSunrise || !nextSunset) {
    throw new Error(
      "Planetary hours require a sunrise and sunset near this date/location (unavailable e.g. near the poles).",
    );
  }

  const isDaytime = prevSunrise.date.getTime() > prevSunset.date.getTime();
  const dayRulerIndex = CHALDEAN_ORDER.indexOf(DAY_RULERS[prevSunrise.date.getDay()]);

  if (isDaytime) {
    return hourWithin(date, prevSunrise.date, nextSunset.date, dayRulerIndex, 0, true);
  }
  return hourWithin(date, prevSunset.date, nextSunrise.date, dayRulerIndex, 12, false);
}
