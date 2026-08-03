import { describe, expect, it } from "vitest";
import * as Astronomy from "astronomy-engine";
import { getMidheaven } from "../midheaven";
import { getPlanetPosition } from "../positions";
import { normalizeDegrees, signedDelta } from "../math";
import type { GeoLocation } from "../location";

const NYC: GeoLocation = { latitude: 40.7128, longitude: -74.006, elevation: 10 };

describe("getMidheaven", () => {
  it("puts the IC exactly 180 degrees from the MC", () => {
    const date = new Date(Date.UTC(2024, 5, 15, 16, 0, 0));
    const { midheaven, imumCoeli } = getMidheaven(date, NYC);

    expect(normalizeDegrees(imumCoeli - midheaven)).toBeCloseTo(180, 6);
  });

  it("agrees with the Sun's ecliptic longitude at the moment of solar culmination (local apparent noon)", () => {
    // At solar transit, the Sun sits exactly on the meridian by definition,
    // so its ecliptic longitude should match the Midheaven almost exactly.
    const day = new Date(Date.UTC(2024, 5, 15));
    const observer = new Astronomy.Observer(NYC.latitude, NYC.longitude, NYC.elevation ?? 0);
    const transit = Astronomy.SearchHourAngle(Astronomy.Body.Sun, observer, 0, day);

    const { midheaven } = getMidheaven(transit.time.date, NYC);
    const sunLongitude = getPlanetPosition("Sun", transit.time.date).eclipticLongitude;

    const diff = Math.abs(signedDelta(sunLongitude, midheaven));
    expect(diff).toBeLessThan(0.01);
  });

  it("agrees with the Sun at several other locations and times of year", () => {
    const locations: GeoLocation[] = [
      { latitude: 51.5074, longitude: -0.1278 }, // London
      { latitude: -33.8688, longitude: 151.2093 }, // Sydney
      { latitude: 35.6762, longitude: 139.6503 }, // Tokyo
    ];
    const days = [new Date(Date.UTC(2024, 0, 15)), new Date(Date.UTC(2024, 8, 1))];

    for (const location of locations) {
      for (const day of days) {
        const observer = new Astronomy.Observer(location.latitude, location.longitude, location.elevation ?? 0);
        const transit = Astronomy.SearchHourAngle(Astronomy.Body.Sun, observer, 0, day);

        const { midheaven } = getMidheaven(transit.time.date, location);
        const sunLongitude = getPlanetPosition("Sun", transit.time.date).eclipticLongitude;
        const diff = Math.abs(signedDelta(sunLongitude, midheaven));
        expect(diff).toBeLessThan(0.01);
      }
    }
  });

  it("matches MC at the aligned RAMC=0/90/180/270 points regardless of obliquity", () => {
    // At these four points the meridian's RA coincides with an equinox or
    // solstice node of the ecliptic, so MC == RAMC exactly, independent of
    // the obliquity term. Solve for the longitude that puts RAMC exactly on
    // each target at a fixed moment, rather than searching through time.
    const date = new Date(Date.UTC(2024, 5, 15, 12, 0, 0));
    const gastDeg = Astronomy.SiderealTime(Astronomy.MakeTime(date)) * 15;

    for (const targetRamc of [0, 90, 180, 270]) {
      const longitude = normalizeDegrees(targetRamc - gastDeg);
      const { midheaven } = getMidheaven(date, { latitude: 40, longitude });
      expect(Math.abs(signedDelta(midheaven, targetRamc))).toBeLessThan(1e-6);
    }
  });
});
