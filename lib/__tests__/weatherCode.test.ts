import { describe, expect, it } from "vitest";
import { describeWeatherCode } from "../weatherCode";

describe("describeWeatherCode", () => {
  it("maps representative WMO codes to a label and icon", () => {
    expect(describeWeatherCode(0)).toEqual({ label: "Clear Sky", icon: "☀️" });
    expect(describeWeatherCode(2)).toEqual({ label: "Partly Cloudy", icon: "⛅" });
    expect(describeWeatherCode(3)).toEqual({ label: "Overcast", icon: "☁️" });
    expect(describeWeatherCode(63)).toEqual({ label: "Rain", icon: "🌧️" });
    expect(describeWeatherCode(75)).toEqual({ label: "Heavy Snow", icon: "❄️" });
    expect(describeWeatherCode(95)).toEqual({ label: "Thunderstorm", icon: "⛈️" });
  });

  it("covers every documented WMO code with no gaps", () => {
    const documentedCodes = [0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99];
    for (const code of documentedCodes) {
      expect(describeWeatherCode(code).label).not.toBe("Unknown");
    }
  });

  it("falls back gracefully for an undocumented code", () => {
    expect(describeWeatherCode(-1).label).toBe("Unknown");
  });
});
