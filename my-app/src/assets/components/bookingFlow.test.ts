import { describe, expect, it } from "vitest";
import { maxReachableStepFor } from "./bookingFlow";

const base = { selectedLocation: "our_place", selectedServices: ["s1"], selectedProfessional: null, selectedDate: "2026-10-20", selectedSlot: {} };

describe("maxReachableStepFor", () => {
  it("null professional is fine when 'any' is enabled", () => {
    expect(maxReachableStepFor(base)).toBe(5);
  });
  it("caps at step 3 when 'any' is disabled and no professional chosen", () => {
    expect(maxReachableStepFor(base, false)).toBe(3);
  });
  it("allows step 5 with a specific professional when 'any' is disabled", () => {
    expect(maxReachableStepFor({ ...base, selectedProfessional: "anna" }, false)).toBe(5);
  });
  it("still gates earlier steps", () => {
    expect(maxReachableStepFor({ ...base, selectedLocation: null }, false)).toBe(1);
    expect(maxReachableStepFor({ ...base, selectedServices: [] }, false)).toBe(2);
  });
});
