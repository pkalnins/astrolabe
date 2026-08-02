"use client";

import useSWR from "swr";
import type { SpaceWeatherResponse } from "@/app/api/space-weather/route";
import { Card } from "./Card";

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const REFRESH_MS = 10 * 60 * 1000;

export function SolarWeatherCard() {
  const { data, error } = useSWR<SpaceWeatherResponse>("/api/space-weather", fetcher, { refreshInterval: REFRESH_MS });

  return (
    <Card title="Solar Weather">
      {error ? (
        <div className="text-sm text-neutral-400">Solar weather unavailable.</div>
      ) : !data ? (
        <div className="text-sm text-neutral-400">Loading…</div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div className="text-neutral-400">Solar wind</div>
          <div>{data.solarWindSpeedKmS ? `${Math.round(data.solarWindSpeedKmS)} km/s` : "—"}</div>
          <div className="text-neutral-400">Kp index</div>
          <div>{data.kpIndex ?? "—"}</div>
          <div className="text-neutral-400">IMF Bz</div>
          <div>{data.magFieldBz !== null ? `${data.magFieldBz} nT` : "—"}</div>
          <div className="text-neutral-400">Recent flare</div>
          <div>{data.recentFlareClass ?? "—"}</div>
        </div>
      )}
    </Card>
  );
}
