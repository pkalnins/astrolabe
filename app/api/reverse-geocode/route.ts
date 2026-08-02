import { NextRequest, NextResponse } from "next/server";

export interface ReverseGeocodeResponse {
  label: string | null;
}

// BigDataCloud: free, no API key required for client-oriented reverse geocoding.
const REVERSE_GEOCODE_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client";

function buildLabel(data: {
  city?: string;
  locality?: string;
  countryCode?: string;
  countryName?: string;
  principalSubdivisionCode?: string;
}): string | null {
  const city = data.city || data.locality;
  if (!city) return null;

  if (data.countryCode === "US" && data.principalSubdivisionCode) {
    const stateAbbreviation = data.principalSubdivisionCode.split("-").pop();
    return stateAbbreviation ? `${city}, ${stateAbbreviation}` : city;
  }
  if (data.countryName) return `${city}, ${data.countryName}`;
  return city;
}

export async function GET(request: NextRequest) {
  const latitude = request.nextUrl.searchParams.get("latitude");
  const longitude = request.nextUrl.searchParams.get("longitude");

  if (!latitude || !longitude) {
    return NextResponse.json({ error: "latitude and longitude query params are required" }, { status: 400 });
  }

  const url = new URL(REVERSE_GEOCODE_URL);
  url.searchParams.set("latitude", latitude);
  url.searchParams.set("longitude", longitude);
  url.searchParams.set("localityLanguage", "en");

  const upstream = await fetch(url, { next: { revalidate: 86_400 } });
  if (!upstream.ok) {
    return NextResponse.json({ error: "Failed to reverse geocode" }, { status: 502 });
  }

  const data = await upstream.json();
  const result: ReverseGeocodeResponse = { label: buildLabel(data) };
  return NextResponse.json(result);
}
