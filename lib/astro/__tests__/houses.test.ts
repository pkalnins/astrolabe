import { describe, expect, it } from "vitest";
import { getWholeSignHouses, getPlacidusHouses, getHouseOfLongitude } from "../houses";
import { getAscendant } from "../ascendant";
import { getMidheaven } from "../midheaven";
import { signedDelta } from "../math";
import type { GeoLocation } from "../location";

describe("getWholeSignHouses", () => {
  it("starts house 1 at the ascendant's sign boundary, not its exact degree", () => {
    const houses = getWholeSignHouses(43.7); // mid-Taurus
    expect(houses[0]).toEqual({ house: 1, longitude: 30 });
  });

  it("lays out all 12 houses at consecutive 30-degree sign boundaries", () => {
    const houses = getWholeSignHouses(5); // Aries
    expect(houses.map((h) => h.longitude)).toEqual([0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]);
    expect(houses.map((h) => h.house)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("wraps around 360 degrees when the ascendant is late in the zodiac", () => {
    const houses = getWholeSignHouses(355); // Pisces
    expect(houses[0].longitude).toBe(330);
    expect(houses[1].longitude).toBe(0); // wraps back into Aries
    expect(houses[11].longitude).toBe(300);
  });

  it("handles an ascendant exactly on a sign boundary", () => {
    const houses = getWholeSignHouses(90); // exactly 0 degrees Cancer
    expect(houses[0].longitude).toBe(90);
  });
});

const NYC: GeoLocation = { latitude: 40.7128, longitude: -74.006 };
const DATE = new Date(Date.UTC(2024, 5, 15, 16, 0, 0));

function cusp(houses: ReturnType<typeof getPlacidusHouses>, house: number): number {
  return houses!.find((c) => c.house === house)!.longitude;
}

describe("getPlacidusHouses", () => {
  it("puts the four angle cusps exactly on the ascendant/MC/descendant/IC", () => {
    const houses = getPlacidusHouses(DATE, NYC);
    expect(houses).not.toBeNull();

    const { ascendant, descendant } = getAscendant(DATE, NYC);
    const { midheaven, imumCoeli } = getMidheaven(DATE, NYC);

    expect(signedDelta(cusp(houses, 1), ascendant)).toBeCloseTo(0, 6);
    expect(signedDelta(cusp(houses, 4), imumCoeli)).toBeCloseTo(0, 6);
    expect(signedDelta(cusp(houses, 7), descendant)).toBeCloseTo(0, 6);
    expect(signedDelta(cusp(houses, 10), midheaven)).toBeCloseTo(0, 6);
  });

  it("orders intermediate cusps strictly between their bounding angles", () => {
    const houses = getPlacidusHouses(DATE, NYC);
    const { midheaven } = getMidheaven(DATE, NYC);

    // Walking from MC (house 10) through house 4 (IC), each cusp's offset
    // from MC should strictly increase, ending exactly at 180 degrees.
    const order = [10, 11, 12, 1, 2, 3, 4];
    const offsets = order.map((h) => ((signedDelta(midheaven, cusp(houses, h)) % 360) + 360) % 360);
    for (let i = 1; i < offsets.length; i++) {
      expect(offsets[i]).toBeGreaterThan(offsets[i - 1]);
    }
    expect(offsets[offsets.length - 1]).toBeCloseTo(180, 6);
  });

  it("keeps opposite houses exactly antipodal", () => {
    const houses = getPlacidusHouses(DATE, NYC);
    for (const [a, b] of [
      [11, 5],
      [12, 6],
      [2, 8],
      [3, 9],
    ]) {
      expect(Math.abs(signedDelta(cusp(houses, a), cusp(houses, b)))).toBeCloseTo(180, 6);
    }
  });

  it("returns null above the Arctic/Antarctic circle, where the semi-arc equation breaks down", () => {
    expect(getPlacidusHouses(DATE, { latitude: 70, longitude: -74 })).toBeNull();
    expect(getPlacidusHouses(DATE, { latitude: -70, longitude: -74 })).toBeNull();
  });

  it("still computes normally comfortably below the polar circle", () => {
    expect(getPlacidusHouses(DATE, { latitude: 60, longitude: -74 })).not.toBeNull();
    expect(getPlacidusHouses(DATE, { latitude: -60, longitude: -74 })).not.toBeNull();
  });
});

describe("getHouseOfLongitude", () => {
  it("places each cusp's own longitude at the start of its house", () => {
    const houses = getWholeSignHouses(43.7); // house 1 starts at 30 (Taurus)
    expect(getHouseOfLongitude(30, houses)).toBe(1);
    expect(getHouseOfLongitude(60, houses)).toBe(2);
    expect(getHouseOfLongitude(0, houses)).toBe(12); // Aries - one sign back from Taurus (house 1)
  });

  it("places a longitude in the middle of a house correctly", () => {
    const houses = getWholeSignHouses(43.7);
    expect(getHouseOfLongitude(45, houses)).toBe(1); // mid-Taurus, same sign as the ascendant
    expect(getHouseOfLongitude(75, houses)).toBe(2); // mid-Gemini
  });

  it("handles a house that straddles the 360/0 degree wrap", () => {
    const houses = getWholeSignHouses(355); // house 1 starts at 330 (Pisces)
    expect(getHouseOfLongitude(345, houses)).toBe(1); // still within Pisces
    expect(getHouseOfLongitude(15, houses)).toBe(2); // wrapped into Aries
  });

  it("agrees with getPlacidusHouses' own cusps for a real chart", () => {
    const houses = getPlacidusHouses(DATE, NYC)!;
    for (const house of houses) {
      // A hair past each cusp's own longitude should fall inside that same house.
      expect(getHouseOfLongitude((house.longitude + 0.01) % 360, houses)).toBe(house.house);
    }
  });
});
