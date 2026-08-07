import { NextRequest, NextResponse } from "next/server";

export interface GeocodeResult {
  id: number;
  /** Display label for a search-result list, e.g. "Portland, Oregon, United States". */
  label: string;
  latitude: number;
  longitude: number;
  /** IANA zone (e.g. "America/Los_Angeles") - needed to resolve a birth time's UTC instant. */
  timezone: string;
}

export interface GeocodeResponse {
  results: GeocodeResult[];
}

// Open-Meteo: free, no API key required - same provider family already used
// for weather/air-quality elsewhere in this app. Its geocoding endpoint is
// the one place that hands back an IANA timezone alongside coordinates,
// which forward-geocoding-only alternatives (e.g. plain Nominatim) don't.
const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";

interface OpenMeteoGeocodeResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  admin1?: string;
  country?: string;
}

function buildLabel(result: OpenMeteoGeocodeResult): string {
  return [result.name, result.admin1, result.country].filter(Boolean).join(", ");
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ error: "q query param is required" }, { status: 400 });
  }

  const url = new URL(GEOCODE_URL);
  url.searchParams.set("name", query);
  url.searchParams.set("count", "8");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const upstream = await fetch(url, { next: { revalidate: 86_400 } });
  if (!upstream.ok) {
    return NextResponse.json({ error: "Failed to geocode" }, { status: 502 });
  }

  const data = await upstream.json();
  const results: OpenMeteoGeocodeResult[] = data.results ?? [];
  const response: GeocodeResponse = {
    results: results.map((result) => ({
      id: result.id,
      label: buildLabel(result),
      latitude: result.latitude,
      longitude: result.longitude,
      timezone: result.timezone,
    })),
  };

  return NextResponse.json(response);
}
