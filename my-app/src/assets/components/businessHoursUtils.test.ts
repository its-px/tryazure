import { describe, it, expect } from "vitest";
import { buildOpenWindowsByDay, isBookedWhileClosed } from "./businessHoursUtils";

const hours = [
  { day_of_week: 1, start_time: "09:00:00", end_time: "17:00:00" },
  { day_of_week: 1, start_time: "10:00:00", end_time: "18:00:00" }, // second professional, wider close
];

describe("buildOpenWindowsByDay", () => {
  it("unions overlapping professional windows per day", () => {
    expect(buildOpenWindowsByDay(hours)).toEqual({
      1: { start: "09:00:00", end: "18:00:00" },
    });
  });
});

describe("isBookedWhileClosed", () => {
  const windows = buildOpenWindowsByDay(hours);

  it("is false for a booking created inside the open window (Monday)", () => {
    // 2024-01-01 is a Monday
    expect(isBookedWhileClosed("2024-01-01T12:00:00", windows)).toBe(false);
  });

  it("is true for a booking created before opening", () => {
    expect(isBookedWhileClosed("2024-01-01T07:00:00", windows)).toBe(true);
  });

  it("is true for a booking created after closing", () => {
    expect(isBookedWhileClosed("2024-01-01T19:00:00", windows)).toBe(true);
  });

  it("is true for a day with no hours defined at all", () => {
    // 2024-01-02 is a Tuesday - no entry in `hours`
    expect(isBookedWhileClosed("2024-01-02T12:00:00", windows)).toBe(true);
  });
});
