import { NextRequest, NextResponse } from "next/server";

export type PressureTrend = "rising" | "falling" | "steady";

export interface WeatherResponse {
  temperatureF: number;
  temperatureHighF: number;
  temperatureLowF: number;
  humidityPercent: number;
  pressureHpa: number;
  pressureTrend: PressureTrend;
  weatherCode: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  uvIndex: number;
  observedAt: string;
}

// Open-Meteo: free, no API key required.
const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

// Threshold for calling a change "rising"/"falling" rather than "steady",
// applied over a 3-hour window - a common simplified convention for
// consumer pressure-trend indicators.
const PRESSURE_TREND_THRESHOLD_HPA = 1;
const PRESSURE_TREND_WINDOW_HOURS = 3;

function findClosestPressure(hourlyTimes: string[], hourlyPressures: number[], targetMs: number): number | null {
  let closestIndex = -1;
  let closestDiff = Infinity;
  for (let i = 0; i < hourlyTimes.length; i++) {
    // Open-Meteo returns naive timestamps in the query's timezone (GMT here); treat as UTC.
    const diff = Math.abs(new Date(`${hourlyTimes[i]}Z`).getTime() - targetMs);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestIndex = i;
    }
  }
  return closestIndex >= 0 ? hourlyPressures[closestIndex] : null;
}

function getPressureTrend(currentPressure: number, currentTimeMs: number, hourlyTimes: string[], hourlyPressures: number[]): PressureTrend {
  const pastPressure = findClosestPressure(hourlyTimes, hourlyPressures, currentTimeMs - PRESSURE_TREND_WINDOW_HOURS * 3_600_000);
  if (pastPressure === null) return "steady";
  const delta = currentPressure - pastPressure;
  if (delta >= PRESSURE_TREND_THRESHOLD_HPA) return "rising";
  if (delta <= -PRESSURE_TREND_THRESHOLD_HPA) return "falling";
  return "steady";
}

// `daily` covers both yesterday and today (since `past_days=1`), so find
// today's entry by date rather than assuming an index - matched against the
// current reading's own date rather than the server's clock, since that's
// the date Open-Meteo itself considers "today" for this response.
function findTodayIndex(dailyDates: string[], currentTimeIso: string): number {
  const todayDate = currentTimeIso.slice(0, 10);
  const index = dailyDates.indexOf(todayDate);
  return index >= 0 ? index : dailyDates.length - 1;
}

export async function GET(request: NextRequest) {
  const latitude = request.nextUrl.searchParams.get("latitude");
  const longitude = request.nextUrl.searchParams.get("longitude");

  if (!latitude || !longitude) {
    return NextResponse.json({ error: "latitude and longitude query params are required" }, { status: 400 });
  }

  const url = new URL(OPEN_METEO_URL);
  url.searchParams.set("latitude", latitude);
  url.searchParams.set("longitude", longitude);
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,surface_pressure,weather_code,wind_speed_10m,wind_direction_10m,uv_index",
  );
  url.searchParams.set("hourly", "surface_pressure");
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min");
  url.searchParams.set("past_days", "1");
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set("temperature_unit", "fahrenheit");

  const upstream = await fetch(url, { next: { revalidate: 600 } });
  if (!upstream.ok) {
    return NextResponse.json({ error: "Failed to fetch weather data" }, { status: 502 });
  }

  const data = await upstream.json();
  const current = data.current;
  const todayIndex = findTodayIndex(data.daily.time, current.time);

  const result: WeatherResponse = {
    temperatureF: current.temperature_2m,
    temperatureHighF: data.daily.temperature_2m_max[todayIndex],
    temperatureLowF: data.daily.temperature_2m_min[todayIndex],
    humidityPercent: current.relative_humidity_2m,
    pressureHpa: current.surface_pressure,
    pressureTrend: getPressureTrend(
      current.surface_pressure,
      new Date(`${current.time}Z`).getTime(),
      data.hourly.time,
      data.hourly.surface_pressure,
    ),
    weatherCode: current.weather_code,
    windSpeedKmh: current.wind_speed_10m,
    windDirectionDeg: current.wind_direction_10m,
    uvIndex: current.uv_index,
    observedAt: current.time,
  };

  return NextResponse.json(result);
}
