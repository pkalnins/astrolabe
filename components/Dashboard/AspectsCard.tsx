"use client";

import { useMemo } from "react";
import { getCurrentAspects, type Aspect, type AspectType } from "@/lib/astro/aspects";
import type { CelestialBody } from "@/lib/astro/positions";
import { PLANET_GLYPHS, PLANET_COLORS, SYMBOL_FONT_FAMILY } from "@/components/SkyWheel/glyphs";
import { Card } from "./Card";

// Uranus/Neptune/Pluto move slowly enough that they sit in a near-constant
// aspect with each other and with Jupiter/Saturn for months at a time - not
// interesting day-to-day, and they crowd out the faster-moving bodies.
const EXCLUDED_BODIES: ReadonlySet<CelestialBody> = new Set(["Uranus", "Neptune", "Pluto"]);

// Traditional harmonious/challenging/neutral read on each aspect type.
const ASPECT_COLORS: Record<AspectType, string> = {
  trine: "#4ade80",
  sextile: "#4ade80",
  square: "#f87171",
  opposition: "#f87171",
  conjunction: "#e5e5e5",
};

function AspectRow({ aspect }: { aspect: Aspect }) {
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span style={{ fontFamily: SYMBOL_FONT_FAMILY }}>
        <span style={{ color: PLANET_COLORS[aspect.bodyA] }}>{PLANET_GLYPHS[aspect.bodyA]}</span>{" "}
        <span style={{ color: ASPECT_COLORS[aspect.type] }}>{aspect.glyph}</span>{" "}
        <span style={{ color: PLANET_COLORS[aspect.bodyB] }}>{PLANET_GLYPHS[aspect.bodyB]}</span>
      </span>
      <span className="ml-auto shrink-0 text-xs text-neutral-500">{aspect.orb.toFixed(1)}°</span>
    </div>
  );
}

// The list is already sorted tightest-orb-first (traditionally the most
// exact/significant), so just cap it there as a safety margin.
const MAX_ASPECTS_SHOWN = 8;

export function AspectsCard({ now }: { now: Date }) {
  const aspects = useMemo(
    () =>
      getCurrentAspects(now)
        .filter((aspect) => !EXCLUDED_BODIES.has(aspect.bodyA) && !EXCLUDED_BODIES.has(aspect.bodyB))
        .slice(0, MAX_ASPECTS_SHOWN),
    [now],
  );

  return (
    <Card title="Aspects">
      {aspects.length === 0 ? (
        <div className="text-sm text-neutral-400">No major aspects within orb right now.</div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {aspects.map((aspect) => (
            <AspectRow key={`${aspect.bodyA}-${aspect.bodyB}`} aspect={aspect} />
          ))}
        </div>
      )}
    </Card>
  );
}
