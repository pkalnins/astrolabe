"use client";

import { useMemo } from "react";
import { getMoonPhase } from "@/lib/astro/moonPhase";
import { getMoonDistance } from "@/lib/astro/moonDistance";
import { getZodiacPosition } from "@/lib/astro/zodiac";
import { getMoonriseMoonset, startOfLocalDay } from "@/lib/astro/events";
import { formatAzimuth } from "@/lib/astro/compass";
import { getNextNewMoon, getNextFullMoon, getNextLunarEclipse } from "@/lib/astro/skyEvents";
import { getVoidOfCourse } from "@/lib/astro/voidOfCourse";
import type { GeoLocation } from "@/lib/astro/location";
import { PLANET_GLYPHS, PLANET_COLORS, ELEMENT_COLORS, SYMBOL_FONT_FAMILY } from "@/components/SkyWheel/glyphs";
import { AspectsList } from "@/components/SkyWheel/AspectsList";
import { formatUpcomingEvent } from "./eventFormat";
import { MetricRow, ValueWithUnit } from "./MetricRow";
import { Card } from "./Card";

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

const KM_TO_MILES = 0.621371;

// Mirrors SkyWheel/MoonTooltip's content exactly, so the dashboard shows the
// same Moon data whether or not the wheel is on screen to hover over.
export function MoonCard({ longitude, location, now }: { longitude: number; location: GeoLocation | null; now: Date }) {
  const phase = useMemo(() => getMoonPhase(now), [now]);
  const distance = useMemo(() => getMoonDistance(now), [now]);
  const { sign, degreeInSign } = getZodiacPosition(longitude);

  const riseSet = useMemo(() => (location ? getMoonriseMoonset(startOfLocalDay(now), location) : null), [location, now]);

  const newMoon = useMemo(() => getNextNewMoon(now), [now]);
  const fullMoon = useMemo(() => getNextFullMoon(now), [now]);
  const eclipse = useMemo(() => getNextLunarEclipse(now), [now]);
  const voc = useMemo(() => getVoidOfCourse(now), [now]);

  return (
    <Card title="Moon">
      <div className="mb-1.5 flex items-center gap-2 text-sm">
        <span style={{ color: PLANET_COLORS.Moon, fontFamily: SYMBOL_FONT_FAMILY }} className="text-2xl leading-none">
          {PLANET_GLYPHS.Moon}
        </span>
        <span style={{ color: ELEMENT_COLORS[sign.element], fontFamily: SYMBOL_FONT_FAMILY }} className="text-lg leading-none">
          {sign.glyph}
        </span>
        <span>
          {sign.name} {Math.floor(degreeInSign)}°
        </span>
        <span className="text-neutral-600">·</span>
        <span style={{ color: ELEMENT_COLORS[sign.element] }}>{capitalize(sign.element)}</span>
      </div>
      <div className="grid grid-cols-[auto_auto_1fr] items-baseline gap-x-2 gap-y-0.5 text-sm">
        {riseSet && (
          <>
            <MetricRow
              name="Rise"
              value={riseSet.rise ? formatTime(riseSet.rise.time) : "—"}
              note={riseSet.rise ? formatAzimuth(riseSet.rise.azimuth) : undefined}
              nameColor="#fbbf24"
              wideNoteGap
            />
            <MetricRow
              name="Set"
              value={riseSet.set ? formatTime(riseSet.set.time) : "—"}
              note={riseSet.set ? formatAzimuth(riseSet.set.azimuth) : undefined}
              nameColor="#f97316"
              wideNoteGap
            />
            <div className="col-span-3 h-1.5" />
          </>
        )}
        <MetricRow name="Phase" value={phase.name} note={`${Math.round(phase.illuminatedFraction * 100)}%`} wideNoteGap />
        <MetricRow
          name="VOC"
          value={<span style={{ color: voc.isVoid ? "#fbbf24" : undefined }}>{voc.isVoid ? "Yes" : "No"}</span>}
          note={`until ${formatTime(voc.isVoid ? voc.voidUntil : (voc.lastAspect?.time ?? voc.voidUntil))}`}
          wideNoteGap
        />
        <div className="col-span-3 h-1.5" />
        <MetricRow
          name="Distance"
          value={<ValueWithUnit value={Math.round(distance.distanceKm * KM_TO_MILES).toLocaleString()} unit="mi" />}
          note={distance.category}
          wideNoteGap
        />
        <MetricRow name="New" value={formatUpcomingEvent(newMoon, now).date} />
        <MetricRow name="Full" value={formatUpcomingEvent(fullMoon, now).date} />
        <MetricRow name="Eclipse" value={formatUpcomingEvent(eclipse, now).date} note={eclipse.kind} wideNoteGap />
        <div className="col-span-3 h-3" />
        <AspectsList body="Moon" now={now} layout="grid" wideNoteGap />
      </div>
    </Card>
  );
}
