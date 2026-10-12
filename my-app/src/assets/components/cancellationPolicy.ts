// Per-tenant cancellation policy helpers (config keys documented in
// supabase/migrations/20261012_cancellation_policy.sql).
type Cfg = Record<string, unknown> | null | undefined;

export function getPolicyHours(config: Cfg): number {
  const h = Number(config?.cancellationPolicyHours);
  return Number.isFinite(h) && h > 0 ? Math.floor(h) : 0;
}

// Custom text for the language, or "" so callers fall back to the generated default.
export function getPolicyText(config: Cfg, lang: string): string {
  const v = config?.[lang === "gr" ? "cancellationPolicyTextEl" : "cancellationPolicyTextEn"];
  return typeof v === "string" ? v.trim() : "";
}

// date "YYYY-MM-DD", start "HH:MM[:SS]" in the viewer's local time.
// Unparseable or missing date => false (never block on bad data).
export function isInsideCancellationWindow(
  date: string | null | undefined,
  startTime: string | null | undefined,
  hours: number,
  now: Date = new Date(),
): boolean {
  if (!(hours > 0) || !date) return false;
  const start = new Date(`${date}T${(startTime || "00:00").substring(0, 8)}`);
  if (Number.isNaN(start.getTime())) return false;
  return start.getTime() - hours * 3600000 < now.getTime();
}
