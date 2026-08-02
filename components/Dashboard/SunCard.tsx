"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { getSunriseSunset, type RiseSetEvent } from "@/lib/astro/events";
import { getNextSeason } from "@/lib/astro/skyEvents";
import { formatAzimuth } from "@/lib/astro/compass";
import { describeKp, describeSolarWindSpeed, describeBz, describeFlareClass } from "@/lib/spaceWeather";
import { describeAuroraChance } from "@/lib/aurora";
import { SEVERITY_COLORS, type MetricDescription } from "@/lib/severity";
import type { GeoLocation } from "@/lib/astro/location";
import type { SpaceWeatherResponse } from "@/app/api/space-weather/route";
import type { AuroraResponse } from "@/app/api/aurora/route";
import { formatUpcomingEvent } from "./eventFormat";
import { Card } from "./Card";

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const REFRESH_MS = 10 * 60 * 1000;

function EventTime({ event }: { event: RiseSetEvent | null }) {
  if (!event) return <>—</>;
  const time = event.time.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return (
    <>
      {time} <span className="text-xs text-neutral-400">{formatAzimuth(event.azimuth)}</span>
    </>
  );
}

function MetricRow({ name, value, description }: { name: string; value: string; description?: MetricDescription }) {
  return (
    <>
      <div className="text-neutral-400">{name}</div>
      <div style={description ? { color: SEVERITY_COLORS[description.severity] } : undefined}>{value}</div>
      <div className="text-xs text-neutral-400">{description?.label}</div>
    </>
  );
}

export function SunCard({ location, now }: { location: GeoLocation | null; now: Date }) {
  const dayKey = now.toDateString();
  const sunTimes = useMemo(
    () => (location ? getSunriseSunset(now, location) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [location?.latitude, location?.longitude, dayKey],
  );
  const season = useMemo(() => getNextSeason(now), [now]);

  const { data: spaceWeather } = useSWR<SpaceWeatherResponse>("/api/space-weather", fetcher, { refreshInterval: REFRESH_MS });
  const auroraKey = location ? `/api/aurora?latitude=${location.latitude}&longitude=${location.longitude}` : null;
  const { data: aurora } = useSWR<AuroraResponse>(auroraKey, fetcher, { refreshInterval: REFRESH_MS });

  const seasonFormatted = formatUpcomingEvent(season, now);

  return (
    <Card title="Sun">
      {sunTimes ? (
        <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div className="text-neutral-400">Sunrise</div>
          <div>
            <EventTime event={sunTimes.rise} />
          </div>
          <div className="text-neutral-400">Sunset</div>
          <div>
            <EventTime event={sunTimes.set} />
          </div>
        </div>
      ) : (
        <div className="mb-3 text-sm text-neutral-400">Waiting for location…</div>
      )}

      {spaceWeather ? (
        <div className="mb-3 grid grid-cols-[auto_auto_1fr] items-baseline gap-x-2 gap-y-2 text-sm">
          <MetricRow
            name="Solar wind"
            value={spaceWeather.solarWindSpeedKmS ? `${Math.round(spaceWeather.solarWindSpeedKmS)} km/s` : "—"}
            description={spaceWeather.solarWindSpeedKmS ? describeSolarWindSpeed(spaceWeather.solarWindSpeedKmS) : undefined}
          />
          <MetricRow
            name="Kp index"
            value={spaceWeather.kpIndex !== null ? `${spaceWeather.kpIndex}` : "—"}
            description={spaceWeather.kpIndex !== null ? describeKp(spaceWeather.kpIndex) : undefined}
          />
          <MetricRow
            name="IMF Bz"
            value={spaceWeather.magFieldBz !== null ? `${spaceWeather.magFieldBz} nT` : "—"}
            description={spaceWeather.magFieldBz !== null ? describeBz(spaceWeather.magFieldBz) : undefined}
          />
          <MetricRow
            name="Recent flare"
            value={spaceWeather.recentFlareClass ?? "—"}
            description={spaceWeather.recentFlareClass ? describeFlareClass(spaceWeather.recentFlareClass) : undefined}
          />
          <MetricRow
            name="Aurora chance"
            value={aurora ? `${Math.round(aurora.probabilityPercent)}%` : "—"}
            description={aurora ? describeAuroraChance(aurora.probabilityPercent) : undefined}
          />
        </div>
      ) : (
        <div className="mb-3 text-sm text-neutral-400">Loading solar activity…</div>
      )}

      <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-3 text-sm">
        <div className="text-neutral-400">{season.name}</div>
        <div>{seasonFormatted.date}</div>
        <div className="text-xs text-neutral-400">{seasonFormatted.daysUntil}</div>
      </div>
    </Card>
  );
}
