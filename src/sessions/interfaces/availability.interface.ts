
export interface AvailabilitySlot {
  start: string; // e.g. "09:00"
  end: string;   // e.g. "17:00"
}

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
