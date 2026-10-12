// Pure validation for per-professional hours/breaks/time off (mirrors DB CHECKs).
// "HH:MM" strings compare correctly lexicographically.

export interface DayHours {
  start_time: string;
  end_time: string;
  break_start?: string | null;
  break_end?: string | null;
}

/** Returns an i18n key suffix (schedule.err_*) or null when valid. */
export function validateDay(d: DayHours): string | null {
  if (!d.start_time || !d.end_time || d.start_time >= d.end_time) return "err_hours";
  const hasS = !!d.break_start;
  const hasE = !!d.break_end;
  if (!hasS && !hasE) return null;
  if (!hasS || !hasE || d.break_start! >= d.break_end!) return "err_break";
  if (d.break_start! < d.start_time || d.break_end! > d.end_time) return "err_break_outside";
  return null;
}

/** Inputs are datetime-local strings ("YYYY-MM-DDTHH:MM"). */
export function validateTimeOff(startAt: string, endAt: string): string | null {
  if (!startAt || !endAt || startAt >= endAt) return "err_range";
  return null;
}

/** True when [aStart,aEnd) overlaps [bStart,bEnd). */
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && aEnd > bStart;
}
