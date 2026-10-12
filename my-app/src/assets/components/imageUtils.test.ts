import { describe, expect, it } from "vitest";
import { resizedImageUrl } from "./imageUtils";

const base = "https://x.supabase.co/storage/v1";
describe("resizedImageUrl", () => {
  it("rewrites tenant-assets public urls", () => {
    expect(resizedImageUrl(`${base}/object/public/tenant-assets/t1/a.webp?t=1`, { width: 90 })).toBe(
      `${base}/render/image/public/tenant-assets/t1/a.webp?width=90&quality=75&resize=cover`,
    );
  });
  it("leaves other urls alone", () => {
    expect(resizedImageUrl(`${base}/object/public/other/a.webp`, { width: 90 })).toBe(`${base}/object/public/other/a.webp`);
    expect(resizedImageUrl("https://e.com/a.png", { width: 90 })).toBe("https://e.com/a.png");
  });
  it("handles empty", () => {
    expect(resizedImageUrl(null, { width: 90 })).toBeUndefined();
  });
});
