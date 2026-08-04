import { describe, expect, it } from "vitest";
import { getGalacticPlaneNodes } from "../galacticPlane";
import { signedDelta } from "../math";

describe("getGalacticPlaneNodes", () => {
  it("returns two well-formed, antipodal longitudes", () => {
    const nodes = getGalacticPlaneNodes(new Date(Date.UTC(2024, 0, 1)));
    expect(nodes).toHaveLength(2);
    for (const node of nodes) {
      expect(node.eclipticLongitude).toBeGreaterThanOrEqual(0);
      expect(node.eclipticLongitude).toBeLessThan(360);
    }
    expect(Math.abs(signedDelta(nodes[0].eclipticLongitude, nodes[1].eclipticLongitude))).toBeCloseTo(180, 1);
  });

  it("lands near the solstitial points (0 Cancer / 0 Capricorn), per the galactic pole's known ecliptic longitude of ~180 degrees", () => {
    const [first, second] = getGalacticPlaneNodes(new Date(Date.UTC(2024, 0, 1)));
    const nearCancer = [first, second].find((n) => n.eclipticLongitude < 180)!;
    const nearCapricorn = [first, second].find((n) => n.eclipticLongitude >= 180)!;
    expect(nearCancer.eclipticLongitude).toBeCloseTo(90, 0);
    expect(nearCapricorn.eclipticLongitude).toBeCloseTo(270, 0);
  });

  it("advances tropical longitude by roughly the precession rate over a decade", () => {
    const then = getGalacticPlaneNodes(new Date(Date.UTC(2014, 0, 1)));
    const now = getGalacticPlaneNodes(new Date(Date.UTC(2024, 0, 1)));
    for (let i = 0; i < then.length; i++) {
      const drift = signedDelta(then[i].eclipticLongitude, now[i].eclipticLongitude);
      // ~50.29 arcsec/year general precession -> ~0.14 deg over 10 years.
      expect(drift).toBeGreaterThan(0.05);
      expect(drift).toBeLessThan(0.5);
    }
  });
});
