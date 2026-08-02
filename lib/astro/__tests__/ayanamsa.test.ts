import { describe, expect, it } from "vitest";
import { getLahiriAyanamsa, toSidereal } from "../ayanamsa";

describe("ayanamsa", () => {
  it("matches the known Lahiri anchor value at J2000.0", () => {
    const j2000 = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
    expect(getLahiriAyanamsa(j2000)).toBeCloseTo(23.853, 2);
  });

  it("increases by roughly the precession rate one year later", () => {
    const j2000 = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
    const oneYearLater = new Date(Date.UTC(2001, 0, 1, 12, 0, 0));
    const delta = getLahiriAyanamsa(oneYearLater) - getLahiriAyanamsa(j2000);
    expect(delta).toBeCloseTo(50.2879 / 3600, 4);
  });

  it("subtracts the ayanamsa and normalizes to [0, 360)", () => {
    const date = new Date(Date.UTC(2024, 0, 1));
    const ayanamsa = getLahiriAyanamsa(date);
    expect(toSidereal(10, date)).toBeCloseTo((10 - ayanamsa + 360) % 360, 6);
    expect(toSidereal(0, date)).toBeGreaterThanOrEqual(0);
    expect(toSidereal(0, date)).toBeLessThan(360);
  });
});
