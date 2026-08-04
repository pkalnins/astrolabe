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
import { MetricRow, ValueWithUnit } from "./MetricRow";
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
          <div className="mb-1.5 flex items-center justify-between">
            <div className="text-3xl font-semibold tabular-nums" style={{ color: temperatureColor(data.temperatureF) }}>
              {Math.round(data.temperatureF)}°<span className="text-lg text-neutral-500">F</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-lg leading-none">{describeWeatherCode(data.weatherCode).icon}</span>
              <span>{describeWeatherCode(data.weatherCode).label}</span>
            </div>
          </div>
          <TemperatureSlider low={data.temperatureLowF} high={data.temperatureHighF} current={data.temperatureF} />
          <div className="grid grid-cols-[auto_auto_1fr] items-baseline gap-x-2 gap-y-0.5 text-sm">
            <MetricRow name="Humidity" value={<ValueWithUnit value={`${data.humidityPercent}`} unit="%" spaced={false} />} />
            <MetricRow
              name="Pressure"
              value={<ValueWithUnit value={(data.pressureHpa * HPA_TO_INHG).toFixed(2)} unit="inHg" />}
              note={PRESSURE_TREND_ARROW[data.pressureTrend]}
            />
            <MetricRow
              name="Wind"
              value={<ValueWithUnit value={(data.windSpeedKmh * KMH_TO_MPH).toFixed(0)} unit="mph" />}
              note={compassPointFor(data.windDirectionDeg)}
            />
            <MetricRow name="UV Index" value={data.uvIndex.toFixed(1)} description={describeUvIndex(data.uvIndex)} />
            <MetricRow
              name="Air Quality"
              value={airQuality ? `${airQuality.usAqi}` : "—"}
              description={airQuality ? describeAqi(airQuality.usAqi) : undefined}
            />
          </div>
        </>
      )}
    </Card>
  );
}
