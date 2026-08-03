import { describe, expect, it } from "vitest";
import { getSunriseSunset, getMoonriseMoonset, startOfLocalDay } from "../events";
import type { GeoLocation } from "../location";

const NYC: GeoLocation = { latitude: 40.7128, longitude: -74.006, elevation: 10 };

describe("getSunriseSunset", () => {
  it("finds a sunrise before sunset on a summer day in NYC", () => {
    // Start the search from local pre-dawn (NYC is UTC-4 in June), so the
    // "next rise" and "next set" found are the same calendar day's pair
    // rather than straddling the UTC day boundary.
    const day = new Date(Date.UTC(2024, 5, 15, 5, 0, 0));
    const { rise, set } = getSunriseSunset(day, NYC);
    expect(rise).not.toBeNull();
    expect(set).not.toBeNull();
    expect(rise!.time.getTime()).toBeLessThan(set!.time.getTime());

    // Mid-June in NYC: ~15.25 hours of daylight. Check elapsed duration rather
    // than UTC-hour-of-day, since sunset (evening local time) falls after
    // midnight UTC and would otherwise look like it's "the next day".
    const daylightHours = (set!.time.getTime() - rise!.time.getTime()) / (1000 * 60 * 60);
    expect(daylightHours).toBeGreaterThan(14.5);
    expect(daylightHours).toBeLessThan(16);
  });

  it("puts summer sunrise north of east and sunset north of west, at mid-northern latitude", () => {
    // Well-established fact at mid-northern latitudes: only at the equinoxes
    // does the sun rise/set due east/west; near the summer solstice it rises
    // and sets well north of that.
    const day = new Date(Date.UTC(2024, 5, 15, 5, 0, 0));
    const { rise, set } = getSunriseSunset(day, NYC);
    expect(rise!.azimuth).toBeGreaterThan(45);
    expect(rise!.azimuth).toBeLessThan(90);
    expect(set!.azimuth).toBeGreaterThan(270);
    expect(set!.azimuth).toBeLessThan(315);
  });
});

describe("startOfLocalDay", () => {
  it("zeroes the time while keeping the same local calendar day", () => {
    const evening = new Date(2024, 5, 15, 23, 45, 30);
    const midnight = startOfLocalDay(evening);
    expect(midnight.getFullYear()).toBe(2024);
    expect(midnight.getMonth()).toBe(5);
    expect(midnight.getDate()).toBe(15);
    expect(midnight.getHours()).toBe(0);
    expect(midnight.getMinutes()).toBe(0);
    expect(midnight.getSeconds()).toBe(0);
  });
});

describe("getMoonriseMoonset", () => {
  it("returns well-formed rise and/or set events without throwing", () => {
    const day = new Date(Date.UTC(2024, 5, 15));
    const { rise, set } = getMoonriseMoonset(day, NYC);
    for (const event of [rise, set]) {
      if (event === null) continue;
      expect(event.time).toBeInstanceOf(Date);
      expect(event.azimuth).toBeGreaterThanOrEqual(0);
      expect(event.azimuth).toBeLessThan(360);
    }
  });
});
