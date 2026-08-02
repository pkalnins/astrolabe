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
