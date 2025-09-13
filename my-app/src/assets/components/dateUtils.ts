import dayjs from "dayjs";

/**
 * Generate all dates between startDate and endDate matching the given weekdays.
 * @param startDate string in YYYY-MM-DD
 * @param endDate string in YYYY-MM-DD
 * @param weekdays array of numbers (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 * @returns array of dates as strings in YYYY-MM-DD
 */
export const generateWeekdaysInRange = (
  startDate: string,
  endDate: string,
  weekdays: number[] = [1, 2, 3, 4, 5] // default Mon-Fri
): string[] => {
  let current = dayjs(startDate);
  const end = dayjs(endDate);
  const dates: string[] = [];

  while (current.isBefore(end) || current.isSame(end, "day")) {
    if (weekdays.includes(current.day())) {
      dates.push(current.format("YYYY-MM-DD"));
    }
    current = current.add(1, "day");
  }

  return dates;
};

/**
 * Exclude certain dates (holidays, exceptions) from an array of dates
 * @param dates array of YYYY-MM-DD strings
 * @param exceptions array of YYYY-MM-DD strings to exclude
 * @returns filtered array
 */
export const excludeDates = (
  dates: string[],
  exceptions: string[]
): string[] => {
  const exceptionSet = new Set(exceptions);
  return dates.filter((date) => !exceptionSet.has(date));
};
