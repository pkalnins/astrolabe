// Shared calm -> moderate -> elevated -> severe color language, used across
// space weather, UV index, and air quality so the dashboard's color meaning
// stays consistent regardless of which metric you're looking at.

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
