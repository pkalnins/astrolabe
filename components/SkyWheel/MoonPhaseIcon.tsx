/**
 * Vector moon-phase disc: a lit/dark lens shape, built the same way as the
 * outer-planet icons - sampled points along two arcs rather than reasoning
 * about SVG elliptical-arc sweep flags.
 *
 * Both the disc's edge-arc and its terminator-arc always span the full
 * vertical extent (the two "poles" at top/bottom of the disc); they differ
 * only in horizontal radius and bulge direction:
 * - Illuminated fraction k <= 0.5 (crescent): terminator bulges toward the
 *   lit side, carving a thin lit lens out of the lit half-disc.
 * - k > 0.5 (gibbous): terminator bulges toward the dark side, extending
 *   the lit region past the half-disc.
 * At k = 0.5 both reduce to a straight vertical line (a true quarter moon).
 *
 * Waxing is drawn lit-on-the-right, waning lit-on-the-left - the common
 * northern-hemisphere convention used in most moon-phase widgets. This is a
 * decorative simplification, not a claim about the actual viewing geometry
 * from any specific location.
 */

const ARC_STEPS = 24;

function ellipseArcPoints(verticalRadius: number, horizontalRadius: number, direction: 1 | -1, fromDeg: number, toDeg: number) {
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i <= ARC_STEPS; i++) {
    const deg = fromDeg + ((toDeg - fromDeg) * i) / ARC_STEPS;
    const rad = (deg * Math.PI) / 180;
    points.push({ x: direction * horizontalRadius * Math.cos(rad), y: verticalRadius * Math.sin(rad) });
  }
  return points;
}

function litLensPath(radius: number, litDirection: 1 | -1, illuminatedFraction: number): string {
  const terminatorRadius = radius * Math.abs(1 - 2 * illuminatedFraction);
  const bulgeDirection: 1 | -1 = illuminatedFraction <= 0.5 ? litDirection : (-litDirection as 1 | -1);

  const edgeArc = ellipseArcPoints(radius, radius, litDirection, -90, 90); // bottom -> top, along the disc's true edge
  const terminatorArc = ellipseArcPoints(radius, terminatorRadius, bulgeDirection, 90, -90); // top -> bottom

  const points = [...edgeArc, ...terminatorArc];
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ") + " Z";
}

export function MoonPhaseIcon({
  x,
  y,
  radius,
  illuminatedFraction,
  waxing,
  litColor = "#cbd5e1",
  darkColor = "#334155",
}: {
  x: number;
  y: number;
  radius: number;
  illuminatedFraction: number;
  waxing: boolean;
  litColor?: string;
  darkColor?: string;
}) {
  const litDirection: 1 | -1 = waxing ? 1 : -1;
  const path = litLensPath(radius, litDirection, illuminatedFraction);

  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx={0} cy={0} r={radius} fill={darkColor} />
      <path d={path} fill={litColor} />
      <circle cx={0} cy={0} r={radius} fill="none" stroke={litColor} strokeOpacity={0.5} strokeWidth={0.6} />
    </g>
  );
}
