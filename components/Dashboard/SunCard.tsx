"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { getNextSeason } from "@/lib/astro/skyEvents";
import { describeKp, describeSolarWindSpeed, describeBz, describeFlareClass } from "@/lib/spaceWeather";
import { describeAuroraChance } from "@/lib/aurora";
import type { GeoLocation } from "@/lib/astro/location";
import type { SpaceWeatherResponse } from "@/app/api/space-weather/route";
import type { AuroraResponse } from "@/app/api/aurora/route";
import { formatUpcomingEvent } from "./eventFormat";
import { MetricRow, ValueWithUnit } from "./MetricRow";
import { Card } from "./Card";

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const REFRESH_MS = 10 * 60 * 1000;

export function SunCard({ location, now }: { location: GeoLocation | null; now: Date }) {
  const season = useMemo(() => getNextSeason(now), [now]);

  const { data: spaceWeather } = useSWR<SpaceWeatherResponse>("/api/space-weather", fetcher, { refreshInterval: REFRESH_MS });
  const auroraKey = location ? `/api/aurora?latitude=${location.latitude}&longitude=${location.longitude}` : null;
  const { data: aurora } = useSWR<AuroraResponse>(auroraKey, fetcher, { refreshInterval: REFRESH_MS });

  const { date: seasonDate } = formatUpcomingEvent(season, now);

  return (
    <Card title="Sun">
      <div className="grid grid-cols-[auto_auto_1fr] items-baseline gap-x-2 gap-y-0.5 text-sm">
        {spaceWeather ? (
          <>
            <MetricRow
              name="Solar wind"
              value={spaceWeather.solarWindSpeedKmS ? <ValueWithUnit value={`${Math.round(spaceWeather.solarWindSpeedKmS)}`} unit="km/s" /> : "—"}
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

        <MetricRow name={season.name} value={seasonDate} />
      </div>
    </Card>
  );
}
