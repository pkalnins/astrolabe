const COMPASS_POINTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export function compassPointFor(azimuth: number): string {
  const normalized = ((azimuth % 360) + 360) % 360;
  return COMPASS_POINTS[Math.round(normalized / 45) % 8];
}

export function formatAzimuth(azimuth: number): string {
  const normalized = ((azimuth % 360) + 360) % 360;
  return `${Math.round(normalized)}° ${compassPointFor(normalized)}`;
}
