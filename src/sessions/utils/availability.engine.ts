import { WeeklyAvailability, DayOfWeek, DAYS_OF_WEEK } from '../interfaces/availability.interface.js';
import { TimeRange } from '../sessions.service.js';

export class AvailabilityEngine {
  
  static computeAvailableSlots(
    weeklyAvailability: WeeklyAvailability | null,
    durationMinutes: number,
    rangeStart: Date,
    rangeEnd: Date,
    busyRanges: TimeRange[],
  ): TimeRange[] {
    if (!weeklyAvailability) return [];

    const slots: TimeRange[] = [];
    const current = new Date(rangeStart);
    current.setHours(0, 0, 0, 0);

    const endBoundary = new Date(rangeEnd);

    while (current <= endBoundary) {
      const dayName = DAYS_OF_WEEK[
        (current.getDay() + 6) % 7 // JS getDay: 0=Sun, we want 0=Mon
      ] as DayOfWeek;

      const dayWindows = weeklyAvailability[dayName];
      if (dayWindows && dayWindows.length > 0) {
        for (const window of dayWindows) {
          const [startHour, startMin] = window.start.split(':').map(Number);
          const [endHour, endMin] = window.end.split(':').map(Number);

          const windowStart = new Date(current);
          windowStart.setHours(startHour, startMin, 0, 0);

          const windowEnd = new Date(current);
          windowEnd.setHours(endHour, endMin, 0, 0);

          let slotStart = new Date(windowStart);
          while (slotStart < windowEnd) {
            const slotEnd = new Date(
              slotStart.getTime() + durationMinutes * 60_000,
            );
            if (slotEnd > windowEnd) break;

            if (
              slotStart >= rangeStart &&
              slotEnd <= rangeEnd &&
              slotStart > new Date() &&
              !AvailabilityEngine.overlapsAny(slotStart, slotEnd, busyRanges)
            ) {
              slots.push({ start: new Date(slotStart), end: new Date(slotEnd) });
            }

            slotStart = new Date(slotEnd);
          }
        }
      }

      current.setDate(current.getDate() + 1);
    }

    return slots;
  }

  
  static overlapsAny(
    start: Date,
    end: Date,
    busyRanges: TimeRange[],
  ): boolean {
    return busyRanges.some(
      (busy) => start < busy.end && end > busy.start,
    );
  }
}
