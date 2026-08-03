"use client";

import useSWR from "swr";
import type { GeoLocation } from "@/lib/astro/location";
import type { WeatherResponse, PressureTrend } from "@/app/api/weather/route";
import type { AirQualityResponse } from "@/app/api/air-quality/route";
import { compassPointFor } from "@/lib/astro/compass";
import { describeUvIndex } from "@/lib/uvIndex";
import { describeAqi } from "@/lib/airQuality";
import { describeWeatherCode } from "@/lib/weatherCode";
import { describeTemperatureComfort } from "@/lib/temperatureComfort";
import { MetricRow, ValueWithUnit } from "./MetricRow";
import { TemperatureSlider } from "./TemperatureSlider";
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
          <div className="mb-1.5 flex items-center gap-2 text-sm">
            <span className="text-lg leading-none">{describeWeatherCode(data.weatherCode).icon}</span>
            <span>{describeWeatherCode(data.weatherCode).label}</span>
          </div>
          <TemperatureSlider low={data.temperatureLowF} high={data.temperatureHighF} current={data.temperatureF} />
          <div className="grid grid-cols-[auto_auto_1fr] items-baseline gap-x-2 gap-y-0.5 text-sm">
            <MetricRow
              name="Temperature"
              value={<ValueWithUnit value={`${Math.round(data.temperatureF)}`} unit="°F" spaced={false} />}
              description={describeTemperatureComfort(data.temperatureF)}
            />
            <MetricRow name="Humidity" value={<ValueWithUnit value={`${data.humidityPercent}`} unit="%" spaced={false} />} />
            <MetricRow
              name="Pressure"
              value={<ValueWithUnit value={data.pressureHpa.toFixed(1)} unit="hPa" />}
              note={PRESSURE_TREND_ARROW[data.pressureTrend]}
            />
            <MetricRow
              name="Wind"
              value={<ValueWithUnit value={data.windSpeedKmh.toFixed(0)} unit="km/h" />}
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
