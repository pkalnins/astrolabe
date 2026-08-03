import { getAllPlanetPositions, type CelestialBody } from "./positions";
import { signedDelta } from "./math";

export type AspectType = "conjunction" | "sextile" | "square" | "trine" | "opposition";

interface AspectDefinition {
  type: AspectType;
  angle: number;
  glyph: string;
}

// The five classical ("Ptolemaic") aspects. A single uniform orb (tolerance)
// keeps this simple rather than the traditional per-aspect/per-planet orb
// tables, which is plenty for a quick-glance dashboard.
const ASPECT_DEFINITIONS: AspectDefinition[] = [
  { type: "conjunction", angle: 0, glyph: "☌" },
  { type: "sextile", angle: 60, glyph: "⚹" },
  { type: "square", angle: 90, glyph: "□" },
  { type: "trine", angle: 120, glyph: "△" },
  { type: "opposition", angle: 180, glyph: "☍" },
];
const ORB_DEGREES = 6;

export interface Aspect {
  bodyA: CelestialBody;
  bodyB: CelestialBody;
  type: AspectType;
  glyph: string;
  /** Absolute deviation from the exact aspect angle, in degrees - smaller = more exact. */
  orb: number;
}

/**
 * Aspects are just angular relationships between two bodies' ecliptic
 * longitudes, so they're identical in tropical and sidereal mode (both
 * longitudes shift by the same ayanamsa offset, which cancels out in the
 * difference) - no mode parameter needed.
 */
export function getCurrentAspects(date: Date): Aspect[] {
  const positions = getAllPlanetPositions(date);
  const aspects: Aspect[] = [];

  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const separation = Math.abs(signedDelta(positions[i].eclipticLongitude, positions[j].eclipticLongitude));

      let closest: { def: AspectDefinition; orb: number } | null = null;
      for (const def of ASPECT_DEFINITIONS) {
        const orb = Math.abs(separation - def.angle);
        if (orb <= ORB_DEGREES && (!closest || orb < closest.orb)) {
          closest = { def, orb };
        }
      }

      if (closest) {
        aspects.push({
          bodyA: positions[i].body,
          bodyB: positions[j].body,
          type: closest.def.type,
          glyph: closest.def.glyph,
          orb: closest.orb,
        });
      }
    }
  }

  return aspects.sort((a, b) => a.orb - b.orb);
}
