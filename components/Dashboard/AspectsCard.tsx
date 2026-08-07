"use client";

import { useMemo } from "react";
import { getCurrentAspects, getTransitToNatalAspects, type Aspect, type AspectType, type TransitAspect } from "@/lib/astro/aspects";
import type { CelestialBody, PlanetPosition } from "@/lib/astro/positions";
import { PLANET_GLYPHS, PLANET_COLORS, SYMBOL_FONT_FAMILY } from "@/components/SkyWheel/glyphs";
import { Card } from "./Card";

// Uranus/Neptune/Pluto move slowly enough that they sit in a near-constant
// aspect with each other and with Jupiter/Saturn for months at a time - not
// interesting day-to-day, and they crowd out the faster-moving bodies.
const EXCLUDED_BODIES: ReadonlySet<CelestialBody> = new Set(["Uranus", "Neptune", "Pluto"]);

// Traditional harmonious/challenging/neutral read on each aspect type -
// shared with the wheel's per-planet hover tooltip, so both read the same
// harmonious/challenging color coding.
export const ASPECT_COLORS: Record<AspectType, string> = {
  trine: "#4ade80",
  sextile: "#4ade80",
  square: "#f87171",
  opposition: "#f87171",
  conjunction: "#e5e5e5",
};

function AspectRow({ aspect }: { aspect: Aspect }) {
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className="text-lg" style={{ fontFamily: SYMBOL_FONT_FAMILY }}>
        <span style={{ color: PLANET_COLORS[aspect.bodyA] }}>{PLANET_GLYPHS[aspect.bodyA]}</span>{" "}
        <span style={{ color: ASPECT_COLORS[aspect.type] }}>{aspect.glyph}</span>{" "}
        <span style={{ color: PLANET_COLORS[aspect.bodyB] }}>{PLANET_GLYPHS[aspect.bodyB]}</span>
      </span>
      <span className="shrink-0 text-xs text-neutral-500">{aspect.orb.toFixed(1)}°</span>
    </div>
  );
}

// Only the natal side gets a text label - "transiting" is the unmarked
// default (matching how the wheel's own tooltips only ever say "Natal X",
// never "Transiting X"), so the pair still reads correctly without needing
// both sides spelled out in a narrow card.
function TransitAspectRow({ aspect }: { aspect: TransitAspect }) {
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className="flex items-baseline gap-1 text-lg" style={{ fontFamily: SYMBOL_FONT_FAMILY }}>
        <span style={{ color: PLANET_COLORS[aspect.transitingBody] }}>{PLANET_GLYPHS[aspect.transitingBody]}</span>
        <span style={{ color: ASPECT_COLORS[aspect.type] }}>{aspect.glyph}</span>
        <span className="text-xs text-neutral-500">Natal</span>
        <span style={{ color: PLANET_COLORS[aspect.natalBody] }}>{PLANET_GLYPHS[aspect.natalBody]}</span>
      </span>
      <span className="shrink-0 text-xs text-neutral-500">{aspect.orb.toFixed(1)}°</span>
    </div>
  );
}

// The list is already sorted tightest-orb-first (traditionally the most
// exact/significant), so just cap it there as a safety margin.
const MAX_ASPECTS_SHOWN = 8;

export interface AspectsCardProps {
  now: Date;
  natal?: boolean;
  /** When provided, shows transit-to-natal aspects instead - the whole point
      of Explore Transits mode - and `now`/`natal` above are ignored. */
  transits?: { transitingPlanets: PlanetPosition[]; natalPlanets: PlanetPosition[] };
}

// `natal` doesn't change how current/natal aspects are computed -
// getCurrentAspects is already just "aspects among all planets at date X" -
// it only changes the title/empty-state wording, since the caller is the one
// deciding whether `now` is the live clock or a birth instant (see page.tsx).
export function AspectsCard({ now, natal = false, transits }: AspectsCardProps) {
  const aspects = useMemo(
    () =>
      getCurrentAspects(now)
        .filter((aspect) => !EXCLUDED_BODIES.has(aspect.bodyA) && !EXCLUDED_BODIES.has(aspect.bodyB))
        .slice(0, MAX_ASPECTS_SHOWN),
    [now],
  );

  const transitAspects = useMemo(() => {
    if (!transits) return [];
    return getTransitToNatalAspects(transits.transitingPlanets, transits.natalPlanets)
      .filter((aspect) => !EXCLUDED_BODIES.has(aspect.transitingBody) && !EXCLUDED_BODIES.has(aspect.natalBody))
      .slice(0, MAX_ASPECTS_SHOWN);
  }, [transits]);

  const title = transits ? "Transit Aspects" : natal ? "Natal Aspects" : "Aspects";

  return (
    <Card title={title}>
      {transits ? (
        transitAspects.length === 0 ? (
          <div className="text-sm text-neutral-400">No major transit aspects within orb right now.</div>
        ) : (
          <div className="grid grid-cols-1 gap-y-1.5">
            {transitAspects.map((aspect) => (
              <TransitAspectRow key={`${aspect.transitingBody}-${aspect.natalBody}`} aspect={aspect} />
            ))}
          </div>
        )
      ) : aspects.length === 0 ? (
        <div className="text-sm text-neutral-400">
          {natal ? "No major aspects within orb at birth." : "No major aspects within orb right now."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-y-1.5">
          {aspects.map((aspect) => (
            <AspectRow key={`${aspect.bodyA}-${aspect.bodyB}`} aspect={aspect} />
          ))}
        </div>
      )}
    </Card>
  );
}
