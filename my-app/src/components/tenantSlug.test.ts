import { describe, it, expect } from "vitest";
import { slugify, slugError } from "./tenantSlug";

describe("tenantSlug", () => {
  it("slugify makes a DNS-safe label", () => {
    expect(slugify("  Maria's Hair & Nails! ")).toBe("maria-s-hair-nails");
    expect(slugify("x".repeat(40))).toHaveLength(30);
  });

  it("slugError accepts valid slugs and rejects bad or reserved ones", () => {
    expect(slugError("maria-nails")).toBeNull();
    expect(slugError("abc")).toBeNull();
    for (const bad of ["ab", "-abc", "abc-", "Abc", "a_b", "a--b", "x".repeat(31), "www", "admin", "demo-shop"]) {
      expect(slugError(bad)).not.toBeNull();
    }
  });
});
