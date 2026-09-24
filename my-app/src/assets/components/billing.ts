export interface TenantBilling {
  plan: string | null;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  past_due_since: string | null;
  stripe_customer_id: string | null;
  stripe_connect_account_id?: string | null;
  connect_charges_enabled?: boolean;
}

export const GRACE_DAYS = 7;
const DAY_MS = 86_400_000;

// Whether the owner panel is usable. Public booking is never gated on this.
// No billing row (e.g. migration not yet applied) = don't lock anyone out.
export function isTenantActive(b: TenantBilling | null, now = Date.now()): boolean {
  if (!b) return true;
  if (b.status === "active") return true;
  if (b.status === "trialing") return !!b.trial_ends_at && Date.parse(b.trial_ends_at) > now;
  if (b.status === "past_due" || b.status === "unpaid") {
    return !!b.past_due_since && Date.parse(b.past_due_since) + GRACE_DAYS * DAY_MS > now;
  }
  return false; // canceled, incomplete, incomplete_expired, paused
}

export function daysLeft(iso: string | null, now = Date.now()): number {
  return iso ? Math.max(0, Math.ceil((Date.parse(iso) - now) / DAY_MS)) : 0;
}
