"use client";

import { useMemo } from "react";
import { getMoonPhase } from "@/lib/astro/moonPhase";
import { getMoonDistance } from "@/lib/astro/moonDistance";
import { getZodiacPosition } from "@/lib/astro/zodiac";
import { getMoonriseMoonset, startOfLocalDay } from "@/lib/astro/events";
import { formatAzimuth } from "@/lib/astro/compass";
import { getNextNewMoon, getNextFullMoon, getNextLunarEclipse, type UpcomingEvent } from "@/lib/astro/skyEvents";
import type { GeoLocation } from "@/lib/astro/location";
import { formatUpcomingEvent } from "@/components/Dashboard/eventFormat";
import { MetricRow } from "@/components/Dashboard/MetricRow";
import { ELEMENT_COLORS, PLANET_GLYPHS, PLANET_COLORS, SYMBOL_FONT_FAMILY } from "./glyphs";
import { AspectsList } from "./AspectsList";

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function MoonTooltip({ longitude, location, now }: { longitude: number; location: GeoLocation | null; now: Date }) {
  const phase = useMemo(() => getMoonPhase(now), [now]);
  const distance = useMemo(() => getMoonDistance(now), [now]);
  const { sign, degreeInSign } = getZodiacPosition(longitude);

  // Anchored to local midnight, same reasoning as SunTooltip/RhythmCard - so
  // these stay "today's" rise/set throughout the day rather than jumping to
  // tomorrow's moonrise the moment today's has passed.
  const riseSet = useMemo(() => (location ? getMoonriseMoonset(startOfLocalDay(now), location) : null), [location, now]);

  const upcoming: { label: string; event: UpcomingEvent }[] = useMemo(() => {
    const newMoon = getNextNewMoon(now);
    const fullMoon = getNextFullMoon(now);
    const eclipse = getNextLunarEclipse(now);
    return [
      { label: "New Moon", event: newMoon },
      { label: "Full Moon", event: fullMoon },
      { label: eclipse.name, event: eclipse },
    ];
  }, [now]);

  return (
    <div className="w-80 rounded-lg border border-neutral-700 bg-neutral-900/95 p-3 text-sm shadow-xl backdrop-blur">
      <div className="mb-1 flex items-center gap-2">
        <span style={{ color: PLANET_COLORS.Moon, fontFamily: SYMBOL_FONT_FAMILY }} className="text-2xl leading-none">
          {PLANET_GLYPHS.Moon}
        </span>
        <span>Moon</span>
        <span className="text-neutral-600">·</span>
        <span style={{ color: ELEMENT_COLORS[sign.element], fontFamily: SYMBOL_FONT_FAMILY }} className="text-lg leading-none">
          {sign.glyph}
        </span>
        <span>
          {sign.name} {Math.floor(degreeInSign)}°
        </span>
        <span className="text-neutral-600">·</span>
        <span style={{ color: ELEMENT_COLORS[sign.element] }}>{capitalize(sign.element)}</span>
      </div>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-lg leading-none">{phase.glyph}</span>
        <span>{phase.name}</span>
        <span className="text-neutral-400">{Math.round(phase.illuminatedFraction * 100)}%</span>
      </div>
      <div className="grid grid-cols-[auto_auto_1fr] items-baseline gap-x-2 gap-y-0.5">
        {riseSet?.rise && (
          <MetricRow name="Rise" value={formatTime(riseSet.rise.time)} note={formatAzimuth(riseSet.rise.azimuth)} nameColor="#fbbf24" />
        )}
        {riseSet?.set && (
          <MetricRow name="Set" value={formatTime(riseSet.set.time)} note={formatAzimuth(riseSet.set.azimuth)} nameColor="#f97316" />
        )}
        {riseSet && <div className="col-span-3 h-1.5" />}
        <MetricRow name="Distance" value={`${Math.round(distance.distanceKm).toLocaleString()} km`} note={distance.category} />
        {upcoming.map(({ label, event }) => {
          const { date } = formatUpcomingEvent(event, now);
          return <MetricRow key={label} name={label} value={date} />;
        })}
      </div>
      <div className="mt-2">
        <AspectsList body="Moon" now={now} />
      </div>
    </div>
  );
}
