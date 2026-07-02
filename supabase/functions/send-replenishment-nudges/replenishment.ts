// Pure date-math extracted from index.ts so it's testable with vitest
// without pulling in Deno-only URL imports.
export function isReplenishmentDue(
  purchasedAt: Date,
  replenishDays: number,
  now: Date = new Date(),
): boolean {
  const daysSincePurchase =
    (now.getTime() - purchasedAt.getTime()) / (24 * 60 * 60 * 1000);
  return daysSincePurchase >= replenishDays && daysSincePurchase < replenishDays + 1;
}
