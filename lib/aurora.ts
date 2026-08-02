import type { MetricDescription } from "./severity";

/**
 * Generic qualitative bucketing of NOAA's OVATION aurora probability (%).
 * There's no single official "this percentage means X" convention like there
 * is for Kp/AQI/UV, so treat this as a directional read (higher = more
 * likely), not a precisely calibrated forecast.
 */
export function describeAuroraChance(probabilityPercent: number): MetricDescription {
  if (probabilityPercent < 10) return { label: "Low", severity: "calm" };
  if (probabilityPercent < 30) return { label: "Slight chance", severity: "moderate" };
  if (probabilityPercent < 60) return { label: "Elevated chance", severity: "elevated" };
  return { label: "High chance", severity: "severe" };
}
