import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isDateKey, isIsoInstant, localDayWindow, localInputToIso, shiftDateKey, utcDayWindow } from "@/components/epg/time";

describe("EPG time utilities", () => {
  const originalTimezone = process.env.TZ;
  beforeEach(() => { process.env.TZ = "Europe/Istanbul"; });
  afterEach(() => { process.env.TZ = originalTimezone; });

  it("validates real calendar date keys", () => {
    expect(isDateKey("2026-07-13")).toBe(true);
    expect(isDateKey("2026-02-30")).toBe(false);
    expect(isDateKey("13-07-2026")).toBe(false);
  });

  it("converts a local day to exact UTC boundaries", () => {
    expect(localDayWindow("2026-07-13")).toEqual({ windowStart: "2026-07-12T21:00:00.000Z", windowEnd: "2026-07-13T21:00:00.000Z" });
  });

  it("keeps a UTC fallback window to one calendar day", () => {
    expect(utcDayWindow("2026-07-13")).toEqual({ windowStart: "2026-07-13T00:00:00.000Z", windowEnd: "2026-07-14T00:00:00.000Z" });
  });

  it("serializes datetime-local values with timezone information", () => {
    expect(localInputToIso("2026-07-13T09:30")).toBe("2026-07-13T06:30:00.000Z");
    expect(isIsoInstant(localInputToIso("2026-07-13T09:30"))).toBe(true);
    expect(localInputToIso("not-a-date")).toBe("");
  });

  it("moves date keys across month boundaries", () => {
    expect(shiftDateKey("2026-07-01", -1)).toBe("2026-06-30");
    expect(shiftDateKey("2026-12-31", 1)).toBe("2027-01-01");
  });
});
