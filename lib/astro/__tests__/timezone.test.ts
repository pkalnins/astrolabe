import { describe, expect, it } from "vitest";
import { zonedTimeToUtc } from "../timezone";

describe("zonedTimeToUtc", () => {
  it("converts a standard-time wall clock to UTC", () => {
    // Jan 15 2024, 3:42pm in Los Angeles is standard time (UTC-8).
    const result = zonedTimeToUtc(2024, 1, 15, 15, 42, "America/Los_Angeles");
    expect(result.toISOString()).toBe("2024-01-15T23:42:00.000Z");
  });

  it("converts a daylight-time wall clock to UTC", () => {
    // Jul 15 2024, 3:42pm in Los Angeles is daylight time (UTC-7).
    const result = zonedTimeToUtc(2024, 7, 15, 15, 42, "America/Los_Angeles");
    expect(result.toISOString()).toBe("2024-07-15T22:42:00.000Z");
  });

  it("handles a fractional UTC offset zone", () => {
    // India Standard Time is UTC+5:30, no DST.
    const result = zonedTimeToUtc(1990, 8, 15, 3, 42, "Asia/Kolkata");
    expect(result.toISOString()).toBe("1990-08-14T22:12:00.000Z");
  });

  it("resolves a wall time shortly after a spring-forward gap", () => {
    // US spring-forward 2024: 2:00am -> 3:00am on Mar 10. 3:30am only exists
    // as daylight time (UTC-7).
    const result = zonedTimeToUtc(2024, 3, 10, 3, 30, "America/Los_Angeles");
    expect(result.toISOString()).toBe("2024-03-10T10:30:00.000Z");
  });

  it("resolves a wall time during a fall-back repeated hour", () => {
    // US fall-back 2024: clocks repeat 1:00am-2:00am on Nov 3. Whichever
    // occurrence this resolves to, round-tripping should be self-consistent.
    const result = zonedTimeToUtc(2024, 11, 3, 1, 30, "America/Los_Angeles");
    const asHour = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      hourCycle: "h23",
      hour: "2-digit",
      minute: "2-digit",
    }).format(result);
    expect(asHour).toBe("01:30");
  });
});
