import { describe, expect, it } from "vitest";
import * as Astronomy from "astronomy-engine";
import { getLunarNodes } from "../lunarNodes";
import { signedDelta } from "../math";

describe("getLunarNodes", () => {
  it("returns two well-formed, antipodal longitudes", () => {
    const nodes = getLunarNodes(new Date(Date.UTC(2024, 0, 1)));
    expect(nodes.northNodeLongitude).toBeGreaterThanOrEqual(0);
    expect(nodes.northNodeLongitude).toBeLessThan(360);
    expect(nodes.southNodeLongitude).toBeGreaterThanOrEqual(0);
    expect(nodes.southNodeLongitude).toBeLessThan(360);
    expect(Math.abs(signedDelta(nodes.northNodeLongitude, nodes.southNodeLongitude))).toBeCloseTo(180, 5);
  });

  it("matches the Moon's actual longitude at the exact moment of a real ascending/descending crossing", () => {
    // SearchMoonNode finds the precise instant the Moon's center crosses the
    // ecliptic. At that instant the Moon *is* the node, so this function's
    // corresponding longitude (north for an ascending crossing, south for a
    // descending one) should coincide almost exactly with the Moon's real
    // ecliptic longitude, independently confirming both the north/south
    // sign convention and the general approach.
    let node = Astronomy.SearchMoonNode(Astronomy.MakeTime(new Date(Date.UTC(2024, 0, 1))));
    for (let i = 0; i < 4; i++) {
      const moonLongitude = Astronomy.EclipticGeoMoon(node.time).lon;
      const computed = getLunarNodes(node.time.date);
      const expected = node.kind === Astronomy.NodeEventKind.Ascending ? computed.northNodeLongitude : computed.southNodeLongitude;
      expect(Math.abs(signedDelta(moonLongitude, expected))).toBeLessThan(0.01);
      node = Astronomy.NextMoonNode(node);
    }
  });

  it("regresses (moves backward through the zodiac) over a year, as the real lunar node does", () => {
    // Kept to a single year (rather than a decade) so the net drift stays
    // under 180 degrees - signedDelta reports the shortest signed path, so
    // a larger regression would wrap around and read as a false positive
    // drift in the wrong direction.
    const then = getLunarNodes(new Date(Date.UTC(2023, 0, 1)));
    const now = getLunarNodes(new Date(Date.UTC(2024, 0, 1)));
    // ~19.35 deg/year regression; stay loose since the true node oscillates,
    // but rule out gross errors (e.g. an accidental sign flip).
    const drift = signedDelta(then.northNodeLongitude, now.northNodeLongitude);
    expect(drift).toBeLessThan(-10);
    expect(drift).toBeGreaterThan(-30);
  });
});
