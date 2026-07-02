import dayjs from "dayjs";

export interface ProfessionalHoursRow {
  day_of_week: number; // 0=Sunday .. 6=Saturday
  start_time: string; // "HH:MM:SS" or "HH:MM"
  end_time: string;
}

/** day_of_week -> widest open window across all professionals that day (union, not overlap-aware). */
export function buildOpenWindowsByDay(
  rows: ProfessionalHoursRow[],
): Record<number, { start: string; end: string }> {
  const byDay: Record<number, { start: string; end: string }> = {};
  for (const row of rows) {
    const existing = byDay[row.day_of_week];
    if (!existing) {
      byDay[row.day_of_week] = { start: row.start_time, end: row.end_time };
    } else {
      if (row.start_time < existing.start) existing.start = row.start_time;
      if (row.end_time > existing.end) existing.end = row.end_time;
    }
  }
  return byDay;
}

/**
 * Whether `createdAt` falls outside every professional's working window for that
 * day of week — i.e. no staff was open to take the booking in person.
 * ponytail: uses the union of all professionals' hours per day (widest possible
 * "open" window), not per-professional overlap with the booked professional —
 * good enough to prove demand was captured while the business was shut, not to
 * prove a specific professional was unavailable. Upgrade if that distinction matters.
 */
export function isBookedWhileClosed(
  createdAt: string | Date,
  openWindowsByDay: Record<number, { start: string; end: string }>,
): boolean {
  const d = dayjs(createdAt);
  const window = openWindowsByDay[d.day()];
  if (!window) return true; // no hours defined for this day = closed all day
  const time = d.format("HH:mm:ss");
  return time < window.start || time >= window.end;
}
