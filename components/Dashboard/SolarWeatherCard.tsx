"use client";

import useSWR from "swr";
import type { SpaceWeatherResponse } from "@/app/api/space-weather/route";
import { describeKp, describeSolarWindSpeed, describeBz, describeFlareClass, SEVERITY_COLORS, type MetricDescription } from "@/lib/spaceWeather";
import { Card } from "./Card";

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const REFRESH_MS = 10 * 60 * 1000;

function Metric({ value, description }: { value: string; description?: MetricDescription }) {
  return (
    <div>
      <div style={description ? { color: SEVERITY_COLORS[description.severity] } : undefined}>{value}</div>
      {description && <div className="text-xs text-neutral-400">{description.label}</div>}
    </div>
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
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div className="text-neutral-400">Solar wind</div>
          {data.solarWindSpeedKmS ? (
            <Metric
              value={`${Math.round(data.solarWindSpeedKmS)} km/s`}
              description={describeSolarWindSpeed(data.solarWindSpeedKmS)}
            />
          ) : (
            <Metric value="—" />
          )}

          <div className="text-neutral-400">Kp index</div>
          {data.kpIndex !== null ? (
            <Metric value={`${data.kpIndex}`} description={describeKp(data.kpIndex)} />
          ) : (
            <Metric value="—" />
          )}

          <div className="text-neutral-400">IMF Bz</div>
          {data.magFieldBz !== null ? (
            <Metric value={`${data.magFieldBz} nT`} description={describeBz(data.magFieldBz)} />
          ) : (
            <Metric value="—" />
          )}

          <div className="text-neutral-400">Recent flare</div>
          {data.recentFlareClass ? (
            <Metric value={data.recentFlareClass} description={describeFlareClass(data.recentFlareClass)} />
          ) : (
            <Metric value="—" />
          )}
        </div>
      )}
    </Card>
  );
}
