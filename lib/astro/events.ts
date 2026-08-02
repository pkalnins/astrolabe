import * as Astronomy from "astronomy-engine";
import type { GeoLocation } from "./location";

export interface RiseSetTimes {
  rise: Date | null;
  set: Date | null;
}

function toObserver(location: GeoLocation): Astronomy.Observer {
  return new Astronomy.Observer(location.latitude, location.longitude, location.elevation ?? 0);
}

function riseSet(body: Astronomy.Body, date: Date, location: GeoLocation): RiseSetTimes {
  const observer = toObserver(location);
  const time = Astronomy.MakeTime(date);
  const rise = Astronomy.SearchRiseSet(body, observer, +1, time, 1);
  const set = Astronomy.SearchRiseSet(body, observer, -1, time, 1);
  return { rise: rise?.date ?? null, set: set?.date ?? null };
}

export function getSunriseSunset(date: Date, location: GeoLocation): RiseSetTimes {
  return riseSet(Astronomy.Body.Sun, date, location);
}

export function getMoonriseMoonset(date: Date, location: GeoLocation): RiseSetTimes {
  return riseSet(Astronomy.Body.Moon, date, location);
}
