import type { MetricDescription } from "./severity";

/** EPA US AQI categories (0-500 scale). */
export function describeAqi(aqi: number): MetricDescription {
  if (aqi <= 50) return { label: "Good", severity: "calm" };
  if (aqi <= 100) return { label: "Moderate", severity: "moderate" };
  if (aqi <= 150) return { label: "Unhealthy", severity: "elevated" };
  if (aqi <= 200) return { label: "Unhealthy", severity: "severe" };
  if (aqi <= 300) return { label: "Very Unhealthy", severity: "severe" };
  return { label: "Hazardous", severity: "severe" };
}
