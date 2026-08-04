import { describe, expect, it } from "vitest";
import { describeAqi } from "../airQuality";

describe("describeAqi", () => {
  it("maps the EPA US AQI categories with increasing severity", () => {
    expect(describeAqi(25)).toEqual({ label: "Good", severity: "calm" });
    expect(describeAqi(75)).toEqual({ label: "Moderate", severity: "moderate" });
    // 101-150 and 151-200 both read "Unhealthy" - kept short so the label
    // fits on one line in the dashboard card; severity color (elevated vs.
    // severe) is what distinguishes them, not the text.
    expect(describeAqi(125)).toEqual({ label: "Unhealthy", severity: "elevated" });
    expect(describeAqi(175)).toEqual({ label: "Unhealthy", severity: "severe" });
    expect(describeAqi(250)).toEqual({ label: "Very Unhealthy", severity: "severe" });
    expect(describeAqi(350)).toEqual({ label: "Hazardous", severity: "severe" });
  });
});
