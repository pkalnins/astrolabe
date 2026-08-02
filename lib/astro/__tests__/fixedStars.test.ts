import { describe, expect, it } from "vitest";
import { getRoyalStarPositions, ROYAL_STARS } from "../fixedStars";
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
