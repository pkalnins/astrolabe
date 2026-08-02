"use client";

import useSWR from "swr";
import type { SpaceWeatherResponse } from "@/app/api/space-weather/route";
import { describeKp, describeSolarWindSpeed, describeBz, describeFlareClass, SEVERITY_COLORS, type MetricDescription } from "@/lib/spaceWeather";
import { Card } from "./Card";

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const REFRESH_MS = 10 * 60 * 1000;

function MetricRow({ name, value, description }: { name: string; value: string; description?: MetricDescription }) {
  return (
    <>
      <div className="text-neutral-400">{name}</div>
      <div style={description ? { color: SEVERITY_COLORS[description.severity] } : undefined}>{value}</div>
      <div className="text-xs text-neutral-400">{description?.label}</div>
    </>
  );
}

export function SolarWeatherCard() {
  const { data, error } = useSWR<SpaceWeatherResponse>("/api/space-weather", fetcher, { refreshInterval: REFRESH_MS });

  return (
    <Card title="Solar Weather">
      {error ? (
        <div className="text-sm text-neutral-400">Solar weather unavailable.</div>
      ) : !data ? (
        <div className="text-sm text-neutral-400">Loading…</div>
      ) : (
        <div className="grid grid-cols-[auto_auto_1fr] items-baseline gap-x-2 gap-y-2 text-sm">
          <MetricRow
            name="Solar wind"
            value={data.solarWindSpeedKmS ? `${Math.round(data.solarWindSpeedKmS)} km/s` : "—"}
            description={data.solarWindSpeedKmS ? describeSolarWindSpeed(data.solarWindSpeedKmS) : undefined}
          />
          <MetricRow
            name="Kp index"
            value={data.kpIndex !== null ? `${data.kpIndex}` : "—"}
            description={data.kpIndex !== null ? describeKp(data.kpIndex) : undefined}
          />
          <MetricRow
            name="IMF Bz"
            value={data.magFieldBz !== null ? `${data.magFieldBz} nT` : "—"}
            description={data.magFieldBz !== null ? describeBz(data.magFieldBz) : undefined}
          />
          <MetricRow
            name="Recent flare"
            value={data.recentFlareClass ?? "—"}
            description={data.recentFlareClass ? describeFlareClass(data.recentFlareClass) : undefined}
          />
        </div>
      )}
    </Card>
  );
}
