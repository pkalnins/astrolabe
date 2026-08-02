import type { MetricDescription } from "./severity";

/** WHO/EPA UV Index scale. */
export function describeUvIndex(uvIndex: number): MetricDescription {
  if (uvIndex < 3) return { label: "Low", severity: "calm" };
  if (uvIndex < 6) return { label: "Moderate", severity: "moderate" };
  if (uvIndex < 8) return { label: "High", severity: "elevated" };
  if (uvIndex < 11) return { label: "Very High", severity: "severe" };
  return { label: "Extreme", severity: "severe" };
}
