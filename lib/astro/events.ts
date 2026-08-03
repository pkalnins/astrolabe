import * as Astronomy from "astronomy-engine";
import type { GeoLocation } from "./location";

export interface RiseSetEvent {
  time: Date;
  /** Compass bearing on the horizon, degrees clockwise from true north. */
  azimuth: number;
}

export interface RiseSetTimes {
  rise: RiseSetEvent | null;
  set: RiseSetEvent | null;
}

function toObserver(location: GeoLocation): Astronomy.Observer {
  return new Astronomy.Observer(location.latitude, location.longitude, location.elevation ?? 0);
}

function azimuthAt(body: Astronomy.Body, time: Astronomy.AstroTime, observer: Astronomy.Observer): number {
  const equator = Astronomy.Equator(body, time, observer, true, true);
  return Astronomy.Horizon(time, observer, equator.ra, equator.dec, "normal").azimuth;
}

function riseSet(body: Astronomy.Body, date: Date, location: GeoLocation): RiseSetTimes {
  const observer = toObserver(location);
  const time = Astronomy.MakeTime(date);
  const riseTime = Astronomy.SearchRiseSet(body, observer, +1, time, 1);
  const setTime = Astronomy.SearchRiseSet(body, observer, -1, time, 1);
  return {
    rise: riseTime ? { time: riseTime.date, azimuth: azimuthAt(body, riseTime, observer) } : null,
    set: setTime ? { time: setTime.date, azimuth: azimuthAt(body, setTime, observer) } : null,
  };
}

export function getSunriseSunset(date: Date, location: GeoLocation): RiseSetTimes {
  return riseSet(Astronomy.Body.Sun, date, location);
}

export function getMoonriseMoonset(date: Date, location: GeoLocation): RiseSetTimes {
  return riseSet(Astronomy.Body.Moon, date, location);
}

/**
 * Midnight, local time, on the given date's calendar day. Anchoring a
 * rise/set query here (rather than at the current moment) means the result
 * is always "today's" rise and set - stable throughout the day - rather
 * than "the next rise" and "the next set" from right now, which can land on
 * different calendar days from each other once today's occurrence of one of
 * them has already passed (e.g. checking mid-afternoon would otherwise show
 * tomorrow's sunrise paired with today's sunset).
 */
export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
