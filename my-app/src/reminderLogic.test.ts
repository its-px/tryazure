import { describe, it, expect } from "vitest";
import { appointmentInstant, isReminderDue, leadHours, pickFallback } from "../../supabase/functions/_shared/reminderLogic";

const base = {
  status: "confirmed",
  date: "2026-10-14",
  start_time: "10:00:00",
  created_at: "2026-10-01T08:00:00Z",
  reminder_sent_at: null,
  user_id: "u1",
};

describe("appointmentInstant", () => {
  it("converts Athens local time (EEST, UTC+3) to UTC", () => {
    expect(appointmentInstant("2026-10-14", "10:00:00").toISOString()).toBe("2026-10-14T07:00:00.000Z");
  });
  it("uses winter offset (EET, UTC+2) after DST ends", () => {
    expect(appointmentInstant("2026-11-14", "10:00").toISOString()).toBe("2026-11-14T08:00:00.000Z");
  });
});

describe("isReminderDue", () => {
  const start = appointmentInstant("2026-10-14", "10:00").getTime();
  const at = (hoursBefore: number) => new Date(start - hoursBefore * 3600_000);

  it("is due inside the lead window", () => expect(isReminderDue(base, 24, at(23))).toBe(true));
  it("is not due before the window opens", () => expect(isReminderDue(base, 24, at(25))).toBe(false));
  it("is not due once started", () => expect(isReminderDue(base, 24, at(-1))).toBe(false));
  it("skips cancelled / already reminded / no user", () => {
    expect(isReminderDue({ ...base, status: "cancelled" }, 24, at(23))).toBe(false);
    expect(isReminderDue({ ...base, reminder_sent_at: "2026-10-13T00:00:00Z" }, 24, at(23))).toBe(false);
    expect(isReminderDue({ ...base, user_id: null }, 24, at(23))).toBe(false);
  });
  it("skips bookings made inside the window", () => {
    const late = { ...base, created_at: new Date(start - 3 * 3600_000).toISOString() };
    expect(isReminderDue(late, 24, at(2))).toBe(false);
  });
  it("honours a custom lead", () => {
    expect(isReminderDue(base, 2, at(3))).toBe(false);
    expect(isReminderDue(base, 2, at(1))).toBe(true);
  });
});

describe("leadHours", () => {
  it("defaults to 24 and rejects junk", () => {
    expect(leadHours(null)).toBe(24);
    expect(leadHours({ reminderLeadHours: "abc" })).toBe(24);
    expect(leadHours({ reminderLeadHours: 0 })).toBe(24);
    expect(leadHours({ reminderLeadHours: 48 })).toBe(48);
  });
});

describe("pickFallback", () => {
  const p = { hasPush: false, optedOut: false, phone: "6900000000", email: "a@b.c" };
  it("prefers push even when opted out of marketing", () => expect(pickFallback({ ...p, hasPush: true, optedOut: true })).toBe("push"));
  it("falls back sms then email", () => {
    expect(pickFallback(p)).toBe("sms");
    expect(pickFallback({ ...p, phone: null })).toBe("email");
  });
  it("respects opt-out and no contact", () => {
    expect(pickFallback({ ...p, optedOut: true })).toBe("none");
    expect(pickFallback({ ...p, phone: null, email: null })).toBe("none");
  });
});
