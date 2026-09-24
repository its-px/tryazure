import { describe, expect, it } from "vitest";
import { openingHours } from "./TenantHead";

describe("openingHours", () => {
  it("maps InfoPage hours to schema.org and skips closed/garbage days", () => {
    expect(
      openingHours([
        { day: "Monday", hours: "Closed" },
        { day: "Tuesday", hours: "10:00 - 20:00" },
        { day: "Saturday", hours: "9:00–18:00" },
        { day: "Funday", hours: "10:00 - 11:00" },
      ]),
    ).toEqual(["Tu 10:00-20:00", "Sa 9:00-18:00"]);
    expect(openingHours(undefined)).toEqual([]);
  });
});
