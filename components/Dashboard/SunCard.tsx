"use client";

import { useMemo } from "react";
import { getZodiacPosition } from "@/lib/astro/zodiac";
import { getSunriseSunset, startOfLocalDay } from "@/lib/astro/events";
import { formatAzimuth } from "@/lib/astro/compass";
import { describeKp, describeSolarWindSpeed, describeBz, describeFlareClass } from "@/lib/spaceWeather";
import { describeAuroraChance } from "@/lib/aurora";
import { useSolarActivity } from "@/lib/hooks/useSolarActivity";
import type { GeoLocation } from "@/lib/astro/location";
import { PLANET_GLYPHS, PLANET_COLORS, ELEMENT_COLORS, SYMBOL_FONT_FAMILY } from "@/components/SkyWheel/glyphs";
import { AspectsList } from "@/components/SkyWheel/AspectsList";
import { MetricRow, ValueWithUnit } from "./MetricRow";
import { Card } from "./Card";

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

// Mirrors SkyWheel/SunTooltip's content exactly, so the dashboard shows the
// same Sun data whether or not the wheel is on screen to hover over.
export function SunCard({ longitude, location, now }: { longitude: number; location: GeoLocation | null; now: Date }) {
  const { spaceWeather, aurora } = useSolarActivity(location);
  const { sign, degreeInSign } = getZodiacPosition(longitude);

  const riseSet = useMemo(() => (location ? getSunriseSunset(startOfLocalDay(now), location) : null), [location, now]);

  return (
    <Card title="Sun">
      <div className="mb-1.5 flex items-center gap-2 text-sm">
        <span style={{ color: PLANET_COLORS.Sun, fontFamily: SYMBOL_FONT_FAMILY }} className="text-2xl leading-none">
          {PLANET_GLYPHS.Sun}
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
        {riseSet?.rise && (
          <MetricRow name="Rise" value={formatTime(riseSet.rise.time)} note={formatAzimuth(riseSet.rise.azimuth)} nameColor="#fbbf24" />
        )}
        {riseSet?.set && (
          <MetricRow name="Set" value={formatTime(riseSet.set.time)} note={formatAzimuth(riseSet.set.azimuth)} nameColor="#f97316" />
        )}
        {riseSet && <div className="col-span-3 h-1.5" />}
        {spaceWeather ? (
          <>
            <MetricRow
              name="Solar wind"
              value={
                spaceWeather.solarWindSpeedKmS ? (
                  <ValueWithUnit value={`${Math.round(spaceWeather.solarWindSpeedKmS)}`} unit="km/s" />
                ) : (
                  "—"
                )
              }
              description={spaceWeather.solarWindSpeedKmS ? describeSolarWindSpeed(spaceWeather.solarWindSpeedKmS) : undefined}
            />
            <MetricRow
              name="Kp index"
              value={spaceWeather.kpIndex !== null ? `${spaceWeather.kpIndex}` : "—"}
              description={spaceWeather.kpIndex !== null ? describeKp(spaceWeather.kpIndex) : undefined}
            />
            <MetricRow
              name="IMF Bz"
              value={spaceWeather.magFieldBz !== null ? <ValueWithUnit value={`${spaceWeather.magFieldBz}`} unit="nT" /> : "—"}
              description={spaceWeather.magFieldBz !== null ? describeBz(spaceWeather.magFieldBz) : undefined}
            />
            <MetricRow
              name="Recent flare"
              value={spaceWeather.recentFlareClass ?? "—"}
              description={spaceWeather.recentFlareClass ? describeFlareClass(spaceWeather.recentFlareClass) : undefined}
            />
            <MetricRow
              name="Aurora chance"
              value={aurora ? <ValueWithUnit value={`${Math.round(aurora.probabilityPercent)}`} unit="%" spaced={false} /> : "—"}
              description={aurora ? describeAuroraChance(aurora.probabilityPercent) : undefined}
            />
          </>
        ) : (
          <div className="col-span-3 text-neutral-400">Loading solar activity…</div>
        )}
        <div className="col-span-3 h-3" />
        <AspectsList body="Sun" now={now} layout="grid" />
      </div>
    </Card>
  );
}
