import { describe, expect, it } from "vitest";
import * as Astronomy from "astronomy-engine";
import { getPlanetPosition, getAllPlanetPositions, BODIES } from "../positions";
import { signedDelta } from "../math";

describe("getPlanetPosition", () => {
  it("places the Sun at 0/90/180/270 degrees at the equinoxes/solstices", () => {
    const seasons = Astronomy.Seasons(2024);

    const atMarEquinox = getPlanetPosition("Sun", seasons.mar_equinox.date);
    const atJunSolstice = getPlanetPosition("Sun", seasons.jun_solstice.date);
    const atSepEquinox = getPlanetPosition("Sun", seasons.sep_equinox.date);
    const atDecSolstice = getPlanetPosition("Sun", seasons.dec_solstice.date);

    // Compare via signed wraparound distance since 0deg can come back as ~360.
    expect(Math.abs(signedDelta(0, atMarEquinox.eclipticLongitude))).toBeLessThan(0.05);
    expect(Math.abs(signedDelta(90, atJunSolstice.eclipticLongitude))).toBeLessThan(0.05);
    expect(Math.abs(signedDelta(180, atSepEquinox.eclipticLongitude))).toBeLessThan(0.05);
    expect(Math.abs(signedDelta(270, atDecSolstice.eclipticLongitude))).toBeLessThan(0.05);
  });

  it("never marks the Sun or Moon as retrograde", () => {
    // Sample throughout a year; geocentric Sun/Moon ecliptic longitude always increases.
    for (let day = 0; day < 365; day += 5) {
      const date = new Date(Date.UTC(2024, 0, 1 + day));
      expect(getPlanetPosition("Sun", date).retrograde).toBe(false);
      expect(getPlanetPosition("Moon", date).retrograde).toBe(false);
    }
  });

  it("finds a plausible number and duration of Mercury retrograde periods in a year", () => {
    // Sample a window padded beyond the calendar year so periods that
    // straddle Jan 1/Dec 31 aren't counted as truncated fragments.
    const dailyRetrograde: boolean[] = [];
    for (let day = -20; day < 385; day++) {
      const date = new Date(Date.UTC(2024, 0, 1 + day));
      dailyRetrograde.push(getPlanetPosition("Mercury", date).retrograde);
    }

    // Collect complete periods only, discarding any still in progress at
    // either edge of the sample window (those are boundary artifacts, not
    // real short retrograde periods).
    const periods: number[] = [];
    let currentStart = -1;
    dailyRetrograde.forEach((isRetro, i) => {
      if (isRetro && currentStart === -1) {
        currentStart = i;
      } else if (!isRetro && currentStart !== -1) {
        periods.push(i - currentStart);
        currentStart = -1;
      }
    });

    // Mercury retrogrades ~3-4 times/year for ~3 weeks each.
    expect(periods.length).toBeGreaterThanOrEqual(3);
    expect(periods.length).toBeLessThanOrEqual(5);
    for (const length of periods) {
      expect(length).toBeGreaterThan(14);
      expect(length).toBeLessThan(30);
    }
  });

  it("returns one entry per tracked body", () => {
    const positions = getAllPlanetPositions(new Date());
    expect(positions).toHaveLength(BODIES.length);
    expect(positions.map((p) => p.body)).toEqual([...BODIES]);
  });
});
