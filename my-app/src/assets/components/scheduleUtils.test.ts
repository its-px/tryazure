import { describe, expect, it } from "vitest";
import { rangesOverlap, validateDay, validateTimeOff } from "./scheduleUtils";

describe("validateDay", () => {
  const base = { start_time: "09:00", end_time: "17:00" };
  it("accepts plain hours and a break inside them", () => {
    expect(validateDay(base)).toBeNull();
    expect(validateDay({ ...base, break_start: "13:00", break_end: "14:00" })).toBeNull();
  });
  it("rejects inverted hours", () => {
    expect(validateDay({ start_time: "17:00", end_time: "09:00" })).toBe("err_hours");
  });
  it("rejects half, inverted or out-of-range breaks", () => {
    expect(validateDay({ ...base, break_start: "13:00" })).toBe("err_break");
    expect(validateDay({ ...base, break_start: "14:00", break_end: "13:00" })).toBe("err_break");
    expect(validateDay({ ...base, break_start: "08:00", break_end: "09:30" })).toBe("err_break_outside");
  });
});

describe("validateTimeOff / rangesOverlap", () => {
  it("requires start before end", () => {
    expect(validateTimeOff("2026-10-14T09:00", "2026-10-14T12:00")).toBeNull();
    expect(validateTimeOff("2026-10-14T12:00", "2026-10-14T12:00")).toBe("err_range");
    expect(validateTimeOff("", "2026-10-14T12:00")).toBe("err_range");
  });
  it("treats touching ranges as non-overlapping", () => {
    expect(rangesOverlap("09:00", "10:00", "10:00", "11:00")).toBe(false);
    expect(rangesOverlap("09:00", "10:30", "10:00", "11:00")).toBe(true);
  });
});
