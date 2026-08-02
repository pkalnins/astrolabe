import { NextResponse } from "next/server";

export interface SpaceWeatherResponse {
  solarWindSpeedKmS: number | null;
  magFieldBt: number | null;
  magFieldBz: number | null;
  kpIndex: number | null;
  estimatedKp: number | null;
  recentFlareClass: string | null;
  recentFlareTime: string | null;
  observedAt: string;
}

// NOAA SWPC: free, no API key required.
const SOLAR_WIND_SPEED_URL = "https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json";
const SOLAR_WIND_MAG_URL = "https://services.swpc.noaa.gov/products/summary/solar-wind-mag-field.json";
const KP_INDEX_URL = "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json";
const XRAY_FLARES_URL = "https://services.swpc.noaa.gov/json/goes/primary/xray-flares-7-day.json";

async function fetchJson(url: string) {
  const response = await fetch(url, { next: { revalidate: 600 } });
  if (!response.ok) return null;
  return response.json();
}

export async function GET() {
  const [windSpeed, windMag, kpSeries, flares] = await Promise.all([
    fetchJson(SOLAR_WIND_SPEED_URL),
    fetchJson(SOLAR_WIND_MAG_URL),
    fetchJson(KP_INDEX_URL),
    fetchJson(XRAY_FLARES_URL),
  ]);

  const latestKp = Array.isArray(kpSeries) ? kpSeries[kpSeries.length - 1] : null;
  const latestFlare = Array.isArray(flares) ? flares[flares.length - 1] : null;

  const result: SpaceWeatherResponse = {
    solarWindSpeedKmS: windSpeed?.[0]?.proton_speed ?? null,
    magFieldBt: windMag?.[0]?.bt ?? null,
    magFieldBz: windMag?.[0]?.bz_gsm ?? null,
    kpIndex: latestKp?.kp_index ?? null,
    estimatedKp: latestKp?.estimated_kp ?? null,
    recentFlareClass: latestFlare?.max_class ?? null,
    recentFlareTime: latestFlare?.max_time ?? null,
    observedAt: new Date().toISOString(),
  };

  return NextResponse.json(result);
}
