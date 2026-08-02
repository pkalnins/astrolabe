"use client";

import { useMemo } from "react";
import { getSunriseSunset, getMoonriseMoonset } from "@/lib/astro/events";
import { getMoonPhase } from "@/lib/astro/moonPhase";
import type { GeoLocation } from "@/lib/astro/location";
import { Card } from "./Card";

function formatTime(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function SunMoonCard({ location, now }: { location: GeoLocation | null; now: Date }) {
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

  return (
    <Card title="Sun & Moon">
      <div className="mb-2 flex items-center gap-2 text-sm">
        <span className="text-lg leading-none">{phase.glyph}</span>
        <span>{phase.name}</span>
        <span className="text-neutral-400">({Math.round(phase.illuminatedFraction * 100)}% illuminated)</span>
      </div>
      {times ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div className="text-neutral-400">Sunrise</div>
          <div>{formatTime(times.sun.rise)}</div>
          <div className="text-neutral-400">Sunset</div>
          <div>{formatTime(times.sun.set)}</div>
          <div className="text-neutral-400">Moonrise</div>
          <div>{formatTime(times.moon.rise)}</div>
          <div className="text-neutral-400">Moonset</div>
          <div>{formatTime(times.moon.set)}</div>
        </div>
      ) : (
        <div className="text-sm text-neutral-400">Waiting for location…</div>
      )}
    </Card>
  );
}
