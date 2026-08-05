"use client";

import { useMemo } from "react";
import type { CelestialBody } from "@/lib/astro/positions";
import { getCurrentAspects } from "@/lib/astro/aspects";
import { ASPECT_COLORS } from "@/components/Dashboard/AspectsCard";
import { PLANET_GLYPHS, PLANET_COLORS, SYMBOL_FONT_FAMILY } from "./glyphs";

/** Shared by every wheel hover tooltip (Sun, Moon, and the other planets) so they all list a body's current aspects the same way. */
export function AspectsList({ body, now }: { body: CelestialBody; now: Date }) {
  const aspects = useMemo(() => getCurrentAspects(now).filter((a) => a.bodyA === body || a.bodyB === body), [now, body]);

  if (aspects.length === 0) {
    return <div className="text-xs text-neutral-400">No major aspects within orb right now.</div>;
  }

  return (
    <div className="flex flex-col gap-1">
      {aspects.map((aspect) => {
        const other = aspect.bodyA === body ? aspect.bodyB : aspect.bodyA;
        return (
          <div key={`${aspect.bodyA}-${aspect.bodyB}`} className="flex items-baseline gap-2">
            <span style={{ fontFamily: SYMBOL_FONT_FAMILY }}>
              <span style={{ color: ASPECT_COLORS[aspect.type] }}>{aspect.glyph}</span>{" "}
              <span style={{ color: PLANET_COLORS[other] }}>{PLANET_GLYPHS[other]}</span> {other}
            </span>
            <span className="ml-auto shrink-0 text-xs text-neutral-500">{aspect.orb.toFixed(1)}°</span>
          </div>
        );
      })}
    </div>
  );
}
