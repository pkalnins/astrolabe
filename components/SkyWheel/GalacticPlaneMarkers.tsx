import type { GalacticPlaneNode } from "@/lib/astro/galacticPlane";
import { polarToPoint, screenAngle } from "./geometry";
import { SYMBOL_FONT_FAMILY } from "./glyphs";

export interface GalacticPlaneMarkersProps {
  cx: number;
  cy: number;
  radius: number;
  ascendant: number;
  nodes: GalacticPlaneNode[];
}

// Dusty lavender, standing in for the Milky Way's band - distinct from the
// star markers' per-star colors and from the amber ASC/DSC/MC ticks.
const MARKER_COLOR = "#c4b5fd";
const TICK_HALF_LENGTH = 6;
// Same gap the star ring's labels use (see FixedStarsRing's LABEL_RING_GAP),
// so this stays within the viewBox margin that was already budgeted for it.
const LABEL_RING_GAP = 26;

/**
 * Two ticks on the star ring marking where the galactic plane crosses the
 * ecliptic - the zodiac's own plane. Unlike a star, this isn't a point in
 * the sky but a plane slicing through the ring, so it's drawn as a short
 * radial dash across the ring line rather than a dot sitting on it.
 */
export function GalacticPlaneMarkers({ cx, cy, radius, ascendant, nodes }: GalacticPlaneMarkersProps) {
  return (
    <g>
      {nodes.map((node) => {
        const angle = screenAngle(node.eclipticLongitude, ascendant);
        const inner = polarToPoint(cx, cy, radius - TICK_HALF_LENGTH, angle);
        const outer = polarToPoint(cx, cy, radius + TICK_HALF_LENGTH, angle);
        const labelPoint = polarToPoint(cx, cy, radius + LABEL_RING_GAP, angle);

        return (
          <g key={node.eclipticLongitude}>
            <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={MARKER_COLOR} strokeWidth={2} strokeOpacity={0.85} />
            <text
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={10}
              fontFamily={SYMBOL_FONT_FAMILY}
              fill={MARKER_COLOR}
              fillOpacity={0.85}
            >
              {/* Two lines rather than one - a single "Galactic Plane" line
                  is wide enough to run into a fixed-star name sitting at a
                  nearby angle on this same label ring; stacking it narrows
                  the horizontal footprint at the cost of a little height. */}
              <tspan x={labelPoint.x} dy="-6">
                Galactic
              </tspan>
              <tspan x={labelPoint.x} dy="12">
                Plane
              </tspan>
            </text>
          </g>
        );
      })}
    </g>
  );
}
