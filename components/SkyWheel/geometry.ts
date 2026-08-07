import { normalizeDegrees } from "@/lib/astro/math";

/**
 * Screen angle (degrees, standard math convention: 0 = right/3 o'clock,
 * 90 = up, 180 = left/9 o'clock, CCW positive) for a given ecliptic
 * longitude, given the current ascendant longitude.
 *
 * The ascendant always lands at 180 (9 o'clock/left) and the descendant at
 * 0 (3 o'clock/right). Deliberately not normalized to [0, 360) - callers
 * that need a start/end pair 30 degrees apart (e.g. a zodiac wedge) should
 * compute both ends from this function directly rather than normalizing
 * and re-diffing, so the difference is always exactly correct even across
 * the 0/360 wrap.
 */
export function screenAngle(longitude: number, ascendant: number): number {
  return 180 + (longitude - ascendant);
}

export interface Point {
  x: number;
  y: number;
}

/** Converts a screen angle + radius (centered at cx, cy) to SVG x/y. */
export function polarToPoint(cx: number, cy: number, radius: number, angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy - radius * Math.sin(rad), // SVG y grows downward; negate to keep +angle = CCW on screen
  };
}

function pointsToPath(points: Point[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
}

function pointsToLineCommands(points: Point[]): string {
  return points.map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
}

/**
 * SVG path for an annular wedge (a ring segment) between two screen angles,
 * built from sampled line segments rather than an elliptical arc command -
 * simpler and foolproof compared to reasoning about arc sweep/large-arc flags.
 */
export function annularWedgePath(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  angleStart: number,
  angleEnd: number,
  steps = 12,
): string {
  const outer: Point[] = [];
  const inner: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = angleStart + ((angleEnd - angleStart) * i) / steps;
    outer.push(polarToPoint(cx, cy, outerRadius, angle));
    inner.unshift(polarToPoint(cx, cy, innerRadius, angle));
  }
  return `${pointsToPath(outer)} ${pointsToLineCommands(inner)} Z`;
}

/** SVG path for a radial tick line at a given screen angle. */
export function radialTickPath(cx: number, cy: number, innerRadius: number, outerRadius: number, angle: number): string {
  const inner = polarToPoint(cx, cy, innerRadius, angle);
  const outer = polarToPoint(cx, cy, outerRadius, angle);
  return `M ${inner.x.toFixed(2)} ${inner.y.toFixed(2)} L ${outer.x.toFixed(2)} ${outer.y.toFixed(2)}`;
}

/**
 * Nudges apart a set of angles that are too close together (e.g. several
 * planets in a tight conjunction sharing one ring), so their markers don't
 * visually overlap.
 *
 * Implementation: cut the circle open at its single largest gap (so the rest
 * can be treated as an ordinary line, sidestepping wraparound edge cases),
 * unwrap the sorted angles onto that line, then sweep forward once pushing
 * each point up just enough to keep at least `minSeparationDeg` from the one
 * before it - which can only ever move points later, never crossing one
 * another, so this converges in a single pass regardless of how tightly
 * bunched the input is. The whole result is then shifted back so its
 * midpoint lines up with the original cluster's midpoint, rather than
 * leaving it anchored whichever way the sweep happened to push it.
 *
 * Returns adjusted angles in the same order as the input array. This is a
 * rendering-only nudge - callers needing the true, exact angle (aspects,
 * tooltips, hand lines) should keep using the original longitude, not this
 * output.
 */
export function declutterAngles(angles: readonly number[], minSeparationDeg: number): number[] {
  const n = angles.length;
  if (n < 2) return [...angles];

  const normalized = angles.map((a) => normalizeDegrees(a));
  const order = normalized.map((_, i) => i).sort((a, b) => normalized[a] - normalized[b]);

  // Find the largest circular gap between consecutive (sorted) points, and
  // treat the point right after it as the start of the line.
  let cutAt = 0;
  let largestGap = -Infinity;
  for (let k = 0; k < n; k++) {
    const gap = normalizeDegrees(normalized[order[(k + 1) % n]] - normalized[order[k]]);
    if (gap > largestGap) {
      largestGap = gap;
      cutAt = (k + 1) % n;
    }
  }
  const lineOrder = [...order.slice(cutAt), ...order.slice(0, cutAt)];

  // Unwrap onto a line: each point's position is the previous one's plus the
  // (always positive, since still following sorted order) circular gap
  // between them - equivalent to the original angles but with no wraparound.
  const original = [normalized[lineOrder[0]]];
  for (let k = 1; k < n; k++) {
    original.push(original[k - 1] + normalizeDegrees(normalized[lineOrder[k]] - normalized[lineOrder[k - 1]]));
  }

  const swept = [...original];
  for (let k = 1; k < n; k++) {
    swept[k] = Math.max(swept[k], swept[k - 1] + minSeparationDeg);
  }

  // Re-center: align the swept span's midpoint with the original span's, so
  // a symmetric cluster stays visually centered rather than drifting to
  // whichever side the forward-only sweep happened to push it toward.
  const shift = (original[0] + original[n - 1]) / 2 - (swept[0] + swept[n - 1]) / 2;

  const result = new Array<number>(n);
  for (let k = 0; k < n; k++) {
    result[lineOrder[k]] = normalizeDegrees(swept[k] + shift);
  }
  return result;
}
