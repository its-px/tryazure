import { describe, it, expect } from "vitest";
import { isReplenishmentDue } from "../../../../supabase/functions/send-replenishment-nudges/replenishment";

describe("isReplenishmentDue", () => {
  const now = new Date("2026-07-02T12:00:00Z");

  it("is false before the replenish window", () => {
    const purchasedAt = new Date("2026-06-20T12:00:00Z"); // 12 days ago
    expect(isReplenishmentDue(purchasedAt, 30, now)).toBe(false);
  });

  it("is true within the ~24h window centered on N days ago", () => {
    const purchasedAt = new Date("2026-06-02T12:00:00Z"); // exactly 30 days ago
    expect(isReplenishmentDue(purchasedAt, 30, now)).toBe(true);
  });

  it("is false once more than a day past the window", () => {
    const purchasedAt = new Date("2026-05-01T12:00:00Z"); // 62 days ago
    expect(isReplenishmentDue(purchasedAt, 30, now)).toBe(false);
  });
});
