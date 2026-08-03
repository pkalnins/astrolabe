"use client";

import { useMemo } from "react";
import { getMoonPhase } from "@/lib/astro/moonPhase";
import { getMoonDistance } from "@/lib/astro/moonDistance";
import { getPlanetPosition } from "@/lib/astro/positions";
import { toSidereal } from "@/lib/astro/ayanamsa";
import { getZodiacPosition } from "@/lib/astro/zodiac";
import { getNextNewMoon, getNextFullMoon, getNextLunarEclipse, type UpcomingEvent } from "@/lib/astro/skyEvents";
import type { GeoLocation } from "@/lib/astro/location";
import type { ZodiacMode } from "@/lib/hooks/useAstroState";
import { ELEMENT_COLORS, SYMBOL_FONT_FAMILY } from "@/components/SkyWheel/glyphs";
import { formatUpcomingEvent } from "./eventFormat";
import { MetricRow } from "./MetricRow";
import { Card } from "./Card";

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export function MoonCard({ location, now, mode }: { location: GeoLocation | null; now: Date; mode: ZodiacMode }) {
  const phase = useMemo(() => getMoonPhase(now), [now]);
  const distance = useMemo(() => getMoonDistance(now), [now]);

  const moonSign = useMemo(() => {
    const tropicalLongitude = getPlanetPosition("Moon", now).eclipticLongitude;
    const longitude = mode === "tropical" ? tropicalLongitude : toSidereal(tropicalLongitude, now);
    return getZodiacPosition(longitude).sign;
  }, [now, mode]);

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
    <Card title="Moon">
      <div className="mb-1.5 flex items-center gap-2 text-sm">
        <span className="text-lg leading-none">{phase.glyph}</span>
        <span>{phase.name}</span>
        <span className="text-neutral-400">{Math.round(phase.illuminatedFraction * 100)}%</span>
        <span className="text-neutral-600">·</span>
        <span style={{ color: ELEMENT_COLORS[moonSign.element], fontFamily: SYMBOL_FONT_FAMILY }}>{moonSign.glyph}</span>
        <span style={{ color: ELEMENT_COLORS[moonSign.element] }}>{capitalize(moonSign.element)}</span>
      </div>
      <div className="grid grid-cols-[auto_auto_1fr] items-baseline gap-x-2 gap-y-0.5 text-sm">
        <MetricRow name="Distance" value={`${Math.round(distance.distanceKm).toLocaleString()} km`} note={distance.category} />
        {upcoming.map(({ label, event }) => {
          const { date } = formatUpcomingEvent(event, now);
          return <MetricRow key={label} name={label} value={date} />;
        })}
      </div>
    </Card>
  );
}
