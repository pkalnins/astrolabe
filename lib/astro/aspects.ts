import { getAllPlanetPositions, type CelestialBody, type PlanetPosition } from "./positions";
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
// Tighter than the natal orb above - transit-to-natal aspects are read as a
// specific, time-bounded moment of contact rather than a permanent chart
// feature, so convention calls for a narrower window than natal-to-natal
// aspects use. Still one flat value rather than the traditional per-body
// table (e.g. wider for the Sun/Moon, narrower for the outer planets),
// matching this app's existing single-orb simplicity.
const TRANSIT_ORB_DEGREES = 3;

/** The tightest aspect (if any, within `orbDegrees`) between two longitudes. */
function closestAspect(longitudeA: number, longitudeB: number, orbDegrees: number): { def: AspectDefinition; orb: number } | null {
  const separation = Math.abs(signedDelta(longitudeA, longitudeB));

  let closest: { def: AspectDefinition; orb: number } | null = null;
  for (const def of ASPECT_DEFINITIONS) {
    const orb = Math.abs(separation - def.angle);
    if (orb <= orbDegrees && (!closest || orb < closest.orb)) {
      closest = { def, orb };
    }
  }
  return closest;
}

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
      const closest = closestAspect(positions[i].eclipticLongitude, positions[j].eclipticLongitude, ORB_DEGREES);
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

export interface TransitAspect {
  /** The currently-transiting body. */
  transitingBody: CelestialBody;
  /** The natal chart body it's aspecting. */
  natalBody: CelestialBody;
  type: AspectType;
  glyph: string;
  orb: number;
}

/**
 * Aspects between transiting planets and a natal chart - the core of
 * transit analysis ("what's activating my chart right now"). Unlike
 * getCurrentAspects, this checks every transiting/natal pair *including* a
 * body against its own natal placement (e.g. transiting Mars conjunct natal
 * Mars is a real, meaningful transit - a "Mars return") - there's no
 * self-comparison to skip the way there is within one set of positions.
 *
 * Takes already-computed positions rather than dates, since both sides
 * already exist elsewhere in whatever tropical/sidereal mode was requested
 * (the live sky, a stored natal chart) - comparing each side's longitude in
 * its own date's version of that frame, with no separate cross-epoch
 * adjustment, is exactly how real transit (Western) and Gochara (Vedic)
 * analysis works.
 */
export function getTransitToNatalAspects(transitingPlanets: PlanetPosition[], natalPlanets: PlanetPosition[]): TransitAspect[] {
  const aspects: TransitAspect[] = [];

  for (const transiting of transitingPlanets) {
    for (const natal of natalPlanets) {
      const closest = closestAspect(transiting.eclipticLongitude, natal.eclipticLongitude, TRANSIT_ORB_DEGREES);
      if (closest) {
        aspects.push({
          transitingBody: transiting.body,
          natalBody: natal.body,
          type: closest.def.type,
          glyph: closest.def.glyph,
          orb: closest.orb,
        });
      }
    }
  }

  return aspects.sort((a, b) => a.orb - b.orb);
}
