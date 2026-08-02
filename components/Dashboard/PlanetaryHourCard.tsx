"use client";

import { useMemo } from "react";
import { getPlanetaryHour } from "@/lib/astro/planetaryHours";
import type { GeoLocation } from "@/lib/astro/location";
import { PLANET_GLYPHS, PLANET_COLORS } from "@/components/SkyWheel/glyphs";
import { Card } from "./Card";

export function PlanetaryHourCard({ location, now }: { location: GeoLocation | null; now: Date }) {
  const hour = useMemo(() => {
    if (!location) return null;
    try {
      return getPlanetaryHour(now, location);
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.latitude, location?.longitude, now]);

  if (!location) {
    return (
      <Card title="Planetary Hour">
        <div className="text-sm text-neutral-400">Waiting for location…</div>
      </Card>
    );
  }

  if (!hour) {
    return (
      <Card title="Planetary Hour">
        <div className="text-sm text-neutral-400">Unavailable at this location.</div>
      </Card>
    );
  }

  const hourOfPeriod = hour.isDaytime ? hour.hourNumber : hour.hourNumber - 12;
  const endTime = hour.end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  return (
    <Card title="Planetary Hour">
      <div className="flex items-center gap-2 text-sm" style={{ color: PLANET_COLORS[hour.ruler] }}>
        <span className="text-lg leading-none">{PLANET_GLYPHS[hour.ruler]}</span>
        <span className="text-base">{hour.ruler}</span>
      </div>
      <div className="mt-1 text-xs text-neutral-400">
        {hour.isDaytime ? "Day" : "Night"} hour {hourOfPeriod} of 12 <span className="text-neutral-500">·</span> until {endTime}
      </div>
    </Card>
  );
}
