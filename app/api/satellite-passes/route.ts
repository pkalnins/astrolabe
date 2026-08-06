import { NextRequest, NextResponse } from "next/server";
import * as satellite from "satellite.js";
import * as Astronomy from "astronomy-engine";

export interface SatellitePassResponse {
  satelliteName: string;
  pass: {
    riseTime: string;
    setTime: string;
    maxElevationTime: string;
    maxElevationDeg: number;
    riseAzimuthDeg: number;
    setAzimuthDeg: number;
  } | null;
}

// ISS (ZARYA), NORAD catalog number 25544. Celestrak: free, no API key.
const ISS_NORAD_ID = 25544;
const TLE_URL = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${ISS_NORAD_ID}&FORMAT=TLE`;
const SATELLITE_NAME = "ISS";

// A "visible pass" needs the satellite above this elevation, sunlit, and the
// observer's sky dark enough to see it against - the same three conditions
// sites like Heavens-Above use for ISS pass predictions.
const MIN_ELEVATION_DEG = 10;
const MAX_OBSERVER_SUN_ELEVATION_DEG = -6; // civil twilight or darker
const SEARCH_DAYS = 10;
const STEP_MS = 60 * 1000;

function isObserverDark(date: Date, latitude: number, longitude: number, elevationM: number): boolean {
  const observer = new Astronomy.Observer(latitude, longitude, elevationM);
  const equator = Astronomy.Equator(Astronomy.Body.Sun, date, observer, true, true);
  const altitude = Astronomy.Horizon(date, observer, equator.ra, equator.dec, "normal").altitude;
  return altitude <= MAX_OBSERVER_SUN_ELEVATION_DEG;
}

function isSatelliteSunlit(date: Date, eciKm: satellite.EciVec3<satellite.Kilometer>): boolean {
  const { rsun } = satellite.sunPos(satellite.jday(date));
  return satellite.shadowFraction(rsun, eciKm) < 1;
}

function findNextVisiblePass(
  satrec: satellite.SatRec,
  start: Date,
  latitude: number,
  longitude: number,
  elevationM: number,
): SatellitePassResponse["pass"] {
  const observerGd: satellite.GeodeticLocation = {
    latitude: satellite.degreesToRadians(latitude),
    longitude: satellite.degreesToRadians(longitude),
    height: elevationM / 1000,
  };

  let inPass = false;
  let riseTime: Date | null = null;
  let riseAzimuthDeg = 0;
  let maxElevationDeg = -90;
  let maxElevationTime: Date | null = null;

  const end = new Date(start.getTime() + SEARCH_DAYS * 24 * 60 * 60 * 1000);
  for (let t = start.getTime(); t <= end.getTime(); t += STEP_MS) {
    const date = new Date(t);
    const result = satellite.propagate(satrec, date);
    const eci = result?.position;
    if (!eci) continue;

    const gmst = satellite.gstime(date);
    const ecf = satellite.eciToEcf(eci, gmst);
    const lookAngles = satellite.ecfToLookAngles(observerGd, ecf);
    const elevationDeg = satellite.radiansToDegrees(lookAngles.elevation);
    const azimuthDeg = satellite.radiansToDegrees(lookAngles.azimuth);

    const visible = elevationDeg >= MIN_ELEVATION_DEG && isSatelliteSunlit(date, eci) && isObserverDark(date, latitude, longitude, elevationM);

    if (visible) {
      if (!inPass) {
        inPass = true;
        riseTime = date;
        riseAzimuthDeg = azimuthDeg;
        maxElevationDeg = elevationDeg;
        maxElevationTime = date;
      } else if (elevationDeg > maxElevationDeg) {
        maxElevationDeg = elevationDeg;
        maxElevationTime = date;
      }
    } else if (inPass) {
      return {
        riseTime: riseTime!.toISOString(),
        setTime: date.toISOString(),
        maxElevationTime: maxElevationTime!.toISOString(),
        maxElevationDeg,
        riseAzimuthDeg,
        setAzimuthDeg: azimuthDeg,
      };
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  const latitude = request.nextUrl.searchParams.get("latitude");
  const longitude = request.nextUrl.searchParams.get("longitude");
  const elevation = request.nextUrl.searchParams.get("elevation");

  if (!latitude || !longitude) {
    return NextResponse.json({ error: "latitude and longitude query params are required" }, { status: 400 });
  }

  const tleResponse = await fetch(TLE_URL, { next: { revalidate: 6 * 60 * 60 } });
  if (!tleResponse.ok) {
    return NextResponse.json({ error: "Failed to fetch satellite orbital data" }, { status: 502 });
  }
  const tleText = await tleResponse.text();
  const lines = tleText
    .trim()
    .split("\n")
    .map((line) => line.trim());
  const line1 = lines.find((line) => line.startsWith("1 "));
  const line2 = lines.find((line) => line.startsWith("2 "));
  if (!line1 || !line2) {
    return NextResponse.json({ error: "Could not parse satellite orbital data" }, { status: 502 });
  }

  const satrec = satellite.twoline2satrec(line1, line2);
  const pass = findNextVisiblePass(satrec, new Date(), parseFloat(latitude), parseFloat(longitude), elevation ? parseFloat(elevation) : 0);

  const result: SatellitePassResponse = { satelliteName: SATELLITE_NAME, pass };
  return NextResponse.json(result);
}
