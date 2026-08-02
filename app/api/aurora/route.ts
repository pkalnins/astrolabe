import { NextRequest, NextResponse } from "next/server";

export interface AuroraResponse {
  probabilityPercent: number;
  observationTime: string;
}

// NOAA SWPC OVATION aurora model: free, no API key required. A 1-degree
// lat/lon grid of aurora probability (%); longitude is [0, 360), not [-180, 180).
const OVATION_URL = "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json";

function findNearestProbability(coordinates: [number, number, number][], latitude: number, longitude: number): number | null {
  const targetLon = ((longitude % 360) + 360) % 360;
  let closestProbability: number | null = null;
  let closestDistance = Infinity;

  for (const [lon, lat, probability] of coordinates) {
    let lonDiff = Math.abs(lon - targetLon);
    if (lonDiff > 180) lonDiff = 360 - lonDiff;
    const latDiff = Math.abs(lat - latitude);
    const distance = lonDiff * lonDiff + latDiff * latDiff;
    if (distance < closestDistance) {
      closestDistance = distance;
      closestProbability = probability;
    }
  }

  return closestProbability;
}

export async function GET(request: NextRequest) {
  const latitude = request.nextUrl.searchParams.get("latitude");
  const longitude = request.nextUrl.searchParams.get("longitude");

  if (!latitude || !longitude) {
    return NextResponse.json({ error: "latitude and longitude query params are required" }, { status: 400 });
  }

  const upstream = await fetch(OVATION_URL, { next: { revalidate: 600 } });
  if (!upstream.ok) {
    return NextResponse.json({ error: "Failed to fetch aurora data" }, { status: 502 });
  }

  const data = await upstream.json();
  const probabilityPercent = findNearestProbability(data.coordinates, parseFloat(latitude), parseFloat(longitude));

  if (probabilityPercent === null) {
    return NextResponse.json({ error: "No aurora data available" }, { status: 502 });
  }

  const result: AuroraResponse = {
    probabilityPercent,
    observationTime: data["Observation Time"],
  };
  return NextResponse.json(result);
}
