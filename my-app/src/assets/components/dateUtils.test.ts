import { describe, it, expect } from "vitest";
import { generateWeekdaysInRange, excludeDates } from "./dateUtils";

describe("generateWeekdaysInRange", () => {
  it("defaults to Mon-Fri and is inclusive of both ends", () => {
    // 2024-01-01 is a Monday, 2024-01-07 a Sunday
    const dates = generateWeekdaysInRange("2024-01-01", "2024-01-07");
    expect(dates).toEqual([
      "2024-01-01",
      "2024-01-02",
      "2024-01-03",
      "2024-01-04",
      "2024-01-05",
    ]);
  });

  it("respects a custom weekday set (weekends only)", () => {
    const dates = generateWeekdaysInRange("2024-01-01", "2024-01-07", [0, 6]);
    expect(dates).toEqual(["2024-01-06", "2024-01-07"]);
  });

  it("returns a single day when start === end and it matches", () => {
    expect(generateWeekdaysInRange("2024-01-01", "2024-01-01")).toEqual([
      "2024-01-01",
    ]);
  });

  it("returns empty when the single day does not match the weekday set", () => {
    // Sunday, default set is Mon-Fri
    expect(generateWeekdaysInRange("2024-01-07", "2024-01-07")).toEqual([]);
  });

  it("returns empty when end is before start", () => {
    expect(generateWeekdaysInRange("2024-01-07", "2024-01-01")).toEqual([]);
  });
});

describe("excludeDates", () => {
  it("removes listed exceptions", () => {
    const dates = ["2024-01-01", "2024-01-02", "2024-01-03"];
    expect(excludeDates(dates, ["2024-01-02"])).toEqual([
      "2024-01-01",
      "2024-01-03",
    ]);
  });

  it("returns the input unchanged when no exceptions match", () => {
    const dates = ["2024-01-01", "2024-01-02"];
    expect(excludeDates(dates, ["2099-12-31"])).toEqual(dates);
  });

  it("returns empty when all dates are excluded", () => {
    const dates = ["2024-01-01", "2024-01-02"];
    expect(excludeDates(dates, dates)).toEqual([]);
  });
});
