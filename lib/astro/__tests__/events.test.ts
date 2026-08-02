import { describe, expect, it } from "vitest";
import { getSunriseSunset, getMoonriseMoonset } from "../events";
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
    expect((rise as Date).getTime()).toBeLessThan((set as Date).getTime());

    // Mid-June in NYC: ~15.25 hours of daylight. Check elapsed duration rather
    // than UTC-hour-of-day, since sunset (evening local time) falls after
    // midnight UTC and would otherwise look like it's "the next day".
    const daylightHours = ((set as Date).getTime() - (rise as Date).getTime()) / (1000 * 60 * 60);
    expect(daylightHours).toBeGreaterThan(14.5);
    expect(daylightHours).toBeLessThan(16);
  });
});

describe("getMoonriseMoonset", () => {
  it("returns rise and/or set times without throwing", () => {
    const day = new Date(Date.UTC(2024, 5, 15));
    const { rise, set } = getMoonriseMoonset(day, NYC);
    expect(rise === null || rise instanceof Date).toBe(true);
    expect(set === null || set instanceof Date).toBe(true);
  });
});
