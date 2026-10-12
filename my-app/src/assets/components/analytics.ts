import { readConsent } from "../../components/consent";
import { supabase } from "./supabaseClient";

export const FUNNEL_STEPS = [
  "wizard_started",
  "service_selected",
  "professional_selected",
  "time_selected",
  "payment_started",
  "booking_confirmed",
] as const;
export type FunnelStep = (typeof FUNNEL_STEPS)[number];

// First-party anonymous counts need no consent, but an explicit analytics opt-out is honoured.
export const funnelAllowed = (c: { analytics: boolean } | null) => c?.analytics !== false;

// Each step is logged once per session (pure, for tests).
export const shouldSend = (seen: Set<string>, step: string) => !seen.has(step);

export interface FunnelRow { step: FunnelStep; sessions: number; pctOfFirst: number; dropOffPct: number }

// Rows in funnel order; dropOffPct is relative to the previous step shown.
export function buildFunnelRows(data: { step: string; sessions: number }[]): FunnelRow[] {
  const by = new Map(data.map((d) => [d.step, Number(d.sessions) || 0]));
  const first = by.get("wizard_started") ?? 0;
  let prev = first;
  return FUNNEL_STEPS.filter((s) => s !== "payment_started").map((step, i) => {
    const sessions = by.get(step) ?? 0;
    const row = {
      step,
      sessions,
      pctOfFirst: first ? Math.round((sessions / first) * 100) : 0,
      dropOffPct: i === 0 || !prev ? 0 : Math.max(0, Math.round((1 - sessions / prev) * 100)),
    };
    prev = sessions;
    return row;
  });
}

let sid: string | null = null;
function sessionId() {
  if (sid) return sid;
  try { sid = sessionStorage.getItem("funnelSid"); } catch { /* ignore */ }
  if (!sid) {
    sid = crypto.randomUUID();
    try { sessionStorage.setItem("funnelSid", sid); } catch { /* ignore */ }
  }
  return sid;
}

const seen = new Set<string>();
export function trackFunnel(
  tenantId: string | undefined,
  step: FunnelStep,
  meta?: { professionalId?: string | null; serviceId?: string | null },
) {
  try {
    if (!tenantId || !funnelAllowed(readConsent())) return;
    const key = `${tenantId}:${step}`;
    if (!shouldSend(seen, key)) return;
    seen.add(key);
    void Promise.resolve(
      supabase.rpc("log_funnel_event", {
        p_tenant: tenantId,
        p_session: sessionId(),
        p_step: step,
        p_professional: meta?.professionalId ?? null,
        p_service: meta?.serviceId ?? null,
      }),
    ).catch(() => {});
  } catch { /* analytics must never break booking */ }
}
