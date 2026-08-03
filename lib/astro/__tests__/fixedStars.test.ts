import { describe, expect, it } from "vitest";
import {
  BEHENIAN_STARS,
  FIXED_STARS,
  getBehenianStarPositions,
  getFixedStarPositions,
  getRoyalStarPositions,
  ROYAL_STARS,
} from "../fixedStars";
import { signedDelta } from "../math";

describe("getRoyalStarPositions", () => {
  it("returns one well-formed position per royal star", () => {
    const positions = getRoyalStarPositions(new Date(Date.UTC(2024, 0, 1)));
    expect(positions.map((p) => p.name)).toEqual(ROYAL_STARS.map((s) => s.name));
    for (const p of positions) {
      expect(p.eclipticLongitude).toBeGreaterThanOrEqual(0);
      expect(p.eclipticLongitude).toBeLessThan(360);
      expect(Number.isFinite(p.eclipticLatitude)).toBe(true);
    }
  });

  it("keeps Aldebaran, Regulus, and Antares close to the ecliptic plane", () => {
    // These three are traditionally used as near-ecliptic zodiac markers;
    // Fomalhaut is well south of the ecliptic and isn't checked here.
    const positions = getRoyalStarPositions(new Date(Date.UTC(2024, 0, 1)));
    const byName = Object.fromEntries(positions.map((p) => [p.name, p]));
    expect(Math.abs(byName.Aldebaran.eclipticLatitude)).toBeLessThan(10);
    expect(Math.abs(byName.Regulus.eclipticLatitude)).toBeLessThan(10);
    expect(Math.abs(byName.Antares.eclipticLatitude)).toBeLessThan(10);
  });

  it("advances tropical longitude by roughly the precession rate over a decade", () => {
    const then = getRoyalStarPositions(new Date(Date.UTC(2014, 0, 1)));
    const now = getRoyalStarPositions(new Date(Date.UTC(2024, 0, 1)));
    for (let i = 0; i < ROYAL_STARS.length; i++) {
      const drift = signedDelta(then[i].eclipticLongitude, now[i].eclipticLongitude);
      // ~50.29 arcsec/year general precession -> ~0.14 deg over 10 years.
      // Proper motion adds a little more; stay loose but rule out gross errors.
      expect(drift).toBeGreaterThan(0.05);
      expect(drift).toBeLessThan(0.5);
    }
  });
});

describe("star catalog", () => {
  it("has 4 royal stars and 15 behenian stars, overlapping on Aldebaran, Regulus, and Antares", () => {
    expect(ROYAL_STARS).toHaveLength(4);
    expect(BEHENIAN_STARS).toHaveLength(15);
    const behenianNames = new Set(BEHENIAN_STARS.map((s) => s.name));
    for (const name of ["Aldebaran", "Regulus", "Antares"]) {
      expect(behenianNames.has(name)).toBe(true);
    }
    expect(behenianNames.has("Fomalhaut")).toBe(false);
  });
});

describe("getFixedStarPositions", () => {
  it("returns one well-formed position per catalogued star, covering more than astronomy-engine's 8 star slots", () => {
    expect(FIXED_STARS.length).toBeGreaterThan(8);
    const positions = getFixedStarPositions(new Date(Date.UTC(2024, 0, 1)), FIXED_STARS);
    expect(positions.map((p) => p.name)).toEqual(FIXED_STARS.map((s) => s.name));
    for (const p of positions) {
      expect(p.eclipticLongitude).toBeGreaterThanOrEqual(0);
      expect(p.eclipticLongitude).toBeLessThan(360);
      expect(Number.isFinite(p.eclipticLatitude)).toBe(true);
    }
  });

  it("doesn't leak one star's position into the next when reusing the scratch slot", () => {
    // Sirius and Fomalhaut sit in very different parts of the sky; computing
    // them back-to-back through the same underlying astronomy-engine star
    // slot must produce the same results regardless of order.
    const sirius = FIXED_STARS.find((s) => s.name === "Sirius")!;
    const fomalhaut = FIXED_STARS.find((s) => s.name === "Fomalhaut")!;
    const date = new Date(Date.UTC(2024, 0, 1));

    const [siriusFirst, fomalhautSecond] = getFixedStarPositions(date, [sirius, fomalhaut]);
    const [fomalhautFirst, siriusSecond] = getFixedStarPositions(date, [fomalhaut, sirius]);

    expect(siriusFirst.eclipticLongitude).toBeCloseTo(siriusSecond.eclipticLongitude, 9);
    expect(fomalhautSecond.eclipticLongitude).toBeCloseTo(fomalhautFirst.eclipticLongitude, 9);
  });
});

describe("getBehenianStarPositions", () => {
  it("returns one position per behenian star", () => {
    const positions = getBehenianStarPositions(new Date(Date.UTC(2024, 0, 1)));
    expect(positions.map((p) => p.name)).toEqual(BEHENIAN_STARS.map((s) => s.name));
  });
});
