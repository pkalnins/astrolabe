"use client";

import { Fragment, useMemo } from "react";
import { getMoonriseMoonset, type RiseSetEvent } from "@/lib/astro/events";
import { getMoonPhase } from "@/lib/astro/moonPhase";
import { getMoonDistance } from "@/lib/astro/moonDistance";
import { getPlanetPosition } from "@/lib/astro/positions";
import { toSidereal } from "@/lib/astro/ayanamsa";
import { getZodiacPosition } from "@/lib/astro/zodiac";
import { getNextNewMoon, getNextFullMoon, getNextLunarEclipse, type UpcomingEvent } from "@/lib/astro/skyEvents";
import { formatAzimuth } from "@/lib/astro/compass";
import type { GeoLocation } from "@/lib/astro/location";
import type { ZodiacMode } from "@/lib/hooks/useAstroState";
import { ELEMENT_COLORS, SYMBOL_FONT_FAMILY } from "@/components/SkyWheel/glyphs";
import { formatUpcomingEvent } from "./eventFormat";
import { Card } from "./Card";

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function EventTime({ event }: { event: RiseSetEvent | null }) {
  if (!event) return <>—</>;
  const time = event.time.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return (
    <>
      {time} <span className="text-xs text-neutral-400">{formatAzimuth(event.azimuth)}</span>
    </>
  );
}

export function MoonCard({ location, now, mode }: { location: GeoLocation | null; now: Date; mode: ZodiacMode }) {
  const dayKey = now.toDateString();

  const moonTimes = useMemo(
    () => (location ? getMoonriseMoonset(now, location) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [location?.latitude, location?.longitude, dayKey],
  );

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
      <div className="mb-2 flex items-center gap-2 text-sm">
        <span className="text-lg leading-none">{phase.glyph}</span>
        <span>{phase.name}</span>
        <span className="text-neutral-400">{Math.round(phase.illuminatedFraction * 100)}%</span>
        <span className="text-neutral-600">·</span>
        <span style={{ color: ELEMENT_COLORS[moonSign.element], fontFamily: SYMBOL_FONT_FAMILY }}>{moonSign.glyph}</span>
        <span style={{ color: ELEMENT_COLORS[moonSign.element] }}>{capitalize(moonSign.element)}</span>
      </div>
      <div className="mb-3 text-sm text-neutral-400">
        {Math.round(distance.distanceKm).toLocaleString()} km <span className="text-neutral-500">·</span> {distance.category}
      </div>

      {moonTimes ? (
        <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div className="text-neutral-400">Moonrise</div>
          <div>
            <EventTime event={moonTimes.rise} />
          </div>
          <div className="text-neutral-400">Moonset</div>
          <div>
            <EventTime event={moonTimes.set} />
          </div>
        </div>
      ) : (
        <div className="mb-3 text-sm text-neutral-400">Waiting for location…</div>
      )}

      <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-3 gap-y-1 text-sm">
        {upcoming.map(({ label, event }) => {
          const { date, daysUntil } = formatUpcomingEvent(event, now);
          return (
            <Fragment key={label}>
              <div className="text-neutral-400">{label}</div>
              <div>{date}</div>
              <div className="text-xs text-neutral-400">{daysUntil}</div>
            </Fragment>
          );
        })}
      </div>
    </Card>
  );
}
