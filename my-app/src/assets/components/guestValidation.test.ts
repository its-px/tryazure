import { describe, it, expect } from "vitest";
import { validateGuestDetails } from "./guestValidation";

const ok = { name: "Maria P", phone: "+30 694 123 4567", email: "m@example.com", consent: true };

describe("validateGuestDetails", () => {
  it("accepts valid details", () => expect(validateGuestDetails(ok)).toEqual({}));
  it("flags every bad field", () =>
    expect(validateGuestDetails({ name: "M", phone: "abc", email: "nope", consent: false })).toEqual({
      name: true, phone: true, email: true, consent: true,
    }));
  it("rejects too-long name", () =>
    expect(validateGuestDetails({ ...ok, name: "x".repeat(101) }).name).toBe(true));
});
