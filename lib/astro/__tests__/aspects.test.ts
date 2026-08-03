import { describe, expect, it } from "vitest";
import * as Astronomy from "astronomy-engine";
import { getCurrentAspects } from "../aspects";

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
