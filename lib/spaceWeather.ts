// Plain-language qualifiers (and a severity level for color-coding) for NOAA
// SWPC space weather metrics, using their published threshold conventions.

export type SeverityLevel = "calm" | "moderate" | "elevated" | "severe";

export const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  calm: "#4ade80",
  moderate: "#facc15",
  elevated: "#fb923c",
  severe: "#f87171",
};

export interface MetricDescription {
  label: string;
  severity: SeverityLevel;
}

/** Kp index (0-9) -> NOAA's descriptive geomagnetic activity level, including the G-scale for storms. */
export function describeKp(kp: number): MetricDescription {
  if (kp <= 1) return { label: "Quiet", severity: "calm" };
  if (kp <= 3) return { label: "Unsettled", severity: "calm" };
  if (kp === 4) return { label: "Active", severity: "moderate" };
  if (kp === 5) return { label: "Minor storm (G1)", severity: "elevated" };
  if (kp === 6) return { label: "Moderate storm (G2)", severity: "elevated" };
  if (kp === 7) return { label: "Strong storm (G3)", severity: "severe" };
  if (kp === 8) return { label: "Severe storm (G4)", severity: "severe" };
  return { label: "Extreme storm (G5)", severity: "severe" };
}

/** Solar wind speed (km/s) -> rough qualitative bucket. Typical quiet-sun speed is ~300-500 km/s. */
export function describeSolarWindSpeed(speedKmS: number): MetricDescription {
  if (speedKmS < 400) return { label: "Typical", severity: "calm" };
  if (speedKmS < 600) return { label: "Elevated", severity: "moderate" };
  if (speedKmS < 750) return { label: "Fast", severity: "elevated" };
  return { label: "Very fast", severity: "severe" };
}

/**
 * IMF Bz (nT) -> direction + rough intensity. The sign matters more than the
 * magnitude: northward (positive) doesn't couple with Earth's field and stays
 * quiet regardless of size; southward (negative) does, and geomagnetic
 * activity increases the more negative it gets.
 */
export function describeBz(bz: number): MetricDescription {
  if (bz >= 0) return { label: "Northward (quiet)", severity: "calm" };
  if (bz >= -5) return { label: "Southward (mild)", severity: "moderate" };
  if (bz >= -10) return { label: "Southward (active)", severity: "elevated" };
  return { label: "Southward (strong)", severity: "severe" };
}

/** X-ray flare class letter (A < B < C < M < X, each 10x the previous) -> plain-language rarity/impact. */
export function describeFlareClass(flareClass: string): MetricDescription {
  switch (flareClass.trim().charAt(0).toUpperCase()) {
    case "A":
    case "B":
      return { label: "Very quiet", severity: "calm" };
    case "C":
      return { label: "Common", severity: "moderate" };
    case "M":
      return { label: "Moderate", severity: "elevated" };
    case "X":
      return { label: "Major", severity: "severe" };
    default:
      return { label: "", severity: "calm" };
  }
}
