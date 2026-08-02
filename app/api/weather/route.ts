import { NextRequest, NextResponse } from "next/server";

export interface WeatherResponse {
  temperatureF: number;
  humidityPercent: number;
  pressureHpa: number;
  weatherCode: number;
  windSpeedKmh: number;
  observedAt: string;
}

// Open-Meteo: free, no API key required.
const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

export async function GET(request: NextRequest) {
  const latitude = request.nextUrl.searchParams.get("latitude");
  const longitude = request.nextUrl.searchParams.get("longitude");

  if (!latitude || !longitude) {
    return NextResponse.json({ error: "latitude and longitude query params are required" }, { status: 400 });
  }

  const url = new URL(OPEN_METEO_URL);
  url.searchParams.set("latitude", latitude);
  url.searchParams.set("longitude", longitude);
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,surface_pressure,weather_code,wind_speed_10m");
  url.searchParams.set("temperature_unit", "fahrenheit");

  const upstream = await fetch(url, { next: { revalidate: 600 } });
  if (!upstream.ok) {
    return NextResponse.json({ error: "Failed to fetch weather data" }, { status: 502 });
  }

  const data = await upstream.json();
  const current = data.current;

  const result: WeatherResponse = {
    temperatureF: current.temperature_2m,
    humidityPercent: current.relative_humidity_2m,
    pressureHpa: current.surface_pressure,
    weatherCode: current.weather_code,
    windSpeedKmh: current.wind_speed_10m,
    observedAt: current.time,
  };

  return NextResponse.json(result);
}
