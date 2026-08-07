import { describe, expect, it } from "vitest";
import { declutterAngles } from "../geometry";

// Shortest signed distance between two angles on a circle, in [0, 180].
function circularDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

describe("declutterAngles", () => {
  it("leaves already well-separated angles untouched", () => {
    const angles = [0, 90, 180, 270];
    expect(declutterAngles(angles, 10)).toEqual(angles);
  });

  it("returns inputs unchanged for fewer than 2 angles", () => {
    expect(declutterAngles([], 10)).toEqual([]);
    expect(declutterAngles([42], 10)).toEqual([42]);
  });

  it("spreads two overlapping angles apart to exactly the minimum separation", () => {
    const [a, b] = declutterAngles([100, 101], 6);
    expect(circularDistance(a, b)).toBeCloseTo(6, 5);
    // Symmetric: nudged the same amount in opposite directions around their midpoint.
    expect(a).toBeCloseTo(100.5 - 3, 5);
    expect(b).toBeCloseTo(100.5 + 3, 5);
  });

  it("resolves a tight stellium (many bodies bunched together) with every pair separated", () => {
    const angles = [10, 11, 12, 13, 14, 15];
    const adjusted = declutterAngles(angles, 5);
    const sorted = [...adjusted].sort((x, y) => x - y);
    for (let i = 1; i < sorted.length; i++) {
      expect(circularDistance(sorted[i], sorted[i - 1])).toBeGreaterThanOrEqual(5 - 1e-6);
    }
  });

  it("handles two exactly coincident angles (an exact conjunction)", () => {
    const [a, b] = declutterAngles([200, 200], 4);
    expect(circularDistance(a, b)).toBeCloseTo(4, 5);
  });

  it("wraps correctly across the 0/360 degree boundary", () => {
    const adjusted = declutterAngles([358, 2], 8);
    expect(circularDistance(adjusted[0], adjusted[1])).toBeCloseTo(8, 5);
  });

  it("preserves the input order in its output", () => {
    const angles = [50, 10, 30];
    const adjusted = declutterAngles(angles, 5);
    // None of these are close enough to need nudging, so order and values
    // should both be exactly preserved.
    expect(adjusted).toEqual(angles);
  });
});
