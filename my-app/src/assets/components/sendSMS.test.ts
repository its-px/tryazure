import { describe, it, expect } from "vitest";
import { validatePhoneNumber, formatPhoneNumber } from "./sendSMS";

describe("validatePhoneNumber", () => {
  it("accepts a valid international number", () => {
    expect(validatePhoneNumber("+306912345678")).toBe(true);
  });

  it("accepts a valid local number (no +)", () => {
    expect(validatePhoneNumber("6912345678")).toBe(true);
  });

  it("strips formatting characters before validating", () => {
    expect(validatePhoneNumber("+30 691 234 5678")).toBe(true);
    expect(validatePhoneNumber("(030) 691-234-5678")).toBe(true);
  });

  it("rejects too-short numbers", () => {
    expect(validatePhoneNumber("+1234")).toBe(false); // 5 chars, min is 9 for +
    expect(validatePhoneNumber("123")).toBe(false); // 3 chars, min is 8
  });

  it("rejects too-long numbers", () => {
    expect(validatePhoneNumber("+12345678901234567")).toBe(false); // 18 chars > 16
    expect(validatePhoneNumber("1234567890123456")).toBe(false); // 16 chars > 15
  });

  it("handles boundary lengths for + numbers", () => {
    expect(validatePhoneNumber("+12345678")).toBe(true); // 9 chars = min
    expect(validatePhoneNumber("+123456789012345")).toBe(true); // 16 chars = max
  });
});

describe("formatPhoneNumber", () => {
  it("prepends + when missing", () => {
    expect(formatPhoneNumber("6912345678")).toBe("+6912345678");
  });

  it("keeps existing + and strips junk", () => {
    expect(formatPhoneNumber("+30 691 234 5678")).toBe("+306912345678");
  });

  it("strips letters and symbols", () => {
    expect(formatPhoneNumber("tel:(030)691-2345")).toBe("+0306912345");
  });
});
