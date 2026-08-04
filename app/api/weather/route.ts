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

// Open-Meteo: free, no API key required. Used for the daily high/low
// forecast, and as the current-conditions fallback for locations the NWS
// doesn't cover (it's US-only) or when a station lookup fails.
const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

// NWS/NOAA: free, no API key, but requires an identifying User-Agent per
// https://www.weather.gov/documentation/services-web-api - used for
// temperature/humidity/wind, since it's a real station observation rather
// than a model estimate interpolated to the given coordinates (which can
// diverge noticeably from actual conditions, especially during fast
// afternoon warming).
const NWS_USER_AGENT = "Astrolabe/1.0 (personal weather dashboard, non-commercial)";
const CELSIUS_TO_FAHRENHEIT = (celsius: number) => (celsius * 9) / 5 + 32;

interface NwsCurrentConditions {
  temperatureF: number;
  humidityPercent: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
}

// Three hops: coordinates -> forecast gridpoint (which also links to nearby
// stations) -> station list, ordered nearest-first -> that station's latest
// observation. Station discovery (the first two hops) is cached far longer
// than the observation itself, since the nearest station to a fixed
// lat/long never changes.
async function getNwsCurrentConditions(latitude: string, longitude: string): Promise<NwsCurrentConditions | null> {
  try {
    const headers = { "User-Agent": NWS_USER_AGENT };

    const pointsResponse = await fetch(`https://api.weather.gov/points/${latitude},${longitude}`, {
      headers,
      next: { revalidate: 86400 },
    });
    if (!pointsResponse.ok) return null;
    const points = await pointsResponse.json();
    const stationsUrl = points.properties?.observationStations;
    if (!stationsUrl) return null;

    const stationsResponse = await fetch(stationsUrl, { headers, next: { revalidate: 86400 } });
    if (!stationsResponse.ok) return null;
    const stations = await stationsResponse.json();
    const nearestStationUrl = stations.features?.[0]?.id;
    if (!nearestStationUrl) return null;

    const observationResponse = await fetch(`${nearestStationUrl}/observations/latest`, {
      headers,
      next: { revalidate: 600 },
    });
    if (!observationResponse.ok) return null;
    const observation = await observationResponse.json();
    const props = observation.properties;

    const temperatureC = props?.temperature?.value;
    const humidityPercent = props?.relativeHumidity?.value;
    const windSpeedKmh = props?.windSpeed?.value;
    // Only bail on the fields with no reasonable stand-in; a missing wind
    // direction (common at very low/calm wind speeds, where NWS often omits
    // it) shouldn't throw out an otherwise-good observation.
    if (temperatureC == null || humidityPercent == null || windSpeedKmh == null) return null;

    return {
      temperatureF: CELSIUS_TO_FAHRENHEIT(temperatureC),
      humidityPercent: Math.round(humidityPercent),
      windSpeedKmh,
      windDirectionDeg: props?.windDirection?.value ?? 0,
    };
  } catch {
    return null;
  }
}

// Threshold for calling a change "rising"/"falling" rather than "steady",
// applied over a 3-hour window - a common simplified convention for
// consumer pressure-trend indicators.
const PRESSURE_TREND_THRESHOLD_HPA = 1;
const PRESSURE_TREND_WINDOW_HOURS = 3;

function findClosestPressure(hourlyTimes: string[], hourlyPressures: number[], targetMs: number): number | null {
  let closestIndex = -1;
  let closestDiff = Infinity;
  for (let i = 0; i < hourlyTimes.length; i++) {
    // Open-Meteo returns naive timestamps in the location's local time
    // (`timezone=auto`); treating them as UTC here is a consistent fixed
    // offset from their real value, which cancels out for both this diff and
    // `currentTimeMs`'s own computation below - only their difference matters.
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
    "temperature_2m,relative_humidity_2m,pressure_msl,weather_code,wind_speed_10m,wind_direction_10m,uv_index",
  );
  url.searchParams.set("hourly", "pressure_msl");
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min");
  url.searchParams.set("past_days", "1");
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set("temperature_unit", "fahrenheit");
  // Without this, Open-Meteo buckets `daily`/`hourly` values into GMT calendar
  // days regardless of where the location actually is - so for most of the US,
  // "today"'s high/low would be computed over the wrong 24-hour window (e.g.
  // missing the actual overnight low) and diverge from what a phone weather
  // app reports for the local calendar day.
  url.searchParams.set("timezone", "auto");

  const [upstream, nwsCurrent] = await Promise.all([
    fetch(url, { next: { revalidate: 600 } }),
    getNwsCurrentConditions(latitude, longitude),
  ]);
  if (!upstream.ok) {
    return NextResponse.json({ error: "Failed to fetch weather data" }, { status: 502 });
  }

  const data = await upstream.json();
  const current = data.current;
  const todayIndex = findTodayIndex(data.daily.time, current.time);

  const result: WeatherResponse = {
    temperatureF: nwsCurrent?.temperatureF ?? current.temperature_2m,
    temperatureHighF: data.daily.temperature_2m_max[todayIndex],
    temperatureLowF: data.daily.temperature_2m_min[todayIndex],
    humidityPercent: nwsCurrent?.humidityPercent ?? current.relative_humidity_2m,
    pressureHpa: current.pressure_msl,
    pressureTrend: getPressureTrend(
      current.pressure_msl,
      new Date(`${current.time}Z`).getTime(),
      data.hourly.time,
      data.hourly.pressure_msl,
    ),
    weatherCode: current.weather_code,
    windSpeedKmh: nwsCurrent?.windSpeedKmh ?? current.wind_speed_10m,
    windDirectionDeg: nwsCurrent?.windDirectionDeg ?? current.wind_direction_10m,
    uvIndex: current.uv_index,
    observedAt: current.time,
  };

  return NextResponse.json(result);
}
