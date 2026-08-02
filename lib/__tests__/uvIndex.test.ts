import { describe, expect, it } from "vitest";
import { describeUvIndex } from "../uvIndex";

describe("describeUvIndex", () => {
  it("maps the WHO/EPA UV index bands with increasing severity", () => {
    expect(describeUvIndex(1)).toEqual({ label: "Low", severity: "calm" });
    expect(describeUvIndex(4)).toEqual({ label: "Moderate", severity: "moderate" });
    expect(describeUvIndex(7)).toEqual({ label: "High", severity: "elevated" });
    expect(describeUvIndex(9)).toEqual({ label: "Very High", severity: "severe" });
    expect(describeUvIndex(12)).toEqual({ label: "Extreme", severity: "severe" });
  });
});
