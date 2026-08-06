"use client";

import useSWR from "swr";
import type { GeoLocation } from "@/lib/astro/location";
import type { SatellitePassResponse } from "@/app/api/satellite-passes/route";
import { formatAzimuth } from "@/lib/astro/compass";
import { MetricRow } from "./MetricRow";
import { Card } from "./Card";

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const REFRESH_MS = 10 * 60 * 1000;

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatDuration(riseTime: Date, setTime: Date): string {
  const minutes = Math.round((setTime.getTime() - riseTime.getTime()) / 60_000);
  return `${minutes} min`;
}

export function SatelliteCard({ location }: { location: GeoLocation | null }) {
  const key = location
    ? `/api/satellite-passes?latitude=${location.latitude}&longitude=${location.longitude}&elevation=${location.elevation ?? 0}`
    : null;
  const { data, error } = useSWR<SatellitePassResponse>(key, fetcher, { refreshInterval: REFRESH_MS });

  return (
    <Card title={data?.satelliteName ?? "Satellite"}>
      {!location ? (
        <div className="text-sm text-neutral-400">Waiting for location…</div>
      ) : error ? (
        <div className="text-sm text-neutral-400">Pass data unavailable.</div>
      ) : !data ? (
        <div className="text-sm text-neutral-400">Loading…</div>
      ) : !data.pass ? (
        <div className="text-sm text-neutral-400">No visible pass in the next 10 days.</div>
      ) : (
        <div className="grid grid-cols-[auto_auto_1fr] items-baseline gap-x-2 gap-y-0.5 text-sm">
          <MetricRow
            name="Rise"
            value={formatTime(new Date(data.pass.riseTime))}
            note={formatAzimuth(data.pass.riseAzimuthDeg)}
            nameColor="#fbbf24"
          />
          <MetricRow
            name="Max Elevation"
            value={formatTime(new Date(data.pass.maxElevationTime))}
            note={`${Math.round(data.pass.maxElevationDeg)}°`}
          />
          <MetricRow
            name="Set"
            value={formatTime(new Date(data.pass.setTime))}
            note={formatAzimuth(data.pass.setAzimuthDeg)}
            nameColor="#f97316"
          />
          <MetricRow name="Duration" value={formatDuration(new Date(data.pass.riseTime), new Date(data.pass.setTime))} />
        </div>
      )}
    </Card>
  );
}
