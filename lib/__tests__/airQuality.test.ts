import { describe, expect, it } from "vitest";
import { describeAqi } from "../airQuality";

describe("describeAqi", () => {
  it("maps the EPA US AQI categories with increasing severity", () => {
    expect(describeAqi(25)).toEqual({ label: "Good", severity: "calm" });
    expect(describeAqi(75)).toEqual({ label: "Moderate", severity: "moderate" });
    expect(describeAqi(125)).toEqual({ label: "Unhealthy (sensitive groups)", severity: "elevated" });
    expect(describeAqi(175)).toEqual({ label: "Unhealthy", severity: "severe" });
    expect(describeAqi(250)).toEqual({ label: "Very Unhealthy", severity: "severe" });
    expect(describeAqi(350)).toEqual({ label: "Hazardous", severity: "severe" });
  });
});
