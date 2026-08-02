import { describe, expect, it } from "vitest";
import * as Astronomy from "astronomy-engine";
import { getMoonPhase } from "../moonPhase";

// Astronomy.MoonQuarter: 0 = new moon, 1 = first quarter, 2 = full moon, 3 = last quarter.
const EXPECTED_NAME_BY_QUARTER = ["New Moon", "First Quarter", "Full Moon", "Last Quarter"] as const;

describe("getMoonPhase", () => {
  it("names each quarter phase correctly and matches expected illumination, using the library's own quarter search as ground truth", () => {
    let quarter = Astronomy.SearchMoonQuarter(new Date(Date.UTC(2024, 0, 1)));
    for (let i = 0; i < 8; i++) {
      const info = getMoonPhase(quarter.time.date);
      expect(info.name).toBe(EXPECTED_NAME_BY_QUARTER[quarter.quarter]);

      if (quarter.quarter === 0) expect(info.illuminatedFraction).toBeLessThan(0.03);
      if (quarter.quarter === 2) expect(info.illuminatedFraction).toBeGreaterThan(0.97);
      if (quarter.quarter === 1 || quarter.quarter === 3) {
        expect(info.illuminatedFraction).toBeCloseTo(0.5, 1);
      }

      quarter = Astronomy.NextMoonQuarter(quarter);
    }
  });

  it("names the midpoints between quarters as the gibbous/crescent phases", () => {
    // SearchMoonQuarter returns whichever quarter comes next after the given
    // date - not necessarily a new moon - so search forward until we land on
    // quarter 0 before assuming the sequence that follows.
    let newMoon = Astronomy.SearchMoonQuarter(new Date(Date.UTC(2024, 0, 1)));
    while (newMoon.quarter !== 0) {
      newMoon = Astronomy.NextMoonQuarter(newMoon);
    }
    const firstQuarter = Astronomy.NextMoonQuarter(newMoon);
    const fullMoon = Astronomy.NextMoonQuarter(firstQuarter);
    const lastQuarter = Astronomy.NextMoonQuarter(fullMoon);
    const nextNewMoon = Astronomy.NextMoonQuarter(lastQuarter);

    const midpoint = (a: Date, b: Date) => new Date((a.getTime() + b.getTime()) / 2);

    expect(getMoonPhase(midpoint(newMoon.time.date, firstQuarter.time.date)).name).toBe("Waxing Crescent");
    expect(getMoonPhase(midpoint(firstQuarter.time.date, fullMoon.time.date)).name).toBe("Waxing Gibbous");
    expect(getMoonPhase(midpoint(fullMoon.time.date, lastQuarter.time.date)).name).toBe("Waning Gibbous");
    expect(getMoonPhase(midpoint(lastQuarter.time.date, nextNewMoon.time.date)).name).toBe("Waning Crescent");
  });
});
