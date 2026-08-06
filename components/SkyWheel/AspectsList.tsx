"use client";

import { Fragment, useMemo } from "react";
import type { CelestialBody } from "@/lib/astro/positions";
import { getCurrentAspects } from "@/lib/astro/aspects";
import { ASPECT_COLORS } from "@/components/Dashboard/AspectsCard";
import { PLANET_GLYPHS, PLANET_COLORS, SYMBOL_FONT_FAMILY } from "./glyphs";

/**
 * Shared by every wheel hover tooltip (Sun, Moon, and the other planets) so
 * they all list a body's current aspects the same way. Also used by the Sun
 * and Moon dashboard cards.
 *
 * `layout: "grid"` renders each aspect as bare row cells (aspect glyph / body
 * glyph+name / orb) with no wrapping element, using `Fragment` so they drop
 * straight into a parent `grid-cols-[auto_auto_1fr]` grid and its orb column
 * lines up with that grid's other rows - for the dashboard cards, which sit
 * inside exactly that grid. Defaults to "list" (self-contained, right-aligned
 * orb) for the tooltips, which aren't part of such a grid.
 *
 * `wideNoteGap` (grid layout only) adds a fixed left margin to the orb
 * column, matching `MetricRow`'s prop of the same name - for callers whose
 * grid uses a very tight `gap-x` for the name/value boundary but still want
 * the value/orb boundary comfortably spaced.
 */
export function AspectsList({
  body,
  now,
  layout = "list",
  wideNoteGap = false,
}: {
  body: CelestialBody;
  now: Date;
  layout?: "list" | "grid";
  wideNoteGap?: boolean;
}) {
  const aspects = useMemo(() => getCurrentAspects(now).filter((a) => a.bodyA === body || a.bodyB === body), [now, body]);

  if (aspects.length === 0) {
    return (
      <div className={layout === "grid" ? "col-span-3 text-xs text-neutral-400" : "text-xs text-neutral-400"}>
        No major aspects within orb right now.
      </div>
    );
  }

  if (layout === "grid") {
    return (
      <>
        {aspects.map((aspect) => {
          const other = aspect.bodyA === body ? aspect.bodyB : aspect.bodyA;
          return (
            <Fragment key={`${aspect.bodyA}-${aspect.bodyB}`}>
              <div style={{ color: ASPECT_COLORS[aspect.type], fontFamily: SYMBOL_FONT_FAMILY }}>
                <span className="text-lg leading-none">{aspect.glyph}</span>
              </div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-lg leading-none" style={{ color: PLANET_COLORS[other], fontFamily: SYMBOL_FONT_FAMILY }}>
                  {PLANET_GLYPHS[other]}
                </span>
                <span>{other}</span>
              </div>
              <div className={`min-w-0 text-xs text-neutral-400 break-words ${wideNoteGap ? "ml-2" : ""}`}>{aspect.orb.toFixed(1)}°</div>
            </Fragment>
          );
        })}
      </>
    );
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
