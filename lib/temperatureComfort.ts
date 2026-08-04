/**
 * Temperature color banding (Fahrenheit) - warm end reuses the shared
 * calm/elevated/severe severity colors (see severity.ts) since "comfortable
 * -> hot" maps naturally onto that language, but the cold end needs shades
 * the shared 4-color severity palette doesn't have, so it isn't sourced
 * from there.
 */
export function temperatureColor(tempF: number): string {
  if (tempF < 35) return "#1d4ed8"; // dark blue
  if (tempF < 50) return "#3b82f6"; // medium blue
  if (tempF < 65) return "#7dd3fc"; // light blue
  if (tempF < 80) return "#4ade80"; // green
  if (tempF < 95) return "#fb923c"; // orange
  return "#f87171"; // red
}
