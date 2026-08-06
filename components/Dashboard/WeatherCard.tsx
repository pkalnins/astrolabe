"use client";

import useSWR from "swr";
import type { GeoLocation } from "@/lib/astro/location";
import type { WeatherResponse, PressureTrend } from "@/app/api/weather/route";
import type { AirQualityResponse } from "@/app/api/air-quality/route";
import { compassPointFor } from "@/lib/astro/compass";
import { describeUvIndex } from "@/lib/uvIndex";
import { describeAqi } from "@/lib/airQuality";
import { describeWeatherCode } from "@/lib/weatherCode";
import { temperatureColor } from "@/lib/temperatureComfort";
import { SEVERITY_COLORS } from "@/lib/severity";
import { ValueWithUnit } from "./MetricRow";
import { TemperatureSlider } from "./TemperatureSlider";
import { Card } from "./Card";

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const REFRESH_MS = 10 * 60 * 1000;
const HPA_TO_INHG = 0.0295300;
const KMH_TO_MPH = 0.621371;

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
          <div className="mb-1.5 grid grid-cols-3 items-center gap-x-4 gap-y-1.5">
            <div className="col-span-1 text-3xl font-semibold tabular-nums" style={{ color: temperatureColor(data.temperatureF) }}>
              {Math.round(data.temperatureF)}°<span className="text-lg text-neutral-500">F</span>
            </div>
            <div className="col-span-2 flex items-center gap-1.5 text-sm">
              <span className="text-lg leading-none">{describeWeatherCode(data.weatherCode).icon}</span>
              <span>{describeWeatherCode(data.weatherCode).label}</span>
            </div>
            <div className="col-span-3">
              <TemperatureSlider low={data.temperatureLowF} high={data.temperatureHighF} current={data.temperatureF} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-y-1.5 text-sm">
            <div className="flex items-baseline gap-1.5">
              <span className="text-neutral-400">Humidity</span>
              <ValueWithUnit value={`${data.humidityPercent}`} unit="%" spaced={false} />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-neutral-400">Pressure</span>
              <ValueWithUnit value={(data.pressureHpa * HPA_TO_INHG).toFixed(2)} unit="inHg" />
              <span className="text-xs text-neutral-400">{PRESSURE_TREND_ARROW[data.pressureTrend]}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-neutral-400">Wind</span>
              <ValueWithUnit value={(data.windSpeedKmh * KMH_TO_MPH).toFixed(0)} unit="mph" />
              <span className="text-xs text-neutral-400">{compassPointFor(data.windDirectionDeg)}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-neutral-400">UV Index</span>
              <span style={{ color: SEVERITY_COLORS[describeUvIndex(data.uvIndex).severity] }}>{data.uvIndex.toFixed(1)}</span>
              <span className="text-xs text-neutral-400">{describeUvIndex(data.uvIndex).label}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-neutral-400">Air Quality</span>
              <span style={{ color: airQuality ? SEVERITY_COLORS[describeAqi(airQuality.usAqi).severity] : undefined }}>
                {airQuality ? airQuality.usAqi : "—"}
              </span>
              {airQuality && <span className="text-xs text-neutral-400">{describeAqi(airQuality.usAqi).label}</span>}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
