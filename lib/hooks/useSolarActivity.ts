"use client";

import useSWR from "swr";
import type { GeoLocation } from "@/lib/astro/location";
import type { SpaceWeatherResponse } from "@/app/api/space-weather/route";
import type { AuroraResponse } from "@/app/api/aurora/route";

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const REFRESH_MS = 10 * 60 * 1000;

/** Shared by SunCard and the wheel's Sun hover tooltip, so both read the same SWR cache entry rather than issuing independent fetches. */
export function useSolarActivity(location: GeoLocation | null) {
  const { data: spaceWeather } = useSWR<SpaceWeatherResponse>("/api/space-weather", fetcher, { refreshInterval: REFRESH_MS });
  const auroraKey = location ? `/api/aurora?latitude=${location.latitude}&longitude=${location.longitude}` : null;
  const { data: aurora } = useSWR<AuroraResponse>(auroraKey, fetcher, { refreshInterval: REFRESH_MS });
  return { spaceWeather, aurora };
}
