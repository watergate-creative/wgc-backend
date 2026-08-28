/**
 * A single time window within a day.
 * Uses 24-hour "HH:mm" strings for portability across timezones.
 */
export interface AvailabilitySlot {
  start: string; // e.g. "09:00"
  end: string;   // e.g. "17:00"
}

/**
 * Maps each day-of-week the minister is available
 * to one or more time windows within that day.
 *
 * Example:
 * {
 *   "Monday":    [{ start: "09:00", end: "12:00" }, { start: "14:00", end: "17:00" }],
 *   "Wednesday": [{ start: "10:00", end: "16:00" }]
 * }
 */
export type WeeklyAvailability = Partial<
  Record<DayOfWeek, AvailabilitySlot[]>
>;

export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
