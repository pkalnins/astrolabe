import { describe, expect, it } from "vitest";
import { getZodiacPosition, ZODIAC_SIGNS } from "../zodiac";

describe("getZodiacPosition", () => {
  it("maps 0 degrees to the start of Aries, decan 1", () => {
    const pos = getZodiacPosition(0);
    expect(pos.sign.name).toBe("Aries");
    expect(pos.degreeInSign).toBeCloseTo(0);
    expect(pos.decan).toBe(1);
  });

  it("maps 95 degrees to Cancer, 5 degrees in, decan 1", () => {
    const pos = getZodiacPosition(95);
    expect(pos.sign.name).toBe("Cancer");
    expect(pos.degreeInSign).toBeCloseTo(5);
    expect(pos.decan).toBe(1);
  });

  it("maps 355 degrees to Pisces, decan 3", () => {
    const pos = getZodiacPosition(355);
    expect(pos.sign.name).toBe("Pisces");
    expect(pos.degreeInSign).toBeCloseTo(25);
    expect(pos.decan).toBe(3);
  });

  it("wraps longitudes outside [0, 360)", () => {
    expect(getZodiacPosition(-10).sign.name).toBe("Pisces");
    expect(getZodiacPosition(370).sign.name).toBe("Aries");
  });

  it("has 12 signs at consistent element groupings", () => {
    expect(ZODIAC_SIGNS).toHaveLength(12);
    const elements = ZODIAC_SIGNS.map((s) => s.element);
    // fire, earth, air, water repeating
    for (let i = 0; i < 12; i++) {
      expect(elements[i]).toBe(elements[i % 4]);
    }
  });
});
