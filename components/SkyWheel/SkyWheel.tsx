"use client";

import { useMemo, useRef, useState } from "react";
import type { CelestialBody, PlanetPosition } from "@/lib/astro/positions";
import { getMoonPhase } from "@/lib/astro/moonPhase";
import { FIXED_STARS, getFixedStarPositions } from "@/lib/astro/fixedStars";
import { getGalacticPlaneNodes } from "@/lib/astro/galacticPlane";
import { getLunarNodes } from "@/lib/astro/lunarNodes";
import { getCurrentAspects, getTransitToNatalAspects } from "@/lib/astro/aspects";
import { toSidereal } from "@/lib/astro/ayanamsa";
import { normalizeDegrees, signedDelta } from "@/lib/astro/math";
import { getZodiacPosition } from "@/lib/astro/zodiac";
import type { HouseSystem } from "@/lib/astro/houses";
import type { GeoLocation } from "@/lib/astro/location";
import type { ZodiacMode } from "@/lib/hooks/useAstroState";
import type { NatalChart } from "@/lib/hooks/useNatalChart";
import { useHouseCusps } from "@/lib/hooks/useHouseCusps";
import { ZodiacRing } from "./ZodiacRing";
import { PlanetRing } from "./PlanetRing";
import { FixedStarsRing } from "./FixedStarsRing";
import { GalacticPlaneMarkers } from "./GalacticPlaneMarkers";
import { NatalRing, type NatalHoverTarget } from "./NatalRing";
import { RadialHands } from "./RadialHands";
import { SunTooltip } from "./SunTooltip";
import { MoonTooltip } from "./MoonTooltip";
import { PlanetTooltip } from "./PlanetTooltip";
import { NatalPlanetTooltip } from "./NatalPlanetTooltip";
import { LunarNodeTooltip } from "./LunarNodeTooltip";
import { polarToPoint, radialTickPath, screenAngle } from "./geometry";
import { LUNAR_NODE_GLYPHS, PLANET_COLORS, SYMBOL_FONT_FAMILY } from "./glyphs";

// Controlled from the parent (like `mode`/`onModeChange`) rather than local
// state, since other dashboard pieces - e.g. the Aspects card - need to know
// when Natal Chart mode is active to switch to showing natal aspects too.
export type SkyWheelDisplayMode = "current" | "natal" | "transits";

export interface SkyWheelProps {
  planets: PlanetPosition[];
  ascendant: number;
  descendant: number;
  midheaven: number;
  mode: ZodiacMode;
  onModeChange: (mode: ZodiacMode) => void;
  now: Date;
  location: GeoLocation | null;
  /** Unlocks the Natal Chart and Explore Transits display modes (see
      `displayMode` below) - without it, only Current Sky is available. */
  natalChart?: NatalChart | null;
  displayMode: SkyWheelDisplayMode;
  onDisplayModeChange: (mode: SkyWheelDisplayMode) => void;
  // Controlled like `displayMode` - a natal positions table elsewhere on the
  // dashboard needs to report houses using this same system, not silently
  // disagree with whatever the wheel itself is showing.
  houseSystem: HouseSystem;
  onHouseSystemChange: (system: HouseSystem) => void;
  size?: number;
}

function formatDegree(longitude: number): string {
  const { sign, degreeInSign } = getZodiacPosition(longitude);
  return `${sign.glyph} ${Math.floor(degreeInSign)}°`;
}

// Shared styling for every corner button (mode buttons and on/off toggles
// alike) - fixed width so the two stacked columns line up cleanly regardless
// of label length, and a blue outline for whichever is currently active.
function wheelButtonClass(position: string, active: boolean, disabled = false): string {
  return [
    "absolute z-10 w-24 rounded-full border px-3 py-1 text-center text-xs uppercase tracking-wide",
    position,
    disabled ? "cursor-not-allowed opacity-40" : "hover:bg-neutral-800",
    active ? "border-blue-500 text-blue-300" : "border-neutral-800 text-neutral-600",
  ].join(" ");
}

// The house-system pair sits below the Houses toggle, only when it's on -
// smaller and unpositioned itself (its parent wrapper carries the absolute
// placement) since it's a secondary, nested choice rather than a peer of the
// six corner buttons above it.
function houseSystemButtonClass(active: boolean): string {
  return `w-24 rounded-full border px-2 py-0.5 text-center text-[10px] uppercase tracking-wide hover:bg-neutral-800 ${
    active ? "border-green-500 text-green-300" : "border-neutral-800 text-neutral-600"
  }`;
}

