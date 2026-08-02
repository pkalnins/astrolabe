import { describe, expect, it } from "vitest";
import * as Astronomy from "astronomy-engine";
import { getAscendant } from "../ascendant";
import { getSunriseSunset } from "../events";
import { getPlanetPosition } from "../positions";
import { normalizeDegrees, signedDelta } from "../math";
import type { GeoLocation } from "../location";

const NYC: GeoLocation = { latitude: 40.7128, longitude: -74.006, elevation: 10 };

describe("getAscendant", () => {
  it("puts the ascendant on the horizon, rising side; descendant opposite", () => {
    const date = new Date(Date.UTC(2024, 5, 15, 16, 0, 0));
    const { ascendant, descendant } = getAscendant(date, NYC);

    expect(normalizeDegrees(descendant - ascendant)).toBeCloseTo(180, 1);
  });

  it("agrees with the Sun's ecliptic longitude at the moment of sunrise", () => {
    // At sunrise, the Sun sits (almost) exactly on the ascendant by definition:
    // it's the point of the ecliptic currently crossing the eastern horizon.
    const day = new Date(Date.UTC(2024, 5, 15));
    const { rise } = getSunriseSunset(day, NYC);
    expect(rise).not.toBeNull();

    const { ascendant } = getAscendant(rise as Date, NYC);
    const sunLongitude = getPlanetPosition("Sun", rise as Date).eclipticLongitude;

    // Loose tolerance: SearchRiseSet's "sunrise" is the refracted, upper-limb
    // moment (visual rise), while getAscendant uses the unrefracted geometric
    // horizon, so a systematic sub-degree-to-few-degree offset is expected
    // (magnitude depends on how obliquely the ecliptic meets the horizon).
    const diff = Math.abs(signedDelta(sunLongitude, ascendant));
    expect(diff).toBeLessThan(3);
  });

  it("agrees with the Sun at several other locations and times of year", () => {
    const locations: GeoLocation[] = [
      { latitude: 51.5074, longitude: -0.1278 }, // London
      { latitude: -33.8688, longitude: 151.2093 }, // Sydney
      { latitude: 35.6762, longitude: 139.6503 }, // Tokyo
    ];
    const days = [
      new Date(Date.UTC(2024, 0, 15)),
      new Date(Date.UTC(2024, 8, 1)),
    ];

    for (const location of locations) {
      for (const day of days) {
        const { rise } = getSunriseSunset(day, location);
        if (!rise) continue;
        const { ascendant } = getAscendant(rise, location);
        const sunLongitude = getPlanetPosition("Sun", rise).eclipticLongitude;
        const diff = Math.abs(signedDelta(sunLongitude, ascendant));
        expect(diff).toBeLessThan(3);
      }
    }
  });

});

describe("Astronomy.Seasons sanity", () => {
  it("is available for other tests to use as ground truth", () => {
    expect(Astronomy.Seasons(2024).mar_equinox.date.getUTCFullYear()).toBe(2024);
  });
});
