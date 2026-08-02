import { describe, expect, it } from "vitest";
import * as Astronomy from "astronomy-engine";
import { getPlanetaryHour, CHALDEAN_ORDER, DAY_RULERS } from "../planetaryHours";
import type { GeoLocation } from "../location";

const NYC: GeoLocation = { latitude: 40.7128, longitude: -74.006, elevation: 10 };

function nycObserver(): Astronomy.Observer {
  return new Astronomy.Observer(NYC.latitude, NYC.longitude, NYC.elevation ?? 0);
}

describe("CHALDEAN_ORDER / DAY_RULERS consistency", () => {
  it("steps forward exactly 3 positions in the Chaldean cycle each successive weekday", () => {
    // 24 hours / 7 planets leaves a remainder of 3 - the historical basis for
    // the weekday order itself, so this is a strong check that both hardcoded
    // tables are mutually correct (a transcription error in either would fail this).
    for (let day = 0; day < 7; day++) {
      const thisRulerIndex = CHALDEAN_ORDER.indexOf(DAY_RULERS[day]);
      const nextRulerIndex = CHALDEAN_ORDER.indexOf(DAY_RULERS[(day + 1) % 7]);
      expect((thisRulerIndex + 3) % 7).toBe(nextRulerIndex);
    }
  });
});

describe("getPlanetaryHour", () => {
  it("returns hour 1 (daytime) just after sunrise, ruled by that weekday's ruler", () => {
    const sunrise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, nycObserver(), +1, new Date(Date.UTC(2024, 5, 15, 5, 0, 0)), 1);
    expect(sunrise).not.toBeNull();

    const info = getPlanetaryHour(new Date(sunrise!.date.getTime() + 1000), NYC);
    expect(info.hourNumber).toBe(1);
    expect(info.isDaytime).toBe(true);
    expect(info.ruler).toBe(DAY_RULERS[sunrise!.date.getDay()]);
  });

  it("returns hour 13 (nighttime) just after sunset, continuing the same day's ruler sequence", () => {
    const sunrise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, nycObserver(), +1, new Date(Date.UTC(2024, 5, 15, 5, 0, 0)), 1)!;
    const sunset = Astronomy.SearchRiseSet(Astronomy.Body.Sun, nycObserver(), -1, sunrise.date, 1)!;

    const info = getPlanetaryHour(new Date(sunset.date.getTime() + 1000), NYC);
    expect(info.hourNumber).toBe(13);
    expect(info.isDaytime).toBe(false);

    const dayRulerIndex = CHALDEAN_ORDER.indexOf(DAY_RULERS[sunrise.date.getDay()]);
    expect(info.ruler).toBe(CHALDEAN_ORDER[(dayRulerIndex + 12) % 7]);
  });

  it("advances through all 12 daytime hours in Chaldean order", () => {
    const sunrise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, nycObserver(), +1, new Date(Date.UTC(2024, 5, 15, 5, 0, 0)), 1)!;
    const sunset = Astronomy.SearchRiseSet(Astronomy.Body.Sun, nycObserver(), -1, sunrise.date, 1)!;
    const hourLengthMs = (sunset.date.getTime() - sunrise.date.getTime()) / 12;
    const dayRulerIndex = CHALDEAN_ORDER.indexOf(DAY_RULERS[sunrise.date.getDay()]);

    for (let h = 0; h < 12; h++) {
      const moment = new Date(sunrise.date.getTime() + h * hourLengthMs + hourLengthMs / 2);
      const info = getPlanetaryHour(moment, NYC);
      expect(info.hourNumber).toBe(h + 1);
      expect(info.ruler).toBe(CHALDEAN_ORDER[(dayRulerIndex + h) % 7]);
    }
  });
});
