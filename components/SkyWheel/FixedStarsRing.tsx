import type { FixedStarPosition } from "@/lib/astro/fixedStars";
import { signedDelta } from "@/lib/astro/math";
import { polarToPoint, screenAngle } from "./geometry";
import { SYMBOL_FONT_FAMILY } from "./glyphs";

export interface FixedStarsRingProps {
  cx: number;
  cy: number;
  radius: number;
  ascendant: number;
  stars: FixedStarPosition[];
}

// Each star's actual observed color, documented since antiquity (e.g.
// Antares - "rival of Mars" - is named for its red color).
const STAR_COLORS: Record<string, string> = {
  Algol: "#cbdefe", // blue-white
  Alcyone: "#a5d8ff", // blue-white (Pleiades)
  Aldebaran: "#f5a742", // orange giant
  Capella: "#fef08a", // yellow giant
  Sirius: "#eaf6ff", // brilliant blue-white
  Procyon: "#fef9c3", // pale yellow-white
  Regulus: "#bfdbfe", // blue-white star
  Spica: "#7dd3fc", // blue
  Alkaid: "#60a5fa", // blue-white
  Arcturus: "#f97316", // orange
  Alphecca: "#e2e8f0", // white
  Antares: "#f0605a", // red supergiant
  Vega: "#dbeafe", // blue-white
  "Deneb Algedi": "#f1f5f9", // white
  Fomalhaut: "#f8fafc", // white star
  Scheat: "#f4785f", // red giant
};
const DEFAULT_STAR_COLOR = "#fde68a";
const MARKER_RADIUS = 3.5;
// Every label's center sits on this one ring, radially straight out from its
// star - no angular adjustment, so labels stay on the earth-star line, same
// as the constraint for the marker itself.
const LABEL_RING_GAP = 26;
// The one deliberate exception to the rule above: stars this close together
// (Spica/Arcturus are 0.39 degrees apart) would render two labels centered
// on almost the same point, fully illegible. Nudge both labels a few degrees
// apart, symmetrically around their true midpoint, only when this close.
// Every other star keeps its label exactly on its own radial line.
const NEAR_COINCIDENT_THRESHOLD_DEG = 2;
const NEAR_COINCIDENT_NUDGE_DEG = 3;

function computeLabelAngleOffsets(sortedByLongitude: readonly FixedStarPosition[]): Map<string, number> {
  const n = sortedByLongitude.length;
  const offsetByName = new Map<string, number>(sortedByLongitude.map((star) => [star.name, 0]));

  for (let i = 0; i < n; i++) {
    const next = sortedByLongitude[(i + 1) % n];
    const star = sortedByLongitude[i];
    const gap = Math.abs(signedDelta(star.eclipticLongitude, next.eclipticLongitude));
    if (gap < NEAR_COINCIDENT_THRESHOLD_DEG) {
      offsetByName.set(star.name, offsetByName.get(star.name)! - NEAR_COINCIDENT_NUDGE_DEG / 2);
      offsetByName.set(next.name, offsetByName.get(next.name)! + NEAR_COINCIDENT_NUDGE_DEG / 2);
    }
  }

  return offsetByName;
}

export function FixedStarsRing({ cx, cy, radius, ascendant, stars }: FixedStarsRingProps) {
  const sortedByLongitude = [...stars].sort((a, b) => a.eclipticLongitude - b.eclipticLongitude);
  const labelAngleOffsets = computeLabelAngleOffsets(sortedByLongitude);
  const labelRadius = radius + LABEL_RING_GAP;

  return (
    <g>
      {stars.map((star) => {
        const angle = screenAngle(star.eclipticLongitude, ascendant);
        const point = polarToPoint(cx, cy, radius, angle);
        const labelAngle = angle + (labelAngleOffsets.get(star.name) ?? 0);
        const labelPoint = polarToPoint(cx, cy, labelRadius, labelAngle);
        const color = STAR_COLORS[star.name] ?? DEFAULT_STAR_COLOR;

        return (
          <g key={star.name}>
            <circle cx={point.x} cy={point.y} r={MARKER_RADIUS} fill={color} />
            <text
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={11}
              fontFamily={SYMBOL_FONT_FAMILY}
              fill={color}
              fillOpacity={0.9}
            >
              {/* Two-word names (currently just "Deneb Algedi") wrap onto two
                  lines - as one line they're wide enough to collide with a
                  neighboring star's label at this same radius; every other
                  name here is a single word and renders as before. */}
              {star.name.includes(" ") ? (
                star.name.split(" ").map((word, i) => (
                  <tspan key={word} x={labelPoint.x} dy={i === 0 ? "-6" : "12"}>
                    {word}
                  </tspan>
                ))
              ) : (
                star.name
              )}
            </text>
          </g>
        );
      })}
    </g>
  );
}
