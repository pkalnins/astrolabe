import { describe, expect, it } from "vitest";
import { getVoidOfCourse } from "../voidOfCourse";
import { getEclipticLongitude } from "../positions";
import { getZodiacPosition, ZODIAC_SIGNS } from "../zodiac";

describe("getVoidOfCourse", () => {
  it("targets the sign immediately after the Moon's current sign", () => {
    const now = new Date(Date.UTC(2024, 5, 15, 12, 0, 0));
    const moonLon = getEclipticLongitude("Moon", now);
    const currentSign = getZodiacPosition(moonLon).sign;
    const expectedNext = ZODIAC_SIGNS[(ZODIAC_SIGNS.indexOf(currentSign) + 1) % 12];

    const info = getVoidOfCourse(now);
    expect(info.nextSignName).toBe(expectedNext.name);
  });

  it("puts the ingress within a plausible window after now (Moon changes sign every ~2-2.5 days)", () => {
    const now = new Date(Date.UTC(2024, 5, 15, 12, 0, 0));
    const info = getVoidOfCourse(now);
    const hoursUntilIngress = (info.voidUntil.getTime() - now.getTime()) / (1000 * 60 * 60);
    expect(hoursUntilIngress).toBeGreaterThan(0);
    expect(hoursUntilIngress).toBeLessThan(3 * 24);
  });

  it("has a lastAspect exactly when not void, and none when void", () => {
    const now = new Date(Date.UTC(2024, 5, 15, 12, 0, 0));
    const info = getVoidOfCourse(now);
    if (info.isVoid) {
      expect(info.lastAspect).toBeNull();
    } else {
      expect(info.lastAspect).not.toBeNull();
      expect(info.lastAspect!.time.getTime()).toBeGreaterThan(now.getTime());
      expect(info.lastAspect!.time.getTime()).toBeLessThanOrEqual(info.voidUntil.getTime());
    }
  });

  it("finds both void and non-void moments across a lunar month", () => {
    // The Moon is void of course a meaningful fraction of the time (it
    // doesn't aspect something new instantly upon changing sign) - sampling
    // daily across a full ~27.3 day sidereal month should turn up both
    // states rather than the calculation trivially always returning one.
    const results = [];
    for (let day = 0; day < 28; day++) {
      const now = new Date(Date.UTC(2024, 5, 1 + day, 12, 0, 0));
      results.push(getVoidOfCourse(now).isVoid);
    }
    expect(results.some((v) => v === true)).toBe(true);
    expect(results.some((v) => v === false)).toBe(true);
  });

  it("does not throw across many arbitrary dates", () => {
    for (let i = 0; i < 20; i++) {
      const now = new Date(Date.UTC(2024, 0, 1 + i * 17, i % 24, 0, 0));
      expect(() => getVoidOfCourse(now)).not.toThrow();
    }
  });
});
