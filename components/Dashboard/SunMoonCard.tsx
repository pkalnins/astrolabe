"use client";

import { useMemo } from "react";
import { getSunriseSunset, getMoonriseMoonset, type RiseSetEvent } from "@/lib/astro/events";
import { getMoonPhase } from "@/lib/astro/moonPhase";
import { formatAzimuth } from "@/lib/astro/compass";
import { getPlanetPosition } from "@/lib/astro/positions";
import { toSidereal } from "@/lib/astro/ayanamsa";
import { getZodiacPosition } from "@/lib/astro/zodiac";
import type { GeoLocation } from "@/lib/astro/location";
import type { ZodiacMode } from "@/lib/hooks/useAstroState";
import { ELEMENT_COLORS } from "@/components/SkyWheel/glyphs";
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

export function SunMoonCard({ location, now, mode }: { location: GeoLocation | null; now: Date; mode: ZodiacMode }) {
  const dayKey = now.toDateString();

  const times = useMemo(() => {
    if (!location) return null;
    return {
      sun: getSunriseSunset(now, location),
      moon: getMoonriseMoonset(now, location),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.latitude, location?.longitude, dayKey]);

  const phase = useMemo(() => getMoonPhase(now), [now]);

  const moonElement = useMemo(() => {
    const tropicalLongitude = getPlanetPosition("Moon", now).eclipticLongitude;
    const longitude = mode === "tropical" ? tropicalLongitude : toSidereal(tropicalLongitude, now);
    return getZodiacPosition(longitude).sign.element;
  }, [now, mode]);

  return (
    <Card title="Sun & Moon">
      <div className="mb-2 flex items-center gap-2 text-sm">
        <span className="text-lg leading-none">{phase.glyph}</span>
        <span>{phase.name}</span>
        <span className="text-neutral-400">{Math.round(phase.illuminatedFraction * 100)}%</span>
        <span className="text-neutral-600">·</span>
        <span style={{ color: ELEMENT_COLORS[moonElement] }}>{capitalize(moonElement)}</span>
      </div>
      {times ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div className="text-neutral-400">Sunrise</div>
          <div>
            <EventTime event={times.sun.rise} />
          </div>
          <div className="text-neutral-400">Sunset</div>
          <div>
            <EventTime event={times.sun.set} />
          </div>
          <div className="text-neutral-400">Moonrise</div>
          <div>
            <EventTime event={times.moon.rise} />
          </div>
          <div className="text-neutral-400">Moonset</div>
          <div>
            <EventTime event={times.moon.set} />
          </div>
        </div>
      ) : (
        <div className="text-sm text-neutral-400">Waiting for location…</div>
      )}
    </Card>
  );
}
