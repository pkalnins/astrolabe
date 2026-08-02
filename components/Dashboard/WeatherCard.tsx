"use client";

import useSWR from "swr";
import type { GeoLocation } from "@/lib/astro/location";
import type { WeatherResponse, PressureTrend } from "@/app/api/weather/route";
import { compassPointFor } from "@/lib/astro/compass";
import { Card } from "./Card";

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const REFRESH_MS = 10 * 60 * 1000;

const PRESSURE_TREND_ARROW: Record<PressureTrend, string> = {
  rising: "↑",
  falling: "↓",
  steady: "→",
};

export function WeatherCard({ location }: { location: GeoLocation | null }) {
  const key = location ? `/api/weather?latitude=${location.latitude}&longitude=${location.longitude}` : null;
  const { data, error } = useSWR<WeatherResponse>(key, fetcher, { refreshInterval: REFRESH_MS });

  return (
    <Card title="Weather">
      {!location ? (
        <div className="text-sm text-neutral-400">Waiting for location…</div>
      ) : error ? (
        <div className="text-sm text-neutral-400">Weather unavailable.</div>
      ) : !data ? (
        <div className="text-sm text-neutral-400">Loading…</div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div className="text-neutral-400">Temperature</div>
          <div>{Math.round(data.temperatureF)}°F</div>
          <div className="text-neutral-400">Humidity</div>
          <div>{data.humidityPercent}%</div>
          <div className="text-neutral-400">Pressure</div>
          <div>
            {data.pressureHpa.toFixed(1)} hPa <span className="text-neutral-400">{PRESSURE_TREND_ARROW[data.pressureTrend]}</span>
          </div>
          <div className="text-neutral-400">Wind</div>
          <div>
            {data.windSpeedKmh.toFixed(0)} km/h <span className="text-neutral-400">{compassPointFor(data.windDirectionDeg)}</span>
          </div>
        </div>
      )}
    </Card>
  );
}
