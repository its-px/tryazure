import { describe, expect, it } from "vitest";
import { getPolicyHours, getPolicyText, isInsideCancellationWindow } from "./cancellationPolicy";

const now = new Date("2026-10-12T10:00:00");

describe("isInsideCancellationWindow", () => {
  it("is inside when start is closer than the window", () => {
    expect(isInsideCancellationWindow("2026-10-13", "09:00:00", 24, now)).toBe(true);
  });
  it("is outside when start is further than the window", () => {
    expect(isInsideCancellationWindow("2026-10-13", "11:00:00", 24, now)).toBe(false);
  });
  it("never blocks with no policy, no date or bad data", () => {
    expect(isInsideCancellationWindow("2026-10-12", "10:30", 0, now)).toBe(false);
    expect(isInsideCancellationWindow(null, "10:30", 24, now)).toBe(false);
    expect(isInsideCancellationWindow("garbage", "10:30", 24, now)).toBe(false);
  });
  it("treats a missing start time as midnight", () => {
    expect(isInsideCancellationWindow("2026-10-13", undefined, 24, now)).toBe(true);
  });
});

describe("config helpers", () => {
  it("parses hours and text", () => {
    expect(getPolicyHours({ cancellationPolicyHours: 24 })).toBe(24);
    expect(getPolicyHours({})).toBe(0);
    expect(getPolicyText({ cancellationPolicyTextEl: " Γεια " }, "gr")).toBe("Γεια");
    expect(getPolicyText({ cancellationPolicyTextEl: "x" }, "en")).toBe("");
  });
});
