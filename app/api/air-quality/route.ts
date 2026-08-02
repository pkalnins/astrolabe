import { NextRequest, NextResponse } from "next/server";

export interface AirQualityResponse {
  usAqi: number;
  pm2_5: number;
  pm10: number;
  observedAt: string;
}

// Open-Meteo Air Quality: free, no API key required.
const AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

export async function GET(request: NextRequest) {
  const latitude = request.nextUrl.searchParams.get("latitude");
  const longitude = request.nextUrl.searchParams.get("longitude");

  if (!latitude || !longitude) {
    return NextResponse.json({ error: "latitude and longitude query params are required" }, { status: 400 });
  }

  const url = new URL(AIR_QUALITY_URL);
  url.searchParams.set("latitude", latitude);
  url.searchParams.set("longitude", longitude);
  url.searchParams.set("current", "us_aqi,pm2_5,pm10");

  const upstream = await fetch(url, { next: { revalidate: 600 } });
  if (!upstream.ok) {
    return NextResponse.json({ error: "Failed to fetch air quality data" }, { status: 502 });
  }

  const data = await upstream.json();
  const current = data.current;

  const result: AirQualityResponse = {
    usAqi: current.us_aqi,
    pm2_5: current.pm2_5,
    pm10: current.pm10,
    observedAt: current.time,
  };

  return NextResponse.json(result);
}
