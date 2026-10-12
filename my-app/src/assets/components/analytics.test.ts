import { describe, it, expect } from "vitest";
import { buildFunnelRows, funnelAllowed, shouldSend } from "./analytics";

describe("funnel analytics", () => {
  it("honours explicit opt-out only", () => {
    expect(funnelAllowed(null)).toBe(true);
    expect(funnelAllowed({ analytics: true })).toBe(true);
    expect(funnelAllowed({ analytics: false })).toBe(false);
  });
  it("dedupes per step", () => {
    const s = new Set(["a"]);
    expect(shouldSend(s, "a")).toBe(false);
    expect(shouldSend(s, "b")).toBe(true);
  });
  it("computes percentages and drop-off", () => {
    const rows = buildFunnelRows([
      { step: "wizard_started", sessions: 100 },
      { step: "service_selected", sessions: 80 },
      { step: "professional_selected", sessions: 40 },
      { step: "booking_confirmed", sessions: 10 },
    ]);
    expect(rows[2]).toMatchObject({ pctOfFirst: 40, dropOffPct: 50 });
    expect(rows[3]).toMatchObject({ sessions: 0, dropOffPct: 100 });
    expect(rows[4]).toMatchObject({ sessions: 10, pctOfFirst: 10, dropOffPct: 0 });
    expect(buildFunnelRows([])[1].pctOfFirst).toBe(0);
  });
});
