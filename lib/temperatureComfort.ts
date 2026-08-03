import type { MetricDescription } from "./severity";

/**
 * General outdoor-comfort banding (Fahrenheit). Unlike UV/AQI, severity here
 * increases toward *either* extreme rather than in one direction - calm sits
 * in the comfortable middle, not at the bottom of the scale.
 */
export function describeTemperatureComfort(tempF: number): MetricDescription {
  if (tempF < 20) return { label: "Frigid", severity: "severe" };
  if (tempF < 40) return { label: "Cold", severity: "elevated" };
  if (tempF < 55) return { label: "Cool", severity: "moderate" };
  if (tempF <= 80) return { label: "Comfortable", severity: "calm" };
  if (tempF <= 90) return { label: "Warm", severity: "moderate" };
  if (tempF <= 100) return { label: "Hot", severity: "elevated" };
  return { label: "Extreme heat", severity: "severe" };
}
