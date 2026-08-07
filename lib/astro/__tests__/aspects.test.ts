import { describe, expect, it } from "vitest";
import * as Astronomy from "astronomy-engine";
import { getCurrentAspects, getTransitToNatalAspects } from "../aspects";
import type { PlanetPosition } from "../positions";

function planet(body: PlanetPosition["body"], eclipticLongitude: number): PlanetPosition {
  return { body, eclipticLongitude, dailyMotion: 1, retrograde: false };
}

function findAspect(aspects: ReturnType<typeof getCurrentAspects>, a: string, b: string) {
  return aspects.find((asp) => (asp.bodyA === a && asp.bodyB === b) || (asp.bodyA === b && asp.bodyB === a));
}

describe("getCurrentAspects", () => {
  it("finds a Sun-Moon opposition at the moment of full moon", () => {
    // Full moon is quarter 2 in astronomy-engine's convention.
    let mq = Astronomy.SearchMoonQuarter(new Date(Date.UTC(2024, 0, 1)));
    while (mq.quarter !== 2) mq = Astronomy.NextMoonQuarter(mq);

    const aspects = getCurrentAspects(mq.time.date);
    const sunMoon = findAspect(aspects, "Sun", "Moon");
    expect(sunMoon).toBeDefined();
    expect(sunMoon!.type).toBe("opposition");
    expect(sunMoon!.orb).toBeLessThan(0.5);
  });

  it("finds a Sun-Moon conjunction at the moment of new moon", () => {
    let mq = Astronomy.SearchMoonQuarter(new Date(Date.UTC(2024, 0, 1)));
    while (mq.quarter !== 0) mq = Astronomy.NextMoonQuarter(mq);

    const aspects = getCurrentAspects(mq.time.date);
    const sunMoon = findAspect(aspects, "Sun", "Moon");
    expect(sunMoon).toBeDefined();
    expect(sunMoon!.type).toBe("conjunction");
    expect(sunMoon!.orb).toBeLessThan(0.5);
  });

  it("returns only well-formed aspects within the orb, sorted tightest-first, no duplicate pairs", () => {
    const aspects = getCurrentAspects(new Date(Date.UTC(2024, 5, 15)));
    const seenPairs = new Set<string>();

    for (let i = 0; i < aspects.length; i++) {
      const a = aspects[i];
      expect(a.orb).toBeGreaterThanOrEqual(0);
      expect(a.orb).toBeLessThanOrEqual(6);
      expect(a.bodyA).not.toBe(a.bodyB);
      if (i > 0) expect(a.orb).toBeGreaterThanOrEqual(aspects[i - 1].orb);

      const pairKey = [a.bodyA, a.bodyB].sort().join("-");
      expect(seenPairs.has(pairKey)).toBe(false);
      seenPairs.add(pairKey);
    }
  });
});

describe("getTransitToNatalAspects", () => {
  it("finds a transiting body conjunct its own natal placement (a 'return')", () => {
    const transiting = [planet("Mars", 100.5)];
    const natal = [planet("Mars", 99)];

    const aspects = getTransitToNatalAspects(transiting, natal);
    expect(aspects).toHaveLength(1);
    expect(aspects[0]).toMatchObject({ transitingBody: "Mars", natalBody: "Mars", type: "conjunction" });
    expect(aspects[0].orb).toBeCloseTo(1.5, 5);
  });

  it("checks every transiting/natal pair, not just same-body pairs", () => {
    const transiting = [planet("Sun", 10)];
    const natal = [planet("Moon", 190)];

    const aspects = getTransitToNatalAspects(transiting, natal);
    expect(aspects).toHaveLength(1);
    expect(aspects[0]).toMatchObject({ transitingBody: "Sun", natalBody: "Moon", type: "opposition" });
  });

  it("omits pairs outside the orb and sorts the rest tightest-first", () => {
    const transiting = [planet("Sun", 0), planet("Venus", 45)];
    const natal = [planet("Moon", 1), planet("Mars", 90)];

    const aspects = getTransitToNatalAspects(transiting, natal);
    // Sun(0)-Moon(1): exact conjunction, 1 degree orb. Sun(0)-Mars(90): exact
    // square, 0 orb. Venus(45)-Moon(1) and Venus(45)-Mars(90) are both 44-45
    // degrees off any of the five aspect angles - outside the 6-degree orb.
    expect(aspects).toHaveLength(2);
    expect(aspects[0]).toMatchObject({ transitingBody: "Sun", natalBody: "Mars", type: "square", orb: 0 });
    expect(aspects[1]).toMatchObject({ transitingBody: "Sun", natalBody: "Moon", type: "conjunction", orb: 1 });
  });
});
