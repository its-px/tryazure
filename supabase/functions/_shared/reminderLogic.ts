// Pure decision logic for send-appointment-reminders (no Deno/URL imports so vitest can test it).

export const DEFAULT_LEAD_HOURS = 24;
export const TZ = "Europe/Athens"; // ponytail: single-country product; per-tenant tz if that changes

/** Offset (ms) of TZ from UTC at the given instant. */
function tzOffsetMs(at: Date): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    })
      .formatToParts(at)
      .map((x) => [x.type, Number(x.value)]),
  );
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(at.getTime() / 1000) * 1000;
}

/** "2026-10-13" + "14:30[:00]" local Athens time -> UTC Date. */
export function appointmentInstant(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const first = guess - tzOffsetMs(new Date(guess));
  return new Date(guess - tzOffsetMs(new Date(first)));
}

export function leadHours(config: unknown): number {
  const v = Number((config as { reminderLeadHours?: unknown } | null)?.reminderLeadHours);
  return Number.isFinite(v) && v >= 1 && v <= 168 ? v : DEFAULT_LEAD_HOURS;
}

export type ReminderBooking = {
  status: string;
  date: string | null;
  start_time: string | null;
  created_at?: string | null;
  reminder_sent_at: string | null;
  user_id: string | null;
};

/** Due = confirmed/pending, not yet reminded, starts within the lead window, and was not booked inside it. */
export function isReminderDue(b: ReminderBooking, lead: number, now: Date): boolean {
  if (b.reminder_sent_at || !b.user_id || !b.date || !b.start_time) return false;
  if (b.status !== "confirmed" && b.status !== "pending") return false;
  const start = appointmentInstant(b.date, b.start_time).getTime();
  const windowStart = start - lead * 3600_000;
  if (start <= now.getTime() || windowStart > now.getTime()) return false;
  // Booked after the window opened: they just got a confirmation, no nagging.
  if (b.created_at && new Date(b.created_at).getTime() > windowStart) return false;
  return true;
}

export type Channel = "push" | "sms" | "email" | "none";

/** Push first (explicit opt-in); SMS/email fallbacks respect the marketing opt-out. */
export function pickFallback(p: {
  hasPush: boolean;
  optedOut: boolean;
  phone?: string | null;
  email?: string | null;
}): Channel {
  if (p.hasPush) return "push";
  if (p.optedOut) return "none";
  if (p.phone) return "sms";
  if (p.email) return "email";
  return "none";
}
