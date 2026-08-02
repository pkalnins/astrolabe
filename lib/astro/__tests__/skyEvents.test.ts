import { describe, expect, it } from "vitest";
import * as Astronomy from "astronomy-engine";
import { getNextNewMoon, getNextFullMoon, getNextSeason, getNextLunarEclipse } from "../skyEvents";
import { getMoonPhase } from "../moonPhase";

const NOW = new Date(Date.UTC(2024, 5, 15));

describe("getNextNewMoon / getNextFullMoon", () => {
  it("returns a future date whose phase (per the independent moon-phase module) matches", () => {
    const newMoon = getNextNewMoon(NOW);
    expect(newMoon.date.getTime()).toBeGreaterThan(NOW.getTime());
    expect(getMoonPhase(newMoon.date).name).toBe("New Moon");

    const fullMoon = getNextFullMoon(NOW);
    expect(fullMoon.date.getTime()).toBeGreaterThan(NOW.getTime());
    expect(getMoonPhase(fullMoon.date).name).toBe("Full Moon");
  });
});

describe("getNextSeason", () => {
  it("finds the next of the four 2024 seasons after a mid-year date", () => {
    // Just after the June solstice (~June 20), so the next season is the
    // September equinox, not the June solstice itself.
    const seasons2024 = Astronomy.Seasons(2024);
    const afterJuneSolstice = new Date(seasons2024.jun_solstice.date.getTime() + 1000);
    const next = getNextSeason(afterJuneSolstice);
    expect(next.name).toBe("September Equinox");
    expect(next.date.getTime()).toBe(seasons2024.sep_equinox.date.getTime());
  });

  it("rolls over into next year's March equinox after the December solstice", () => {
    const seasons2024 = Astronomy.Seasons(2024);
    const afterDecSolstice = new Date(seasons2024.dec_solstice.date.getTime() + 1000);
    const next = getNextSeason(afterDecSolstice);
    expect(next.name).toBe("March Equinox");
    expect(next.date.getUTCFullYear()).toBe(2025);
  });
});

describe("getNextLunarEclipse", () => {
  it("returns a future eclipse matching astronomy-engine's own search", () => {
    const eclipse = Astronomy.SearchLunarEclipse(NOW);
    const next = getNextLunarEclipse(NOW);
    expect(next.date.getTime()).toBe(eclipse.peak.date.getTime());
    expect(next.date.getTime()).toBeGreaterThan(NOW.getTime());
    expect(next.name).toMatch(/Lunar Eclipse/);
  });
});
