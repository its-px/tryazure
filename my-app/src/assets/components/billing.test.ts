import { describe, it, expect } from "vitest";
import { isTenantActive, daysLeft, type TenantBilling } from "./billing";

const NOW = Date.parse("2026-09-22T12:00:00Z");
const DAY = 86_400_000;
const iso = (offsetDays: number) => new Date(NOW + offsetDays * DAY).toISOString();
const row = (patch: Partial<TenantBilling>): TenantBilling => ({
  plan: null, status: "trialing", trial_ends_at: null, current_period_end: null,
  past_due_since: null, stripe_customer_id: null, ...patch,
});

describe("isTenantActive", () => {
  it("fails open when there is no billing row", () => {
    expect(isTenantActive(null, NOW)).toBe(true);
  });
  it("active subscription", () => {
    expect(isTenantActive(row({ status: "active" }), NOW)).toBe(true);
  });
  it("trial running vs expired", () => {
    expect(isTenantActive(row({ trial_ends_at: iso(3) }), NOW)).toBe(true);
    expect(isTenantActive(row({ trial_ends_at: iso(-1) }), NOW)).toBe(false);
  });
  it("past_due inside vs after 7-day grace", () => {
    expect(isTenantActive(row({ status: "past_due", past_due_since: iso(-6) }), NOW)).toBe(true);
    expect(isTenantActive(row({ status: "past_due", past_due_since: iso(-8) }), NOW)).toBe(false);
  });
  it("canceled is locked", () => {
    expect(isTenantActive(row({ status: "canceled" }), NOW)).toBe(false);
  });
});

describe("daysLeft", () => {
  it("rounds up and floors at zero", () => {
    expect(daysLeft(iso(2.5), NOW)).toBe(3);
    expect(daysLeft(iso(-2), NOW)).toBe(0);
  });
});