// Extra margin (beyond the zodiac ring itself) so the outermost labels have
// room without clipping the SVG edge. The furthest-out text is now ASC/DSC's,
// out on their own spoke (see ASC_DSC_MC_RADIUS below) rather than the
// fixed-star names, which sit closer in - but 130 comfortably covers either.
const EXTRA_MARGIN = 130;
const ZODIAC_OUTER_RADIUS = 218;
const VIEWBOX_W = ZODIAC_OUTER_RADIUS * 2 + EXTRA_MARGIN * 2;
const VIEWBOX_H = ZODIAC_OUTER_RADIUS * 2 + EXTRA_MARGIN * 2;
const CENTER_X = VIEWBOX_W / 2;
const CENTER_Y = VIEWBOX_H / 2;
const ZODIAC_INNER_RADIUS = ZODIAC_OUTER_RADIUS - 46;
// Fixed stars sit close to the zodiac ring itself - their marker/label pair
// occupies its own inner radius band, well short of where ASC/DSC/MC's own
// labels start (see ASC_DSC_MC_RADIUS below), so the two never collide even
// when a star's screen angle lands right on 0/180 degrees.
const FIXED_STARS_RING_RADIUS = ZODIAC_OUTER_RADIUS + 14;
// ASC/DSC/MC are pushed out past the fixed-star ring - a full radial spoke
// from the zodiac ring out to each label, so they still read as pointers to
// an exact degree despite sitting further out than they used to.
const ASC_DSC_MC_RADIUS = ZODIAC_OUTER_RADIUS + 60;
const EARTH_RADIUS = 20;
// Slate, deliberately neutral/muted - distinct from the amber ASC/DSC/MC
// ticks and the lavender galactic-plane markers on the ring further out.
const LUNAR_NODE_COLOR = "#94a3b8";
// The nodes live on the Moon's own ring (they're points where the Moon's
// path crosses the ecliptic, so this is where they belong conceptually),
// which means the Moon itself passes directly over one of them twice a
// lunar month. When that happens, nudge the node's glyph off to the side
// far enough to clear the Moon's marker - same idea as FixedStarsRing's
// near-coincident label nudge, just angular-only since both markers already
// share one fixed radius.
const NODE_MOON_COLLISION_THRESHOLD_DEG = 25;
const NODE_MOON_NUDGE_DEG = 25;

// Traditional geocentric ("Ptolemaic") ordering - Moon closest to Earth,
// outward through Saturn, the boundary of naked-eye antiquity. Each of these
// seven gets its own ring so the wheel reads as a stack of "spheres" rather
// than a generic planet track. Uranus/Neptune/Pluto aren't part of that
// ancient model, so they share one additional outer ring instead of each
// getting a "sphere" the geocentric system never accounted for.
const GEOCENTRIC_RING_ORDER = ["Moon", "Mercury", "Venus", "Sun", "Mars", "Jupiter", "Saturn"] as const;
const TRANS_SATURNIAN_BODIES: ReadonlySet<CelestialBody> = new Set(["Uranus", "Neptune", "Pluto"]);

// Evenly spaced from the zodiac ring down to Earth: one ring per classical
// body plus one for the trans-Saturnian group, with a matching gap left
// between the innermost ring (Moon) and Earth itself.
const INNER_RING_GAP = (ZODIAC_INNER_RADIUS - EARTH_RADIUS) / (GEOCENTRIC_RING_ORDER.length + 2);
const TRANS_SATURNIAN_RING_RADIUS = ZODIAC_INNER_RADIUS - INNER_RING_GAP;
const SATURN_RING_RADIUS = TRANS_SATURNIAN_RING_RADIUS - INNER_RING_GAP;
const JUPITER_RING_RADIUS = SATURN_RING_RADIUS - INNER_RING_GAP;
const MARS_RING_RADIUS = JUPITER_RING_RADIUS - INNER_RING_GAP;
const SUN_RING_RADIUS = MARS_RING_RADIUS - INNER_RING_GAP;
const VENUS_RING_RADIUS = SUN_RING_RADIUS - INNER_RING_GAP;
const MERCURY_RING_RADIUS = VENUS_RING_RADIUS - INNER_RING_GAP;
const MOON_RING_RADIUS = MERCURY_RING_RADIUS - INNER_RING_GAP; // == EARTH_RADIUS + INNER_RING_GAP, by construction

const RING_RADIUS_BY_BODY: Record<(typeof GEOCENTRIC_RING_ORDER)[number], number> = {
  Moon: MOON_RING_RADIUS,
  Mercury: MERCURY_RING_RADIUS,
  Venus: VENUS_RING_RADIUS,
  Sun: SUN_RING_RADIUS,
  Mars: MARS_RING_RADIUS,
  Jupiter: JUPITER_RING_RADIUS,
  Saturn: SATURN_RING_RADIUS,
};

// In Explore Transits mode, natal planets share one ring rather than each
// getting their own - the innermost ring (Moon's, ~37 units out) is too
// tight for that: two bodies need roughly 23 degrees of separation there
// just to avoid their markers visually touching, which real natal charts
// routinely violate (any conjunction, or even a loose stellium). The Saturn
// ring position needs only ~6 degrees instead, matching what the outermost
// (trans-Saturnian) ring already gets for the transiting side - while still
// leaving one ring-step of visible gap before it for the transit-to-natal
// aspect lines to cross.
const NATAL_RING_RADIUS_IN_TRANSITS_MODE = SATURN_RING_RADIUS;

// Same marker size everywhere, shared across all rings rather than scaled
// off any one ring's radius - small enough that adjacent rings' markers
// don't touch even when two bodies land at the same longitude.
const PLANET_MARKER_RADIUS = 7.5;

// House numbers sit just inside the zodiac ring, in the same gap that
// separates it from the trans-Saturnian ring - close enough to read as
// belonging to the ring's own boundary lines, without landing on top of the
// trans-Saturnian planet markers just past it.
const HOUSE_NUMBER_RADIUS = ZODIAC_INNER_RADIUS - INNER_RING_GAP * 0.4;
const HOUSE_LINE_COLOR = "currentColor";

