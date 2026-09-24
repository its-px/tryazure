import { describe, it, expect } from "vitest";
import { isRealImage } from "./imageUtils";

const blob = (bytes: number[] | string) =>
  new Blob([typeof bytes === "string" ? bytes : new Uint8Array(bytes)]);

describe("isRealImage", () => {
  it("accepts JPEG, PNG and WebP signatures", async () => {
    expect(await isRealImage(blob([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
    expect(await isRealImage(blob([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]))).toBe(true);
    expect(await isRealImage(blob("RIFF\u0000\u0000\u0000\u0000WEBPVP8 "))).toBe(true);
  });
  it("rejects HTML/SVG renamed to .png", async () => {
    expect(await isRealImage(blob("<svg onload=alert(1)>"))).toBe(false);
    expect(await isRealImage(blob("<!doctype html><script>"))).toBe(false);
  });
});
