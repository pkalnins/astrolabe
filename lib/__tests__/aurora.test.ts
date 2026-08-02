import { describe, expect, it } from "vitest";
import { describeAuroraChance } from "../aurora";

describe("describeAuroraChance", () => {
  it("buckets probability with increasing severity", () => {
    expect(describeAuroraChance(2)).toEqual({ label: "Low", severity: "calm" });
    expect(describeAuroraChance(15)).toEqual({ label: "Slight chance", severity: "moderate" });
    expect(describeAuroraChance(45)).toEqual({ label: "Elevated chance", severity: "elevated" });
    expect(describeAuroraChance(75)).toEqual({ label: "High chance", severity: "severe" });
  });
});