export function SkyWheel({
  planets,
  ascendant: liveAscendant,
  descendant: liveDescendant,
  midheaven: liveMidheaven,
  mode,
  onModeChange,
  now,
  location,
  natalChart,
  displayMode,
  onDisplayModeChange,
  houseSystem,
  onHouseSystemChange,
  size = 820,
}: SkyWheelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const eventToContainerPos = (event: React.MouseEvent<SVGGElement>): { x: number; y: number } | null => {
    const rect = containerRef.current?.getBoundingClientRect();
    return rect ? { x: event.clientX - rect.left, y: event.clientY - rect.top } : null;
  };

  // On by default.
  const [showFixedStars, setShowFixedStars] = useState(true);
  const [showHouses, setShowHouses] = useState(true);

  // Three mutually-exclusive display modes:
  // - "current": today's default - live sky, live location, the classic
  //   per-planet-ring "orrery" layout.
  // - "natal": the exact same orrery layout and rendering path as "current",
  //   just fed the birth instant/location/planets instead of live ones - so
  //   it reads as "what the sky looked like at the moment you were born."
  // - "transits": the biwheel - natal planets on one ring, live transiting
  //   planets on another, zodiac aligned to the natal ascendant, with
  //   hover-triggered transit-to-natal aspect lines between the two.
  // The latter two need a natal chart to mean anything; their buttons stay
  // visible but disabled without one, rather than shifting layout by hiding.
  const inNatalMode = displayMode === "natal" && Boolean(natalChart);
  const inTransitsMode = displayMode === "transits" && Boolean(natalChart);

  // Natal-vs-live angles, resolved once here so every other computation
  // below can keep referring to plain `ascendant`/`descendant`/`midheaven`
  // regardless of which mode is active. Both Natal Chart and Explore
  // Transits anchor the wheel to the natal chart's own angles.
  const useNatalFrame = (inNatalMode || inTransitsMode) && natalChart;
  const ascendant = useNatalFrame ? natalChart.ascendant : liveAscendant;
  const descendant = useNatalFrame ? natalChart.descendant : liveDescendant;
  const midheaven = useNatalFrame ? natalChart.midheaven : liveMidheaven;
  // Placidus needs the actual date/place behind whichever angles are active,
  // not just the ascendant - same natal-vs-live split as above.
  const houseDate = useNatalFrame ? natalChart.birthInstant : now;
  const houseLocation = useNatalFrame ? natalChart.location : location;
  // The single time/planets set that "the displayed chart" uses - the birth
  // instant/placements in Natal Chart mode, live otherwise. Explore Transits
  // never uses these (it renders both charts explicitly), so this only
  // matters for the "current" vs "natal" shared rendering path. Natal mode's
  // tooltips deliberately avoid needing the birth *location* too - see
  // NatalPlanetTooltip's use below.
  const referenceTime = inNatalMode && natalChart ? natalChart.birthInstant : now;
  const effectivePlanets = inNatalMode && natalChart ? natalChart.planets : planets;
  // Current transiting planets/nodes share one ring - the innermost (usually
  // the Moon's own individual ring) in Current Sky/Natal Chart modes, or the
  // outermost (trans-Saturnian) ring once natal planets have taken over the
  // innermost one in Explore Transits mode.
  const currentBodiesRadius = inTransitsMode ? TRANS_SATURNIAN_RING_RADIUS : MOON_RING_RADIUS;

  const [hovered, setHovered] = useState<{ body: CelestialBody; x: number; y: number } | null>(null);
  const handlePlanetHover = (body: CelestialBody, event: React.MouseEvent<SVGGElement> | null) => {
    const pos = event && eventToContainerPos(event);
    setHovered(pos ? { body, ...pos } : null);
  };

  const [hoveredNode, setHoveredNode] = useState<{ node: "north" | "south"; x: number; y: number } | null>(null);
  const handleNodeHover = (node: "north" | "south", event: React.MouseEvent<SVGGElement> | null) => {
    const pos = event && eventToContainerPos(event);
    setHoveredNode(pos ? { node, ...pos } : null);
  };
  // Named per-node handlers (rather than an inline arrow at each marker) so
  // there's no closure directly in JSX reading containerRef through
  // handleNodeHover - only two nodes ever exist, so this fully enumerates them.
  const handleNorthNodeEnter = (event: React.MouseEvent<SVGGElement>) => handleNodeHover("north", event);
  const handleNorthNodeLeave = () => handleNodeHover("north", null);
  const handleSouthNodeEnter = (event: React.MouseEvent<SVGGElement>) => handleNodeHover("south", event);
  const handleSouthNodeLeave = () => handleNodeHover("south", null);

  const [hoveredNatal, setHoveredNatal] = useState<{ target: NatalHoverTarget; x: number; y: number } | null>(null);
  const handleNatalHover = (target: NatalHoverTarget, event: React.MouseEvent<SVGGElement> | null) => {
    const pos = event && eventToContainerPos(event);
    setHoveredNatal(pos ? { target, ...pos } : null);
  };

  const ascPoint = polarToPoint(CENTER_X, CENTER_Y, ASC_DSC_MC_RADIUS, 180);
  const dscPoint = polarToPoint(CENTER_X, CENTER_Y, ASC_DSC_MC_RADIUS, 0);
  // Unlike ASC/DSC, MC isn't pinned to a fixed screen angle - its angular
  // distance from the ascendant varies with latitude and time of day. A
  // tick along its own radial spoke marks its exact degree, so the label
  // itself can sit a bit closer in without losing precision.
  const mcAngle = screenAngle(midheaven, ascendant);
  const mcPoint = polarToPoint(CENTER_X, CENTER_Y, ASC_DSC_MC_RADIUS - 4, mcAngle);
  // The Imum Coeli - MC's opposite, exactly 180 degrees away and thus always
  // MC's own screen angle plus 180 (adding 180 to a longitude commutes with
  // the sidereal/tropical shift, so this needs no separate mode handling).
  const imumCoeli = normalizeDegrees(midheaven + 180);
  const icAngle = mcAngle + 180;
  const icPoint = polarToPoint(CENTER_X, CENTER_Y, ASC_DSC_MC_RADIUS - 4, icAngle);
  // Moon phase, fixed stars, and the galactic plane are all generic
  // "position at a given time" computations with no natal-specific storage
  // of their own (unlike planets/nodes/angles, which the natal chart already
  // carries pre-computed) - so these key off `referenceTime` directly to
  // pick up Natal Chart mode's birth instant, same as everything else here.
  const moonPhase = useMemo(() => getMoonPhase(referenceTime), [referenceTime]);
  const houseCusps = useHouseCusps(houseSystem, houseDate, houseLocation, ascendant, mode);

  const fixedStars = useMemo(() => {
    const tropical = getFixedStarPositions(referenceTime, FIXED_STARS);
    if (mode === "tropical") return tropical;
    return tropical.map((star) => ({ ...star, eclipticLongitude: toSidereal(star.eclipticLongitude, referenceTime) }));
  }, [referenceTime, mode]);

  const galacticPlaneNodes = useMemo(() => {
    const tropical = getGalacticPlaneNodes(referenceTime);
    if (mode === "tropical") return tropical;
    return tropical.map((node) => ({ ...node, eclipticLongitude: toSidereal(node.eclipticLongitude, referenceTime) }));
  }, [referenceTime, mode]);

  // Current transiting lunar nodes, shown on whichever ring the transiting
  // Moon itself is currently sharing - or, in Natal Chart mode (where
  // `referenceTime` is the birth instant), the natal nodes, which this
  // computes identically to how useNatalChart derives its own (same
  // function, same conversion), so the two never diverge.
  const lunarNodes = useMemo(() => {
    const tropical = getLunarNodes(referenceTime);
    if (mode === "tropical") return tropical;
    return {
      northNodeLongitude: toSidereal(tropical.northNodeLongitude, referenceTime),
      southNodeLongitude: toSidereal(tropical.southNodeLongitude, referenceTime),
    };
  }, [referenceTime, mode]);

  const sun = effectivePlanets.filter((p) => p.body === "Sun");
  const moon = effectivePlanets.filter((p) => p.body === "Moon");
  const transSaturnian = effectivePlanets.filter((p) => TRANS_SATURNIAN_BODIES.has(p.body));
  const hoveredPlanet = hovered ? effectivePlanets.find((p) => p.body === hovered.body) : undefined;
  // Sun/Moon already get a permanent hand each - only add the hovered body's
  // hand on top of those when it's some other planet, so hovering Sun/Moon
  // itself doesn't draw a duplicate.
  const handPlanets =
    hoveredPlanet && hoveredPlanet.body !== "Sun" && hoveredPlanet.body !== "Moon" ? [...sun, ...moon, hoveredPlanet] : [...sun, ...moon];
  const handBodies = new Set(handPlanets.map((p) => p.body));

  // Whichever bodies the hovered planet is currently in aspect with (e.g.
  // Mars square Venus) - shown as dashed hands alongside its own, so the
  // relationship reads on the wheel itself, not just in its tooltip. Bodies
  // already getting a solid hand (Sun/Moon/the hovered planet) are excluded
  // so a dashed line never duplicates one already drawn solid.
  const aspectedPlanets = useMemo(() => {
    if (!hoveredPlanet) return [];
    const aspectedBodies = new Set(
      getCurrentAspects(referenceTime)
        .filter((a) => a.bodyA === hoveredPlanet.body || a.bodyB === hoveredPlanet.body)
        .map((a) => (a.bodyA === hoveredPlanet.body ? a.bodyB : a.bodyA)),
    );
    return effectivePlanets.filter((p) => aspectedBodies.has(p.body) && !handBodies.has(p.body));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referenceTime, hoveredPlanet?.body, effectivePlanets]);

  // Explore Transits' whole point: which transiting bodies are currently
  // aspecting a natal placement, and vice versa. Drawn as dashed lines
  // straight across the (otherwise empty) middle rings, but only for
  // whichever single body is currently hovered - showing every transit's
  // every natal aspect at once would be as cluttered as permanently drawing
  // every current-to-current aspect line already is, which this app has
  // always avoided in favor of the same hover-to-reveal pattern.
  //
  // Not memoized: it's a handful of pairwise comparisons at most (one
  // hovered body against up to 10 natal placements, or vice versa), cheap
  // enough to recompute every render without needing useMemo's bookkeeping.
  function computeTransitNatalAspectLines() {
    const natal = natalChart;
    if (!inTransitsMode || !natal) return [];

    if (hoveredPlanet) {
      const fromPoint = polarToPoint(CENTER_X, CENTER_Y, currentBodiesRadius, screenAngle(hoveredPlanet.eclipticLongitude, ascendant));
      return getTransitToNatalAspects([hoveredPlanet], natal.planets).flatMap((aspect) => {
        const natalPlanet = natal.planets.find((p) => p.body === aspect.natalBody);
        if (!natalPlanet) return [];
        return [
          {
            key: `${aspect.transitingBody}-${aspect.natalBody}`,
            from: fromPoint,
            to: polarToPoint(CENTER_X, CENTER_Y, NATAL_RING_RADIUS_IN_TRANSITS_MODE, screenAngle(natalPlanet.eclipticLongitude, ascendant)),
            color: PLANET_COLORS[aspect.natalBody],
          },
        ];
      });
    }

    const hoveredNatalTarget = hoveredNatal?.target;
    if (hoveredNatalTarget?.kind === "planet") {
      const natalPlanet = natal.planets.find((p) => p.body === hoveredNatalTarget.body);
      if (natalPlanet) {
        const fromPoint = polarToPoint(CENTER_X, CENTER_Y, NATAL_RING_RADIUS_IN_TRANSITS_MODE, screenAngle(natalPlanet.eclipticLongitude, ascendant));
        return getTransitToNatalAspects(planets, [natalPlanet]).flatMap((aspect) => {
          const transitingPlanet = planets.find((p) => p.body === aspect.transitingBody);
          if (!transitingPlanet) return [];
          return [
            {
              key: `${aspect.transitingBody}-${aspect.natalBody}`,
              from: fromPoint,
              to: polarToPoint(CENTER_X, CENTER_Y, currentBodiesRadius, screenAngle(transitingPlanet.eclipticLongitude, ascendant)),
              color: PLANET_COLORS[aspect.transitingBody],
            },
          ];
        });
      }
    }

    return [];
  }
  const transitNatalAspectLines = computeTransitNatalAspectLines();

  return (
    <div
      ref={containerRef}
      className="relative w-full text-neutral-200"
      style={{ "--wheel-bg": "#0a0a12", maxWidth: size } as React.CSSProperties}
    >
      {/* Left stack: the three mutually-exclusive display modes. Natal
          Chart/Transits need a natal chart to mean anything - disabled
          (not hidden) without one, so this stack never shifts position. */}
      <button
        type="button"
        onClick={() => onDisplayModeChange("current")}
        className={wheelButtonClass("top-0 left-0", displayMode === "current")}
      >
        Current
      </button>
      <button
        type="button"
        onClick={() => onDisplayModeChange("natal")}
        disabled={!natalChart}
        className={wheelButtonClass("top-9 left-0", displayMode === "natal", !natalChart)}
      >
        Natal
      </button>
      <button
        type="button"
        onClick={() => onDisplayModeChange("transits")}
        disabled={!natalChart}
        className={wheelButtonClass("top-[4.5rem] left-0", displayMode === "transits", !natalChart)}
      >
        Transits
      </button>

      {/* Right stack: independent on/off toggles, orthogonal to the mode. */}
      <button
        type="button"
        onClick={() => onModeChange(mode === "tropical" ? "sidereal" : "tropical")}
        className={wheelButtonClass("top-0 right-0", true)}
      >
        {mode}
      </button>
      <button type="button" onClick={() => setShowFixedStars((v) => !v)} className={wheelButtonClass("top-9 right-0", showFixedStars)}>
        Stars
      </button>
      <button
        type="button"
        onClick={() => setShowHouses((v) => !v)}
        className={wheelButtonClass("top-[4.5rem] right-0", showHouses)}
      >
        Houses
      </button>
      {showHouses && (
        <div className="absolute top-[6.75rem] right-0 z-10 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => onHouseSystemChange("whole-sign")}
            className={houseSystemButtonClass(houseSystem === "whole-sign")}
          >
            Whole
          </button>
          <button
            type="button"
            onClick={() => onHouseSystemChange("placidus")}
            className={houseSystemButtonClass(houseSystem === "placidus")}
          >
            Placidus
          </button>
        </div>
      )}
      <svg viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`} className="aspect-square w-full">
        {/* The horizon is the horizontal line through Ascendant (left) /
            Descendant (right) once rotated - shown purely via shading rather
            than a drawn line: lighter above (currently visible sky), darker
            below. */}
        <path
          d={`M ${CENTER_X - ZODIAC_OUTER_RADIUS} ${CENTER_Y} A ${ZODIAC_OUTER_RADIUS} ${ZODIAC_OUTER_RADIUS} 0 0 1 ${
            CENTER_X + ZODIAC_OUTER_RADIUS
          } ${CENTER_Y} Z`}
          fill="#93c5fd"
          fillOpacity={0.18}
        />
        <path
          d={`M ${CENTER_X - ZODIAC_OUTER_RADIUS} ${CENTER_Y} A ${ZODIAC_OUTER_RADIUS} ${ZODIAC_OUTER_RADIUS} 0 0 0 ${
            CENTER_X + ZODIAC_OUTER_RADIUS
          } ${CENTER_Y} Z`}
          fill="black"
          fillOpacity={0.35}
        />

        <ZodiacRing
          cx={CENTER_X}
          cy={CENTER_Y}
          innerRadius={ZODIAC_INNER_RADIUS}
          outerRadius={ZODIAC_OUTER_RADIUS}
          ascendant={ascendant}
        />

        {/* Whole Sign house divisions - each line sits at a sign boundary
            (the same angles ZodiacRing draws within its own band), extended
            inward from the ring to Earth rather than out to the ASC/DSC/MC
            spoke: house cusps are anchored to sign boundaries, not to the
            ascendant's exact degree, so anchoring the lines out there would
            misleadingly suggest otherwise. Drawn behind the planet rings,
            same treatment as the RadialHands lines they parallel. */}
        {showHouses && (
          <g>
            {houseCusps.map(({ house, longitude }) => {
              const lineAngle = screenAngle(longitude, ascendant);
              const numberAngle = screenAngle(normalizeDegrees(longitude + 15), ascendant);
              const numberPoint = polarToPoint(CENTER_X, CENTER_Y, HOUSE_NUMBER_RADIUS, numberAngle);
              return (
                <g key={house}>
                  <path
                    d={radialTickPath(CENTER_X, CENTER_Y, 0, ZODIAC_INNER_RADIUS, lineAngle)}
                    stroke={HOUSE_LINE_COLOR}
                    strokeOpacity={0.25}
                    strokeWidth={1}
                  />
                  <text
                    x={numberPoint.x}
                    y={numberPoint.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={10}
                    fill={HOUSE_LINE_COLOR}
                    fillOpacity={0.55}
                  >
                    {house}
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {/* Spokes from the ring out to ASC/DSC/MC/IC's labels, marking their
            exact degree. Drawn faint and beneath the fixed-star ring so a
            spoke crossing a star's screen angle never competes with the
            star's own marker or name for attention. */}
        <path d={radialTickPath(CENTER_X, CENTER_Y, ZODIAC_OUTER_RADIUS, ASC_DSC_MC_RADIUS - 8, 180)} stroke="#fbbf24" strokeOpacity={0.35} strokeWidth={1.5} />
        <path d={radialTickPath(CENTER_X, CENTER_Y, ZODIAC_OUTER_RADIUS, ASC_DSC_MC_RADIUS - 8, 0)} stroke="#fbbf24" strokeOpacity={0.35} strokeWidth={1.5} />
        <path d={radialTickPath(CENTER_X, CENTER_Y, ZODIAC_OUTER_RADIUS, ASC_DSC_MC_RADIUS - 8, mcAngle)} stroke="#fbbf24" strokeOpacity={0.35} strokeWidth={1.5} />
        <path d={radialTickPath(CENTER_X, CENTER_Y, ZODIAC_OUTER_RADIUS, ASC_DSC_MC_RADIUS - 8, icAngle)} stroke="#fbbf24" strokeOpacity={0.35} strokeWidth={1.5} />

        {showFixedStars && (
          <>
            <circle cx={CENTER_X} cy={CENTER_Y} r={FIXED_STARS_RING_RADIUS} fill="none" stroke="currentColor" strokeOpacity={0.15} />
            <FixedStarsRing cx={CENTER_X} cy={CENTER_Y} radius={FIXED_STARS_RING_RADIUS} ascendant={ascendant} stars={fixedStars} />
            <GalacticPlaneMarkers
              cx={CENTER_X}
              cy={CENTER_Y}
              radius={FIXED_STARS_RING_RADIUS}
              ascendant={ascendant}
              nodes={galacticPlaneNodes}
            />
          </>
        )}

        {/* Sun/Moon "clock hands" - a thin line from Earth out to the
            zodiac ring, with a small circle where each meets the ring. The
            currently-hovered planet (if any) temporarily gets the same
            treatment, as a highlight. */}
        <RadialHands cx={CENTER_X} cy={CENTER_Y} radius={ZODIAC_INNER_RADIUS} ascendant={ascendant} planets={handPlanets} />

        {/* Dashed hands for whichever bodies the hovered planet is currently
            in aspect with (e.g. hovering Mars while it's square Venus also
            lights up Venus's hand) - so the relationship shows on the wheel
            itself, not just in the tooltip. */}
        <RadialHands cx={CENTER_X} cy={CENTER_Y} radius={ZODIAC_INNER_RADIUS} ascendant={ascendant} planets={aspectedPlanets} dashed />

        {inTransitsMode ? (
          <>
            {/* Biwheel layout: natal planets take over the Saturn ring
                (pushed out from the innermost/Moon ring, which is too tight
                to hold up to 12 natal bodies without them visually
                colliding - see NATAL_RING_RADIUS_IN_TRANSITS_MODE), current
                transiting planets consolidate onto the outermost
                (trans-Saturnian) ring - the rings below Saturn's sit empty,
                giving the transit-to-natal aspect lines room to cross
                between the two without competing with planet markers. */}
            <circle cx={CENTER_X} cy={CENTER_Y} r={NATAL_RING_RADIUS_IN_TRANSITS_MODE} fill="none" stroke="currentColor" strokeOpacity={0.15} />
            <circle cx={CENTER_X} cy={CENTER_Y} r={TRANS_SATURNIAN_RING_RADIUS} fill="none" stroke="currentColor" strokeOpacity={0.15} />

            {/* Dashed - same "reveal on hover" treatment as the
                current-to-current aspect hands above, just spanning between
                the two rings instead of from Earth to one ring. */}
            {transitNatalAspectLines.map((line) => (
              <line
                key={line.key}
                x1={line.from.x}
                y1={line.from.y}
                x2={line.to.x}
                y2={line.to.y}
                stroke={line.color}
                strokeOpacity={0.7}
                strokeWidth={1.25}
                strokeDasharray="4 3"
              />
            ))}

            <NatalRing
              cx={CENTER_X}
              cy={CENTER_Y}
              radius={NATAL_RING_RADIUS_IN_TRANSITS_MODE}
              ascendant={ascendant}
              planets={natalChart!.planets}
              lunarNodes={natalChart!.lunarNodes}
              moonPhase={getMoonPhase(natalChart!.birthInstant)}
              circleRadius={PLANET_MARKER_RADIUS}
              onHover={handleNatalHover}
            />
            <PlanetRing
              cx={CENTER_X}
              cy={CENTER_Y}
              radius={TRANS_SATURNIAN_RING_RADIUS}
              ascendant={ascendant}
              planets={planets}
              circleRadius={PLANET_MARKER_RADIUS}
              moonPhase={moonPhase}
              onHover={handlePlanetHover}
            />
          </>
        ) : (
          <>
            {/* Faint guide circles marking each inner ring's path. */}
            {[TRANS_SATURNIAN_RING_RADIUS, ...Object.values(RING_RADIUS_BY_BODY)].map((r) => (
              <circle key={r} cx={CENTER_X} cy={CENTER_Y} r={r} fill="none" stroke="currentColor" strokeOpacity={0.15} />
            ))}

            <PlanetRing
              cx={CENTER_X}
              cy={CENTER_Y}
              radius={TRANS_SATURNIAN_RING_RADIUS}
              ascendant={ascendant}
              planets={transSaturnian}
              circleRadius={PLANET_MARKER_RADIUS}
              onHover={handlePlanetHover}
            />
            {GEOCENTRIC_RING_ORDER.map((body) => (
              <PlanetRing
                key={body}
                cx={CENTER_X}
                cy={CENTER_Y}
                radius={RING_RADIUS_BY_BODY[body]}
                ascendant={ascendant}
                planets={effectivePlanets.filter((p) => p.body === body)}
                circleRadius={PLANET_MARKER_RADIUS}
                moonPhase={body === "Moon" ? moonPhase : undefined}
                onHover={handlePlanetHover}
              />
            ))}
          </>
        )}

        {/* Asc/Dsc labels. */}
        <text
          x={ascPoint.x}
          y={ascPoint.y}
          textAnchor="end"
          dominantBaseline="central"
          fontSize={13}
          fontFamily={SYMBOL_FONT_FAMILY}
          fill="#fbbf24"
        >
          <tspan x={ascPoint.x} dy="-2">
            ASC
          </tspan>
          <tspan x={ascPoint.x} dy="15" fontSize={11} fillOpacity={0.8}>
            {formatDegree(ascendant)}
          </tspan>
        </text>
        <text
          x={dscPoint.x}
          y={dscPoint.y}
          textAnchor="start"
          dominantBaseline="central"
          fontSize={13}
          fontFamily={SYMBOL_FONT_FAMILY}
          fill="#fbbf24"
        >
          <tspan x={dscPoint.x} dy="-2">
            DSC
          </tspan>
          <tspan x={dscPoint.x} dy="15" fontSize={11} fillOpacity={0.8}>
            {formatDegree(descendant)}
          </tspan>
        </text>
        <text
          x={mcPoint.x}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily={SYMBOL_FONT_FAMILY}
          fill="#fbbf24"
        >
          {/* Unlike ASC/DSC (always pinned to the sides, where vertical
              stacking never dips back toward the ring), MC can land
              anywhere around the circle - including due north/south, where
              a fixed "always stack downward" layout would push one line
              back across the ring boundary. Grow both lines away from
              center instead: downward when MC is in the lower half, upward
              when it's in the upper half. */}
          <tspan x={mcPoint.x} y={mcPoint.y + (mcPoint.y < CENTER_Y ? -7 : 7)} fontSize={13}>
            MC
          </tspan>
          <tspan x={mcPoint.x} y={mcPoint.y + (mcPoint.y < CENTER_Y ? -18 : 18)} fontSize={11} fillOpacity={0.8}>
            {formatDegree(midheaven)}
          </tspan>
        </text>
        <text
          x={icPoint.x}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily={SYMBOL_FONT_FAMILY}
          fill="#fbbf24"
        >
          {/* Same "grow away from center" treatment as MC, its opposite. */}
          <tspan x={icPoint.x} y={icPoint.y + (icPoint.y < CENTER_Y ? -7 : 7)} fontSize={13}>
            IC
          </tspan>
          <tspan x={icPoint.x} y={icPoint.y + (icPoint.y < CENTER_Y ? -18 : 18)} fontSize={11} fillOpacity={0.8}>
            {formatDegree(imumCoeli)}
          </tspan>
        </text>

        {/* Lunar nodes - drawn on whichever ring the current Moon itself is
            currently sharing (its own ring in Current Sky mode; the
            consolidated transiting ring in Explore Transits mode) rather
            than out by ASC/DSC/MC (where they used to collide with those
            labels as the wheel rotated). No degree label here, just the
            glyph - this ring is tight on space, and the point is to show
            where the nodes sit relative to the Moon and other current
            planets, not to give exact degrees (their tick-mark equivalent,
            if wanted, is still visible out on the zodiac ring itself via
            the sign glyphs). */}
        {moon[0] &&
          (
            [
              { node: "north", glyph: LUNAR_NODE_GLYPHS.north, longitude: lunarNodes.northNodeLongitude },
              { node: "south", glyph: LUNAR_NODE_GLYPHS.south, longitude: lunarNodes.southNodeLongitude },
            ] as const
          ).map(({ node, glyph, longitude }) => {
            const deltaFromMoon = signedDelta(moon[0].eclipticLongitude, longitude);
            const nudge =
              Math.abs(deltaFromMoon) < NODE_MOON_COLLISION_THRESHOLD_DEG
                ? Math.sign(deltaFromMoon || 1) * NODE_MOON_NUDGE_DEG
                : 0;
            const angle = screenAngle(longitude, ascendant) + nudge;
            const point = polarToPoint(CENTER_X, CENTER_Y, currentBodiesRadius, angle);
            return (
              <g
                key={glyph}
                onMouseEnter={node === "north" ? handleNorthNodeEnter : handleSouthNodeEnter}
                onMouseLeave={node === "north" ? handleNorthNodeLeave : handleSouthNodeLeave}
                style={{ cursor: "pointer" }}
              >
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={PLANET_MARKER_RADIUS * 0.8}
                  fill="#0a0a12"
                  stroke={LUNAR_NODE_COLOR}
                  strokeWidth={1.5}
                />
                <text
                  x={point.x}
                  y={point.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={11}
                  fontFamily={SYMBOL_FONT_FAMILY}
                  fill={LUNAR_NODE_COLOR}
                >
                  {glyph}
                </text>
                {/* Invisible, larger hit area - matches the planet rings'. */}
                <circle cx={point.x} cy={point.y} r={PLANET_MARKER_RADIUS * 0.8 + 6} fill="transparent" />
              </g>
            );
          })}

        {/* Earth, at center. */}
        <circle cx={CENTER_X} cy={CENTER_Y} r={EARTH_RADIUS} fill="#1d4ed8" stroke="#93c5fd" strokeWidth={1.5} />
        <path
          d={`M ${CENTER_X - EARTH_RADIUS} ${CENTER_Y} H ${CENTER_X + EARTH_RADIUS} M ${CENTER_X} ${
            CENTER_Y - EARTH_RADIUS
          } V ${CENTER_Y + EARTH_RADIUS}`}
          stroke="#93c5fd"
          strokeOpacity={0.6}
          strokeWidth={0.75}
        />
      </svg>
      {hovered && hoveredPlanet && (
        <div className="pointer-events-none absolute z-20" style={{ left: hovered.x + 14, top: hovered.y + 14 }}>
          {inNatalMode ? (
            // Natal Chart mode never uses Sun/Moon's specialized tooltips -
            // those pull in live-only data (current space weather, upcoming
            // lunar events relative to now) that has no sensible "at birth"
            // equivalent, so every body gets the same plain glyph/sign/
            // retrograde tooltip Explore Transits' own natal ring already uses.
            <NatalPlanetTooltip planet={hoveredPlanet} />
          ) : hovered.body === "Sun" ? (
            <SunTooltip longitude={hoveredPlanet.eclipticLongitude} location={location} now={now} />
          ) : hovered.body === "Moon" ? (
            <MoonTooltip longitude={hoveredPlanet.eclipticLongitude} location={location} now={now} />
          ) : (
            <PlanetTooltip planet={hoveredPlanet} now={now} />
          )}
        </div>
      )}
      {hoveredNode && (
        <div className="pointer-events-none absolute z-20" style={{ left: hoveredNode.x + 14, top: hoveredNode.y + 14 }}>
          <LunarNodeTooltip
            name={
              hoveredNode.node === "north"
                ? inNatalMode
                  ? "Natal North Node"
                  : "North Node"
                : inNatalMode
                  ? "Natal South Node"
                  : "South Node"
            }
            glyph={hoveredNode.node === "north" ? LUNAR_NODE_GLYPHS.north : LUNAR_NODE_GLYPHS.south}
            longitude={hoveredNode.node === "north" ? lunarNodes.northNodeLongitude : lunarNodes.southNodeLongitude}
            color={LUNAR_NODE_COLOR}
          />
        </div>
      )}
      {hoveredNatal && natalChart && (
        <div className="pointer-events-none absolute z-20" style={{ left: hoveredNatal.x + 14, top: hoveredNatal.y + 14 }}>
          {(() => {
            const target = hoveredNatal.target;
            return target.kind === "planet" ? (
              <NatalPlanetTooltip planet={natalChart.planets.find((p) => p.body === target.body)!} />
            ) : (
              <LunarNodeTooltip
                name={target.node === "north" ? "Natal North Node" : "Natal South Node"}
                glyph={target.node === "north" ? LUNAR_NODE_GLYPHS.north : LUNAR_NODE_GLYPHS.south}
                longitude={target.node === "north" ? natalChart.lunarNodes.northNodeLongitude : natalChart.lunarNodes.southNodeLongitude}
                color={LUNAR_NODE_COLOR}
              />
            );
          })()}
        </div>
      )}
    </div>
  );
}
