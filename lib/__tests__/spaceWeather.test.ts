import { describe, expect, it } from "vitest";
import { describeKp, describeSolarWindSpeed, describeBz, describeFlareClass } from "../spaceWeather";

describe("describeKp", () => {
  it("maps each integer 0-9 to NOAA's descriptive level and severity", () => {
    expect(describeKp(0)).toEqual({ label: "Quiet", severity: "calm" });
    expect(describeKp(1)).toEqual({ label: "Quiet", severity: "calm" });
    expect(describeKp(2)).toEqual({ label: "Unsettled", severity: "calm" });
    expect(describeKp(3)).toEqual({ label: "Unsettled", severity: "calm" });
    expect(describeKp(4)).toEqual({ label: "Active", severity: "moderate" });
    expect(describeKp(5)).toEqual({ label: "Minor storm (G1)", severity: "elevated" });
    expect(describeKp(6)).toEqual({ label: "Moderate storm (G2)", severity: "elevated" });
    expect(describeKp(7)).toEqual({ label: "Strong storm (G3)", severity: "severe" });
    expect(describeKp(8)).toEqual({ label: "Severe storm (G4)", severity: "severe" });
    expect(describeKp(9)).toEqual({ label: "Extreme storm (G5)", severity: "severe" });
  });
});

describe("describeSolarWindSpeed", () => {
  it("buckets typical, elevated, and fast speeds with increasing severity", () => {
    expect(describeSolarWindSpeed(300)).toEqual({ label: "Typical", severity: "calm" });
    expect(describeSolarWindSpeed(450)).toEqual({ label: "Elevated", severity: "moderate" });
    expect(describeSolarWindSpeed(650)).toEqual({ label: "Fast", severity: "elevated" });
    expect(describeSolarWindSpeed(800)).toEqual({ label: "Very fast", severity: "severe" });
  });
});

describe("describeBz", () => {
  it("treats any northward value as quiet regardless of magnitude", () => {
    expect(describeBz(0)).toEqual({ label: "N (quiet)", severity: "calm" });
    expect(describeBz(15)).toEqual({ label: "N (quiet)", severity: "calm" });
  });

  it("tiers southward values by increasing severity", () => {
    expect(describeBz(-2)).toEqual({ label: "S (mild)", severity: "moderate" });
    expect(describeBz(-7)).toEqual({ label: "S (active)", severity: "elevated" });
    expect(describeBz(-12)).toEqual({ label: "S (strong)", severity: "severe" });
  });
});

describe("describeFlareClass", () => {
  it("maps each flare letter to a plain-language rarity and severity", () => {
    expect(describeFlareClass("B2.1")).toEqual({ label: "Very quiet", severity: "calm" });
    expect(describeFlareClass("C6.3")).toEqual({ label: "Common", severity: "moderate" });
    expect(describeFlareClass("M1.4")).toEqual({ label: "Moderate", severity: "elevated" });
    expect(describeFlareClass("X2.0")).toEqual({ label: "Major", severity: "severe" });
  });
});
