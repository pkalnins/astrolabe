"use client";

import useSWR from "swr";
import type { GeoLocation } from "@/lib/astro/location";
import type { WeatherResponse, PressureTrend } from "@/app/api/weather/route";
import type { AirQualityResponse } from "@/app/api/air-quality/route";
import { compassPointFor } from "@/lib/astro/compass";
import { describeUvIndex } from "@/lib/uvIndex";
import { describeAqi } from "@/lib/airQuality";
import { describeWeatherCode } from "@/lib/weatherCode";
import { SEVERITY_COLORS } from "@/lib/severity";
import { Card } from "./Card";

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const REFRESH_MS = 10 * 60 * 1000;

const PRESSURE_TREND_ARROW: Record<PressureTrend, string> = {
  rising: "↑",
  falling: "↓",
  steady: "→",
};

export function WeatherCard({ location }: { location: GeoLocation | null }) {
  const weatherKey = location ? `/api/weather?latitude=${location.latitude}&longitude=${location.longitude}` : null;
  const { data, error } = useSWR<WeatherResponse>(weatherKey, fetcher, { refreshInterval: REFRESH_MS });

  const airQualityKey = location ? `/api/air-quality?latitude=${location.latitude}&longitude=${location.longitude}` : null;
  const { data: airQuality } = useSWR<AirQualityResponse>(airQualityKey, fetcher, { refreshInterval: REFRESH_MS });

  return (
    <Card title="Weather">
      {!location ? (
        <div className="text-sm text-neutral-400">Waiting for location…</div>
      ) : error ? (
        <div className="text-sm text-neutral-400">Weather unavailable.</div>
      ) : !data ? (
        <div className="text-sm text-neutral-400">Loading…</div>
      ) : (
        <>
          <div className="mb-2 flex items-center gap-2 text-sm">
            <span className="text-lg leading-none">{describeWeatherCode(data.weatherCode).icon}</span>
            <span>{describeWeatherCode(data.weatherCode).label}</span>
          </div>
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
            <div className="text-neutral-400">UV Index</div>
            <div>
              <span style={{ color: SEVERITY_COLORS[describeUvIndex(data.uvIndex).severity] }}>{data.uvIndex.toFixed(1)}</span>{" "}
              <span className="text-xs text-neutral-400">{describeUvIndex(data.uvIndex).label}</span>
            </div>
            <div className="text-neutral-400">Air Quality</div>
            <div>
              {airQuality ? (
                <>
                  <span style={{ color: SEVERITY_COLORS[describeAqi(airQuality.usAqi).severity] }}>{airQuality.usAqi}</span>{" "}
                  <span className="text-xs text-neutral-400">{describeAqi(airQuality.usAqi).label}</span>
                </>
              ) : (
                "—"
              )}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
